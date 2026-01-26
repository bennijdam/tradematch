#!/usr/bin/env python3
"""
Build phased sitemap sets for gradual submission.
Creates per-phase sitemaps and indexes without touching existing sitemaps.
"""

import json
import math
from datetime import date
from pathlib import Path

import importlib.util


def load_generator_module():
    module_path = BASE_DIR / "generate-pages.py"
    spec = importlib.util.spec_from_file_location("seo_generator", module_path)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load generate-pages.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated-pages"
PHASED_DIR = OUTPUT_DIR / "sitemaps" / "phased"

GENERATOR = load_generator_module()
SERVICES = GENERATOR.SERVICES
UK_CITIES = GENERATOR.UK_CITIES
BASE_URL = GENERATOR.BASE_URL
SITEMAP_URL_LIMIT = GENERATOR.SITEMAP_URL_LIMIT

INCLUDE_HOMEPAGE = True
INCLUDE_SERVICE_HUBS = True

PHASE1_TOP_SERVICES = 10
PHASE3_TARGET_PAGES = 35000  # target between 30k-40k

LONDON_BOROUGH_SLUGS = {
    "barking-and-dagenham",
    "barnet",
    "bexley",
    "brent",
    "bromley",
    "camden",
    "city-of-london",
    "croydon",
    "ealing",
    "enfield",
    "greenwich",
    "hackney",
    "hammersmith-and-fulham",
    "haringey",
    "harrow",
    "havering",
    "hillingdon",
    "hounslow",
    "islington",
    "kensington-and-chelsea",
    "kingston-upon-thames",
    "lambeth",
    "lewisham",
    "merton",
    "newham",
    "redbridge",
    "richmond-upon-thames",
    "southwark",
    "sutton",
    "tower-hamlets",
    "waltham-forest",
    "wandsworth",
    "westminster",
}


def load_locations():
    data_path = OUTPUT_DIR / "page-data.json"
    if not data_path.exists():
        raise FileNotFoundError("page-data.json not found. Run generate-pages.py first.")
    data = json.loads(data_path.read_text(encoding="utf-8"))
    return data["locations"]


def build_url(service_slug, location_slug):
    return f"{BASE_URL}/services/{service_slug}/{location_slug}"


def write_sitemap_file(sitemap_path, urls, priority):
    sitemap_path.parent.mkdir(parents=True, exist_ok=True)
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        f.write("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
        for url in urls:
            f.write("  <url>\n")
            f.write(f"    <loc>{url}</loc>\n")
            f.write("    <changefreq>weekly</changefreq>\n")
            f.write(f"    <priority>{priority:.1f}</priority>\n")
            f.write("  </url>\n")
        f.write("</urlset>")


def write_index(index_path, sitemap_files):
    today = date.today().isoformat()
    index_path.parent.mkdir(parents=True, exist_ok=True)
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        f.write("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
        for sitemap_file in sitemap_files:
            loc = f"{BASE_URL}/sitemaps/phased/{sitemap_file.name}"
            f.write("  <sitemap>\n")
            f.write(f"    <loc>{loc}</loc>\n")
            f.write(f"    <lastmod>{today}</lastmod>\n")
            f.write("  </sitemap>\n")
        f.write("</sitemapindex>")


def chunk_urls(urls, limit):
    for i in range(0, len(urls), limit):
        yield urls[i : i + limit]


def build_phase_sitemaps(phase_name, urls, priority):
    sitemap_files = []
    for idx, chunk in enumerate(chunk_urls(urls, SITEMAP_URL_LIMIT), start=1):
        filename = f"{phase_name}-{idx}.xml"
        path = PHASED_DIR / filename
        write_sitemap_file(path, chunk, priority)
        sitemap_files.append(path)
    index_path = PHASED_DIR / f"sitemap-index-{phase_name}.xml"
    write_index(index_path, sitemap_files)
    return index_path, sitemap_files


def main():
    locations = load_locations()
    all_location_slugs = [loc["slug"] for loc in locations]

    top_city_slugs = [city["slug"] for city in UK_CITIES]

    phase1_services = SERVICES[:PHASE1_TOP_SERVICES]
    phase1_locations = top_city_slugs

    phase2_services = SERVICES
    phase2_locations = top_city_slugs

    phase3_location_target = max(1, math.ceil(PHASE3_TARGET_PAGES / len(SERVICES)))
    phase3_seed = [slug for slug in all_location_slugs if slug in LONDON_BOROUGH_SLUGS]
    phase3_remaining_pool = [
        slug for slug in all_location_slugs if slug not in set(phase1_locations)
    ]
    for slug in phase3_seed:
        if slug in phase3_remaining_pool:
            phase3_remaining_pool.remove(slug)

    phase3_locations = []
    for slug in phase3_seed + phase3_remaining_pool:
        if slug in phase3_locations or slug in phase1_locations:
            continue
        phase3_locations.append(slug)
        if len(phase3_locations) >= phase3_location_target:
            break

    phase4_locations = [
        slug
        for slug in all_location_slugs
        if slug not in set(phase1_locations + phase3_locations)
    ]

    urls_phase1 = []
    if INCLUDE_HOMEPAGE:
        urls_phase1.append(f"{BASE_URL}/")
    if INCLUDE_SERVICE_HUBS:
        urls_phase1.extend([f"{BASE_URL}/services/{s['slug']}/" for s in SERVICES])

    for service in phase1_services:
        for loc_slug in phase1_locations:
            urls_phase1.append(build_url(service["slug"], loc_slug))

    urls_phase2 = []
    for service in phase2_services:
        for loc_slug in phase2_locations:
            urls_phase2.append(build_url(service["slug"], loc_slug))

    urls_phase3 = []
    for service in SERVICES:
        for loc_slug in phase3_locations:
            urls_phase3.append(build_url(service["slug"], loc_slug))

    urls_phase4 = []
    for service in SERVICES:
        for loc_slug in phase4_locations:
            urls_phase4.append(build_url(service["slug"], loc_slug))

    PHASED_DIR.mkdir(parents=True, exist_ok=True)

    index_phase1, files_phase1 = build_phase_sitemaps("phase-1", urls_phase1, 0.9)
    index_phase2, files_phase2 = build_phase_sitemaps("phase-2", urls_phase2, 0.9)
    index_phase3, files_phase3 = build_phase_sitemaps("phase-3", urls_phase3, 0.7)
    index_phase4, files_phase4 = build_phase_sitemaps("phase-4", urls_phase4, 0.5)

    master_index = PHASED_DIR / "sitemap-index-phased.xml"
    write_index(master_index, [index_phase1, index_phase2, index_phase3, index_phase4])

    print("✅ Phased sitemaps created:")
    print(f"- Phase 1 URLs: {len(urls_phase1)} (files: {len(files_phase1)})")
    print(f"- Phase 2 URLs: {len(urls_phase2)} (files: {len(files_phase2)})")
    print(f"- Phase 3 URLs: {len(urls_phase3)} (files: {len(files_phase3)})")
    print(f"- Phase 4 URLs: {len(urls_phase4)} (files: {len(files_phase4)})")
    print(f"- Master index: {master_index}")


if __name__ == "__main__":
    main()
