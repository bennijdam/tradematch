#!/usr/bin/env python3
import argparse
import json
import random
import re
from pathlib import Path
from html.parser import HTMLParser
import xml.etree.ElementTree as ET

PLACEHOLDER_RE = re.compile(r"\{[A-Z_]+\}")
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
JSONLD_RE = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.IGNORECASE | re.DOTALL)
CANONICAL_RE = re.compile(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', re.IGNORECASE)

NS = {
    'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9',
    'xhtml': 'http://www.w3.org/1999/xhtml',
}


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

    canonical_match = CANONICAL_RE.search(html)
    canonical = canonical_match.group(1).strip() if canonical_match else ""
    if not canonical:
        errors.append("Missing canonical URL")
    elif canonical.endswith("/"):
        errors.append(f"Canonical URL has trailing slash: {canonical}")

    jsonld_match = JSONLD_RE.search(html)
    if not jsonld_match:
        errors.append("Missing JSON-LD script block")
    else:
        try:
            json.loads(jsonld_match.group(1).strip())
        except Exception:
            errors.append("Invalid JSON-LD payload")

    return errors, meta_desc, canonical


def load_sitemap_url_map(sitemaps_dir: Path):
    url_map = {}
    sitemap_files = sorted(sitemaps_dir.glob('*.xml'))

    for path in sitemap_files:
        if path.name == 'sitemap-index.xml':
            continue

        tree = ET.parse(path)
        root = tree.getroot()
        for url_node in root.findall('sm:url', NS):
            loc = (url_node.findtext('sm:loc', default='', namespaces=NS) or '').strip()
            if not loc:
                continue

            en_gb = ''
            x_default = ''
            for link in url_node.findall('xhtml:link', NS):
                hreflang = (link.attrib.get('hreflang') or '').strip().lower()
                href = (link.attrib.get('href') or '').strip()
                if hreflang == 'en-gb':
                    en_gb = href
                elif hreflang == 'x-default':
                    x_default = href

            url_map[loc] = {
                'en_gb': en_gb,
                'x_default': x_default,
                'file': path.name,
            }

    return url_map


def validate_canonical_sitemap_alignment(sample_pages, sitemap_map, services_root):
    issues = []

    for page in sample_pages:
        html = page.read_text(encoding='utf-8', errors='replace')
        canonical_match = CANONICAL_RE.search(html)
        if not canonical_match:
            issues.append((page, ['Missing canonical URL']))
            continue

        canonical = canonical_match.group(1).strip()
        if canonical.endswith('/'):
            issues.append((page, [f'Canonical URL has trailing slash: {canonical}']))
            continue

        rel = page.relative_to(services_root)
        expected_loc = f"https://www.tradematch.uk/services/{rel.parent.name}/{rel.stem}"

        if canonical != expected_loc:
            issues.append((page, [f'Canonical mismatch: expected {expected_loc}, got {canonical}']))
            continue

        sitemap_entry = sitemap_map.get(canonical)
        if not sitemap_entry:
            issues.append((page, [f'Canonical URL not found in sitemap files: {canonical}']))
            continue

        en_gb = sitemap_entry.get('en_gb', '')
        if en_gb != canonical:
            issues.append((page, [f"hreflang en-gb mismatch in {sitemap_entry.get('file')}: {en_gb} != {canonical}"]))

        if en_gb.endswith('/'):
            issues.append((page, [f"hreflang en-gb has trailing slash in {sitemap_entry.get('file')}: {en_gb}"]))

    return issues


def main():
    parser = argparse.ArgumentParser(description="Validate generated localized SEO pages")
    parser.add_argument("--output-dir", type=str, default="generated-pages")
    parser.add_argument("--sample-size", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--check-sitemap-canonical", action="store_true", help="Verify sampled page canonical URLs exactly match sitemap <loc> and xhtml:link hreflang=en-gb URLs")
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
    canonical_sample = []

    for page in sample:
        errors, meta_desc, canonical = validate_page(page)
        if errors:
            all_errors.append((page, errors))
        if canonical:
            canonical_sample.append(page)
        if meta_desc:
            if meta_desc in seen_meta:
                duplicate_meta.append((seen_meta[meta_desc], page))
            else:
                seen_meta[meta_desc] = page

    if duplicate_meta:
        for first, second in duplicate_meta:
            all_errors.append((second, [f"Duplicate meta description with {first}"]))

    if args.check_sitemap_canonical:
        sitemaps_dir = out_dir / "sitemaps"
        if not sitemaps_dir.exists():
            all_errors.append((sitemaps_dir, ["Missing sitemaps directory"]))
        else:
            sitemap_map = load_sitemap_url_map(sitemaps_dir)
            services_root = out_dir / "services"
            alignment_issues = validate_canonical_sitemap_alignment(canonical_sample, sitemap_map, services_root)
            all_errors.extend(alignment_issues)

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
