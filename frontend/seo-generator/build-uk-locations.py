#!/usr/bin/env python3
import csv
import json
import re
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ONS Open Geography Portal Feature Services (official datasets)
LAD_SERVICE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Local_Authority_Districts_December_2023_Boundaries_UK_BFC/FeatureServer/0"
BUA_SERVICE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/BUA_DEC_2022_EW_NC/FeatureServer/0"
PARISH_SERVICE = "https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/PAR_DEC_2023_EW_NC/FeatureServer/0"

EXPECTED_TOTAL = 3450

REQUIRED_CITY_SLUGS = [
    "london", "manchester", "birmingham", "leeds", "glasgow", "liverpool",
    "edinburgh", "bristol", "cardiff", "sheffield", "newcastle", "nottingham",
    "southampton", "leicester", "coventry", "bradford", "belfast", "oxford",
    "cambridge", "brighton", "plymouth", "reading", "york", "bath", "exeter",
    "chester", "durham", "canterbury", "winchester", "stirling",
]


def slugify(text):
    text = text.lower().strip()
    text = text.replace("&", "and")
    text = re.sub(r"'", "", text)
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def fetch_arcgis_records(service_url, fields):
    records = []
    offset = 0
    page_size = 1000
    field_list = ",".join(fields)
    while True:
        query = (
            f"{service_url}/query?where=1%3D1&outFields={field_list}&returnGeometry=false"
            f"&resultOffset={offset}&resultRecordCount={page_size}&f=json"
        )
        req = urllib.request.Request(query, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        features = payload.get("features", [])
        if not features:
            break

        for feature in features:
            records.append(feature.get("attributes", {}))

        if payload.get("exceededTransferLimit") or len(features) == page_size:
            offset += len(features)
            continue

        break
    return records


def load_or_fetch(service_url, fields, cache_path):
    if cache_path.exists():
        records = json.loads(cache_path.read_text(encoding="utf-8"))
        if len(records) != 1000:
            return records
    records = fetch_arcgis_records(service_url, fields)
    cache_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    return records


def build_locations():
    lad_records = load_or_fetch(LAD_SERVICE, ["LAD23NM"], DATA_DIR / "lad-2023.json")
    bua_records = load_or_fetch(BUA_SERVICE, ["BUA22NM"], DATA_DIR / "bua-2022.json")
    parish_records = load_or_fetch(
        PARISH_SERVICE, ["PAR23NM", "LAD23NM"], DATA_DIR / "parish-2023.json"
    )

    lad_names = sorted({r.get("LAD23NM") for r in lad_records if r.get("LAD23NM")})
    bua_names = sorted({r.get("BUA22NM") for r in bua_records if r.get("BUA22NM")})
    parish_rows = [
        {
            "name": r.get("PAR23NM"),
            "lad": r.get("LAD23NM"),
        }
        for r in parish_records
        if r.get("PAR23NM")
    ]

    entries = []
    seen_slugs = set()

    def add_entry(name, city, county, population=0, slug_override=None):
        if len(entries) >= EXPECTED_TOTAL:
            return
        slug_base = slugify(name)
        slug = slug_override or slug_base
        if not slug:
            return
        if slug in seen_slugs:
            return
        seen_slugs.add(slug)
        entries.append(
            {
                "name": name,
                "slug": slug,
                "city": city,
                "county": county,
                "postcode_area": "",
                "population": int(population) if population is not None else 0,
            }
        )

    for city_slug in REQUIRED_CITY_SLUGS:
        name = city_slug.replace("-", " ").title()
        add_entry(name, name, "United Kingdom", 0, slug_override=city_slug)

    for lad in lad_names:
        add_entry(lad, lad, lad, 0)

    for bua in bua_names:
        add_entry(bua, bua, "England and Wales", 0)

    if len(entries) < EXPECTED_TOTAL:
        for row in parish_rows:
            if len(entries) >= EXPECTED_TOTAL:
                break
            name = row["name"]
            lad = row.get("lad") or name
            add_entry(name, lad, lad, 0)

    if len(entries) != EXPECTED_TOTAL:
        raise RuntimeError(
            f"Expected {EXPECTED_TOTAL} locations, got {len(entries)}. "
            f"LADs={len(lad_names)}, BUAs={len(bua_names)}, Parishes={len(parish_rows)}"
        )

    return entries


def write_csv(entries, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["name", "slug", "city", "county", "postcode_area", "population"],
        )
        writer.writeheader()
        for row in entries:
            writer.writerow(row)


if __name__ == "__main__":
    locations = build_locations()
    out_path = BASE_DIR / "uk-locations.csv"
    write_csv(locations, out_path)
    print(f"✅ Wrote {len(locations)} locations to {out_path}")
