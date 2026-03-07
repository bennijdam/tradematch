#!/usr/bin/env python3
import argparse
import json
import random
import re
from pathlib import Path
from html.parser import HTMLParser

PLACEHOLDER_RE = re.compile(r"\{[A-Z_]+\}")
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
JSONLD_RE = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.IGNORECASE | re.DOTALL)


class MetaDescriptionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta_description = ""

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return

        attr_map = {k.lower(): v for k, v in attrs if isinstance(k, str)}
        if attr_map.get("name", "").lower() == "description":
            self.meta_description = attr_map.get("content", "")


def collect_pages(root: Path):
    return list(root.glob("services/*/*.html"))


def validate_page(path: Path):
    errors = []
    html = path.read_text(encoding="utf-8", errors="replace")

    if PLACEHOLDER_RE.search(html):
        errors.append("Unreplaced placeholder token found")

    title_match = TITLE_RE.search(html)
    if not title_match:
        errors.append("Missing <title>")

    parser = MetaDescriptionParser()
    parser.feed(html)
    meta_desc = parser.meta_description.strip()
    if not meta_desc:
        errors.append("Missing meta description")
    else:
        if not (120 <= len(meta_desc) <= 160):
            errors.append(f"Meta description length out of range: {len(meta_desc)}")

    if "<footer" not in html.lower():
        errors.append("Missing <footer> block")

    jsonld_match = JSONLD_RE.search(html)
    if not jsonld_match:
        errors.append("Missing JSON-LD script block")
    else:
        try:
            json.loads(jsonld_match.group(1).strip())
        except Exception:
            errors.append("Invalid JSON-LD payload")

    return errors, meta_desc


def main():
    parser = argparse.ArgumentParser(description="Validate generated localized SEO pages")
    parser.add_argument("--output-dir", type=str, default="generated-pages")
    parser.add_argument("--sample-size", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    out_dir = Path(args.output_dir).resolve()
    pages = collect_pages(out_dir)
    if not pages:
        print(f"FAIL: no pages found under {out_dir / 'services'}")
        raise SystemExit(1)

    sample_size = min(len(pages), max(1, args.sample_size))
    rng = random.Random(args.seed)
    sample = rng.sample(pages, sample_size)

    all_errors = []
    seen_meta = {}
    duplicate_meta = []

    for page in sample:
        errors, meta_desc = validate_page(page)
        if errors:
            all_errors.append((page, errors))
        if meta_desc:
            if meta_desc in seen_meta:
                duplicate_meta.append((seen_meta[meta_desc], page))
            else:
                seen_meta[meta_desc] = page

    if duplicate_meta:
        for first, second in duplicate_meta:
            all_errors.append((second, [f"Duplicate meta description with {first}"]))

    if all_errors:
        print(f"FAIL: {len(all_errors)} issue(s) across {sample_size} sampled pages")
        for page, errors in all_errors[:30]:
            print(f"- {page}")
            for err in errors:
                print(f"  * {err}")
        raise SystemExit(1)

    print(f"PASS: validated {sample_size} sampled pages from {len(pages)} total pages")


if __name__ == "__main__":
    main()
