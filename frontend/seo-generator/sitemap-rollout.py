#!/usr/bin/env python3
"""
Auto-gate phased sitemap submission using Search Console export data.
- Reads Sitemaps report CSV to compute indexed ratios per phase.
- Optionally reads Pages report CSV to raise alerts (soft 404, duplicates, discovered not indexed).
- Writes a live sitemap index containing only unlocked phases.
"""

import argparse
import csv
import json
import re
from datetime import date
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated-pages"
PHASED_DIR = OUTPUT_DIR / "sitemaps" / "phased"
STATE_PATH = PHASED_DIR / "rollout-state.json"
REPORT_PATH = PHASED_DIR / "rollout-report.json"
LIVE_INDEX_PATH = PHASED_DIR / "sitemap-index-live.xml"

PHASE_SEQUENCE = ["phase-1", "phase-2", "phase-3", "phase-4"]


def normalize_key(value):
    return re.sub(r"[^a-z0-9]", "", value.lower())


def sniff_delimiter(path):
    sample = path.read_text(encoding="utf-8", errors="ignore")[:2048]
    try:
        return csv.Sniffer().sniff(sample).delimiter
    except csv.Error:
        return ","


def load_sitemaps_report(csv_path):
    if not csv_path:
        return {}
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Sitemaps report not found: {path}")

    delimiter = sniff_delimiter(path)
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        normalized = {normalize_key(h): h for h in headers}

        sitemap_key = None
        submitted_key = None
        indexed_key = None

        for key, original in normalized.items():
            if sitemap_key is None and "sitemap" in key:
                sitemap_key = original
            if submitted_key is None and "submitted" in key:
                submitted_key = original
            if indexed_key is None and "indexed" in key:
                indexed_key = original

        if not sitemap_key or not submitted_key or not indexed_key:
            raise ValueError("Sitemaps report missing required columns (sitemap/submitted/indexed).")

        results = {}
        for row in reader:
            sitemap = (row.get(sitemap_key) or "").strip()
            submitted = int((row.get(submitted_key) or "0").replace(",", "") or 0)
            indexed = int((row.get(indexed_key) or "0").replace(",", "") or 0)
            if not sitemap:
                continue
            results[sitemap] = {"submitted": submitted, "indexed": indexed}
        return results


def load_pages_report(csv_path):
    if not csv_path:
        return None
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Pages report not found: {path}")

    delimiter = sniff_delimiter(path)
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        headers = reader.fieldnames or []
        normalized = {normalize_key(h): h for h in headers}

        status_key = None
        for key, original in normalized.items():
            if status_key is None and ("status" in key or "indexingstate" in key or "indexing" in key):
                status_key = original

        if not status_key:
            raise ValueError("Pages report missing required status/indexing column.")

        counts = {}
        total = 0
        for row in reader:
            status = (row.get(status_key) or "").strip()
            if not status:
                continue
            counts[status] = counts.get(status, 0) + 1
            total += 1

        return {"total": total, "counts": counts}


def phase_ratio_from_report(report, phase_name):
    if not report:
        return None
    for sitemap, stats in report.items():
        if phase_name in sitemap:
            submitted = stats.get("submitted", 0)
            indexed = stats.get("indexed", 0)
            ratio = (indexed / submitted) if submitted else 0.0
            return ratio, submitted, indexed
    return None


def write_live_index(unlocked_phases):
    today = date.today().isoformat()
    LIVE_INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LIVE_INDEX_PATH, "w", encoding="utf-8") as f:
        f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        f.write("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
        for phase in unlocked_phases:
            sitemap_file = PHASED_DIR / f"sitemap-index-{phase}.xml"
            if not sitemap_file.exists():
                continue
            loc = f"https://www.tradematch.uk/sitemaps/phased/{sitemap_file.name}"
            f.write("  <sitemap>\n")
            f.write(f"    <loc>{loc}</loc>\n")
            f.write(f"    <lastmod>{today}</lastmod>\n")
            f.write("  </sitemap>\n")
        f.write("</sitemapindex>")


def main():
    parser = argparse.ArgumentParser(description="Phased sitemap auto-gating and alerts.")
    parser.add_argument("--sitemaps-report", help="Path to Search Console Sitemaps CSV export")
    parser.add_argument("--pages-report", help="Path to Search Console Pages CSV export")
    parser.add_argument("--min-index-ratio", type=float, default=0.7)
    parser.add_argument("--max-soft404", type=float, default=0.01)
    parser.add_argument("--max-duplicate", type=float, default=0.05)
    parser.add_argument("--max-discovered", type=float, default=0.2)
    args = parser.parse_args()

    sitemaps_report = load_sitemaps_report(args.sitemaps_report) if args.sitemaps_report else {}
    pages_report = load_pages_report(args.pages_report) if args.pages_report else None

    state = {
        "unlocked_phases": ["phase-1"],
        "ratios": {},
        "alerts": [],
    }

    if STATE_PATH.exists():
        try:
            state.update(json.loads(STATE_PATH.read_text(encoding="utf-8")))
        except json.JSONDecodeError:
            pass

    unlocked = list(dict.fromkeys(state.get("unlocked_phases", ["phase-1"])))

    for phase in PHASE_SEQUENCE:
        ratio_data = phase_ratio_from_report(sitemaps_report, phase)
        if ratio_data:
            ratio, submitted, indexed = ratio_data
            state["ratios"][phase] = {
                "ratio": round(ratio, 4),
                "submitted": submitted,
                "indexed": indexed,
            }

    for idx, phase in enumerate(PHASE_SEQUENCE[:-1]):
        next_phase = PHASE_SEQUENCE[idx + 1]
        if next_phase in unlocked:
            continue
        ratio_info = state["ratios"].get(phase)
        if not ratio_info:
            continue
        if ratio_info["ratio"] >= args.min_index_ratio:
            unlocked.append(next_phase)

    if pages_report:
        total = pages_report["total"]
        counts = pages_report["counts"]
        if total > 0:
            soft_404 = sum(v for k, v in counts.items() if "soft 404" in k.lower())
            duplicate = sum(v for k, v in counts.items() if "duplicate" in k.lower())
            discovered = sum(v for k, v in counts.items() if "discovered" in k.lower())

            if soft_404 / total > args.max_soft404:
                state["alerts"].append("Soft 404 ratio above threshold")
            if duplicate / total > args.max_duplicate:
                state["alerts"].append("Duplicate ratio above threshold")
            if discovered / total > args.max_discovered:
                state["alerts"].append("Discovered not indexed ratio above threshold")

            state["pages_report"] = {
                "total": total,
                "soft_404": soft_404,
                "duplicate": duplicate,
                "discovered": discovered,
            }

    state["unlocked_phases"] = unlocked
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")

    write_live_index(unlocked)

    REPORT_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")

    print("✅ Rollout gating complete")
    print(f"Unlocked phases: {', '.join(unlocked)}")
    print(f"Live index: {LIVE_INDEX_PATH}")
    if state.get("alerts"):
        print("⚠️  Alerts:")
        for alert in state["alerts"]:
            print(f"- {alert}")


if __name__ == "__main__":
    main()
