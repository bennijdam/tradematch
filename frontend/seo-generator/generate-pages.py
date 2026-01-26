#!/usr/bin/env python3
"""
TradeMatch SEO Page Generator
Generates 175,950 SEO-optimized pages for all service and location combinations
"""

import os
import json
import csv
import math
import shutil
import importlib.util
from pathlib import Path

# ============================================
# SERVICES DATA (51 services)
# ============================================
SERVICES = [
    # Home Improvement (15)
    {"name": "Bathroom Fitting", "slug": "bathroom-fitting", "category": "Home Improvement", "avg_price": 850, "rating": 4.9},
    {"name": "Kitchen Fitting", "slug": "kitchen-fitting", "category": "Home Improvement", "avg_price": 1200, "rating": 4.8},
    {"name": "Painting & Decorating", "slug": "painting-decorating", "category": "Home Improvement", "avg_price": 450, "rating": 4.9},
    {"name": "Tiling", "slug": "tiling", "category": "Home Improvement", "avg_price": 380, "rating": 4.7},
    {"name": "Windows & Doors", "slug": "windows-doors", "category": "Home Improvement", "avg_price": 650, "rating": 4.8},
    {"name": "Flooring", "slug": "flooring", "category": "Home Improvement", "avg_price": 520, "rating": 4.9},
    {"name": "Lighting Installation", "slug": "lighting-installation", "category": "Home Improvement", "avg_price": 280, "rating": 4.8},
    {"name": "Insulation", "slug": "insulation", "category": "Home Improvement", "avg_price": 890, "rating": 4.7},
    {"name": "Damp Proofing", "slug": "damp-proofing", "category": "Home Improvement", "avg_price": 720, "rating": 4.8},
    {"name": "Soundproofing", "slug": "soundproofing", "category": "Home Improvement", "avg_price": 650, "rating": 4.7},
    {"name": "Home Cinema Installation", "slug": "home-cinema", "category": "Home Improvement", "avg_price": 1500, "rating": 4.9},
    {"name": "Smart Home Installation", "slug": "smart-home", "category": "Home Improvement", "avg_price": 980, "rating": 4.9},
    {"name": "Security Systems", "slug": "security-systems", "category": "Home Improvement", "avg_price": 850, "rating": 4.8},
    {"name": "CCTV Installation", "slug": "cctv-installation", "category": "Home Improvement", "avg_price": 750, "rating": 4.8},
    {"name": "Alarm Systems", "slug": "alarm-systems", "category": "Home Improvement", "avg_price": 680, "rating": 4.7},
    
    # Construction (15)
    {"name": "Extensions", "slug": "extensions", "category": "Construction", "avg_price": 2500, "rating": 4.9},
    {"name": "Loft Conversion", "slug": "loft-conversion", "category": "Construction", "avg_price": 3200, "rating": 4.8},
    {"name": "Bricklaying", "slug": "bricklaying", "category": "Construction", "avg_price": 920, "rating": 4.8},
    {"name": "Carpentry", "slug": "carpentry", "category": "Construction", "avg_price": 780, "rating": 4.9},
    {"name": "Plastering", "slug": "plastering", "category": "Construction", "avg_price": 580, "rating": 4.7},
    {"name": "Rendering", "slug": "rendering", "category": "Construction", "avg_price": 890, "rating": 4.8},
    {"name": "Groundwork", "slug": "groundwork", "category": "Construction", "avg_price": 1200, "rating": 4.7},
    {"name": "Demolition", "slug": "demolition", "category": "Construction", "avg_price": 850, "rating": 4.6},
    {"name": "Scaffolding", "slug": "scaffolding", "category": "Construction", "avg_price": 650, "rating": 4.8},
    {"name": "Basement Conversion", "slug": "basement-conversion", "category": "Construction", "avg_price": 3500, "rating": 4.9},
    {"name": "Garage Conversion", "slug": "garage-conversion", "category": "Construction", "avg_price": 2800, "rating": 4.8},
    {"name": "Conservatory", "slug": "conservatory", "category": "Construction", "avg_price": 2200, "rating": 4.8},
    {"name": "Orangery", "slug": "orangery", "category": "Construction", "avg_price": 2900, "rating": 4.9},
    {"name": "Porch", "slug": "porch", "category": "Construction", "avg_price": 1500, "rating": 4.7},
    {"name": "Structural Work", "slug": "structural-work", "category": "Construction", "avg_price": 1800, "rating": 4.8},
    
    # Outdoor Services (10)
    {"name": "Landscaping", "slug": "landscaping", "category": "Outdoor", "avg_price": 1200, "rating": 4.9},
    {"name": "Garden Maintenance", "slug": "garden-maintenance", "category": "Outdoor", "avg_price": 280, "rating": 4.8},
    {"name": "Decking", "slug": "decking", "category": "Outdoor", "avg_price": 850, "rating": 4.9},
    {"name": "Fencing", "slug": "fencing", "category": "Outdoor", "avg_price": 520, "rating": 4.7},
    {"name": "Driveways", "slug": "driveways", "category": "Outdoor", "avg_price": 1500, "rating": 4.8},
    {"name": "Patios", "slug": "patios", "category": "Outdoor", "avg_price": 980, "rating": 4.9},
    {"name": "Tree Surgery", "slug": "tree-surgery", "category": "Outdoor", "avg_price": 650, "rating": 4.8},
    {"name": "Artificial Grass", "slug": "artificial-grass", "category": "Outdoor", "avg_price": 780, "rating": 4.7},
    {"name": "Garden Sheds", "slug": "garden-sheds", "category": "Outdoor", "avg_price": 450, "rating": 4.6},
    {"name": "Outdoor Lighting", "slug": "outdoor-lighting", "category": "Outdoor", "avg_price": 380, "rating": 4.8},
    
    # Specialist Services (11)
    {"name": "Electrical", "slug": "electrical", "category": "Specialist", "avg_price": 780, "rating": 4.9},
    {"name": "Plumbing", "slug": "plumbing", "category": "Specialist", "avg_price": 850, "rating": 4.8},
    {"name": "Roofing", "slug": "roofing", "category": "Specialist", "avg_price": 2500, "rating": 4.8},
    {"name": "Heating & Gas", "slug": "heating-gas", "category": "Specialist", "avg_price": 920, "rating": 4.9},
    {"name": "Air Conditioning", "slug": "air-conditioning", "category": "Specialist", "avg_price": 1200, "rating": 4.7},
    {"name": "Solar Panels", "slug": "solar-panels", "category": "Specialist", "avg_price": 3500, "rating": 4.9},
    {"name": "Heat Pumps", "slug": "heat-pumps", "category": "Specialist", "avg_price": 4200, "rating": 4.8},
    {"name": "Boiler Repair", "slug": "boiler-repair", "category": "Specialist", "avg_price": 680, "rating": 4.8},
    {"name": "Drain Cleaning", "slug": "drain-cleaning", "category": "Specialist", "avg_price": 180, "rating": 4.7},
    {"name": "Septic Tank", "slug": "septic-tank", "category": "Specialist", "avg_price": 850, "rating": 4.6},
    {"name": "Water Treatment", "slug": "water-treatment", "category": "Specialist", "avg_price": 1200, "rating": 4.7},
]

# ============================================
# UK CITIES (30 major cities)
# ============================================
UK_CITIES = [
    {"name": "London", "slug": "london", "county": "Greater London", "population": 9000000},
    {"name": "Manchester", "slug": "manchester", "county": "Greater Manchester", "population": 550000},
    {"name": "Birmingham", "slug": "birmingham", "county": "West Midlands", "population": 1100000},
    {"name": "Leeds", "slug": "leeds", "county": "West Yorkshire", "population": 790000},
    {"name": "Glasgow", "slug": "glasgow", "county": "Scotland", "population": 635000},
    {"name": "Liverpool", "slug": "liverpool", "county": "Merseyside", "population": 500000},
    {"name": "Edinburgh", "slug": "edinburgh", "county": "Scotland", "population": 525000},
    {"name": "Bristol", "slug": "bristol", "county": "Bristol", "population": 465000},
    {"name": "Cardiff", "slug": "cardiff", "county": "Wales", "population": 365000},
    {"name": "Sheffield", "slug": "sheffield", "county": "South Yorkshire", "population": 585000},
    {"name": "Newcastle", "slug": "newcastle", "county": "Tyne and Wear", "population": 300000},
    {"name": "Nottingham", "slug": "nottingham", "county": "Nottinghamshire", "population": 330000},
    {"name": "Southampton", "slug": "southampton", "county": "Hampshire", "population": 255000},
    {"name": "Leicester", "slug": "leicester", "county": "Leicestershire", "population": 355000},
    {"name": "Coventry", "slug": "coventry", "county": "West Midlands", "population": 370000},
    {"name": "Bradford", "slug": "bradford", "county": "West Yorkshire", "population": 540000},
    {"name": "Belfast", "slug": "belfast", "county": "Northern Ireland", "population": 345000},
    {"name": "Oxford", "slug": "oxford", "county": "Oxfordshire", "population": 165000},
    {"name": "Cambridge", "slug": "cambridge", "county": "Cambridgeshire", "population": 145000},
    {"name": "Brighton", "slug": "brighton", "county": "East Sussex", "population": 290000},
    {"name": "Plymouth", "slug": "plymouth", "county": "Devon", "population": 265000},
    {"name": "Reading", "slug": "reading", "county": "Berkshire", "population": 175000},
    {"name": "York", "slug": "york", "county": "North Yorkshire", "population": 210000},
    {"name": "Bath", "slug": "bath", "county": "Somerset", "population": 95000},
    {"name": "Exeter", "slug": "exeter", "county": "Devon", "population": 130000},
    {"name": "Chester", "slug": "chester", "county": "Cheshire", "population": 90000},
    {"name": "Durham", "slug": "durham", "county": "County Durham", "population": 50000},
    {"name": "Canterbury", "slug": "canterbury", "county": "Kent", "population": 55000},
    {"name": "Winchester", "slug": "winchester", "county": "Hampshire", "population": 45000},
    {"name": "Stirling", "slug": "stirling", "county": "Scotland", "population": 37000},
]

# ============================================
# UK LOCATIONS (3,450 locations - loaded from CSV)
# ============================================
EXPECTED_LOCATIONS = 3450
EXPECTED_PAGES = len(SERVICES) * EXPECTED_LOCATIONS
SITEMAP_URL_LIMIT = 20000
BASE_URL = "https://www.tradematch.uk"
TOP_NAV_SERVICES = 8
TOP_NAV_CITIES = 10
FOOTER_SERVICE_LINKS = 10
FOOTER_CITY_LINKS = 10
NEARBY_LIMIT = 8
RELATED_SERVICES_LIMIT = 6


def load_locations(csv_path="uk-locations.csv"):
    """
    Load UK locations from CSV file.
    Required columns: name, slug, city
    Optional columns: county, postcode_area/postcode, population
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Location CSV not found: {csv_path}")

    locations = []
    seen_slugs = set()

    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = [h.strip() for h in (reader.fieldnames or [])]
        required = {"name", "slug", "city"}
        if not required.issubset(set(fieldnames)):
            raise ValueError("CSV missing required columns: name, slug, city")

        for row in reader:
            name = (row.get("name") or "").strip()
            slug = (row.get("slug") or "").strip()
            city = (row.get("city") or "").strip()
            county = (row.get("county") or "").strip()
            postcode = (row.get("postcode_area") or row.get("postcode") or "").strip()
            population = (row.get("population") or "").strip()

            if not name or not slug or not city:
                raise ValueError(f"Invalid CSV row (missing required fields): {row}")

            if slug in seen_slugs:
                raise ValueError(f"Duplicate location slug found: {slug}")
            seen_slugs.add(slug)

            locations.append({
                "name": name,
                "slug": slug,
                "city": city,
                "county": county,
                "postcode": postcode,
                "population": population,
            })

    city_slugs = {city["slug"] for city in UK_CITIES}
    location_slugs = {loc["slug"] for loc in locations}
    missing_cities = sorted(city_slugs - location_slugs)
    if missing_cities:
        raise ValueError(
            "CSV missing required city slugs used in template: " + ", ".join(missing_cities)
        )

    if len(locations) != EXPECTED_LOCATIONS:
        raise ValueError(
            f"Location count mismatch: expected {EXPECTED_LOCATIONS}, got {len(locations)}. "
            "Update uk-locations.csv to 3,450 rows to proceed."
        )

    return locations


def build_link_context(locations):
    locations_by_county = {}
    locations_by_city = {}
    locations_by_slug = {}
    location_order = []

    for loc in locations:
        locations_by_slug[loc["slug"]] = loc
        location_order.append(loc["slug"])

        county = (loc.get("county") or "").strip()
        city = (loc.get("city") or "").strip()

        if county:
            locations_by_county.setdefault(county, []).append(loc)
        if city:
            locations_by_city.setdefault(city, []).append(loc)

    return {
        "locations_by_county": locations_by_county,
        "locations_by_city": locations_by_city,
        "locations_by_slug": locations_by_slug,
        "location_order": location_order,
    }


def build_nav_links():
    services = SERVICES[:TOP_NAV_SERVICES]
    cities = UK_CITIES[:TOP_NAV_CITIES]
    service_links = "".join(
        [
            f"<a href=\"/services/{s['slug']}/\">{s['name']}</a>"
            for s in services
        ]
    )
    city_links = "".join(
        [
            f"<a href=\"/locations/{c['slug']}/\">{c['name']}</a>"
            for c in cities
        ]
    )
    return service_links, city_links


def build_footer_links():
    services = SERVICES[:FOOTER_SERVICE_LINKS]
    cities = UK_CITIES[:FOOTER_CITY_LINKS]
    service_links = "".join(
        [
            f"<a href=\"/services/{s['slug']}/\">{s['name']}</a>"
            for s in services
        ]
    )
    city_links = "".join(
        [
            f"<a href=\"/locations/{c['slug']}/\">{c['name']}</a>"
            for c in cities
        ]
    )
    return service_links, city_links


def get_related_services(current_service, limit=RELATED_SERVICES_LIMIT):
    same_category = [
        s for s in SERVICES if s["category"] == current_service["category"] and s["slug"] != current_service["slug"]
    ]
    related = same_category[:limit]
    if len(related) < limit:
        for svc in SERVICES:
            if svc["slug"] == current_service["slug"]:
                continue
            if svc in related:
                continue
            related.append(svc)
            if len(related) >= limit:
                break
    return related


def get_nearby_locations(location, context, limit=NEARBY_LIMIT):
    county = (location.get("county") or "").strip()
    city = (location.get("city") or "").strip()
    candidates = []

    if county and county in context["locations_by_county"]:
        candidates = context["locations_by_county"][county]
    elif city and city in context["locations_by_city"]:
        candidates = context["locations_by_city"][city]

    candidates = [loc for loc in candidates if loc["slug"] != location["slug"]]

    if len(candidates) < limit:
        order = context["location_order"]
        idx = order.index(location["slug"]) if location["slug"] in order else 0
        step = 1
        while len(candidates) < limit and (idx - step >= 0 or idx + step < len(order)):
            for neighbor_idx in (idx - step, idx + step):
                if neighbor_idx < 0 or neighbor_idx >= len(order):
                    continue
                neighbor_slug = order[neighbor_idx]
                neighbor_loc = context["locations_by_slug"].get(neighbor_slug)
                if not neighbor_loc or neighbor_loc["slug"] == location["slug"]:
                    continue
                if neighbor_loc not in candidates:
                    candidates.append(neighbor_loc)
                if len(candidates) >= limit:
                    break
            step += 1

    return candidates[:limit]


def build_breadcrumbs(service, location):
    return (
        "<nav class=\"breadcrumbs\" aria-label=\"Breadcrumb\">"
        "<a href=\"/\">Home</a> › "
        "<a href=\"/services/\">Services</a> › "
        f"<a href=\"/services/{service['slug']}/\">{service['name']}</a> › "
        f"<span>{location['name']}</span>"
        "</nav>"
    )


def build_contextual_links(service, location, context):
    nearby = get_nearby_locations(location, context, limit=5)
    related_services = get_related_services(service, limit=5)

    links = []
    links.append(f"<a href=\"/services/{service['slug']}/\">{service['name']} services</a>")
    links.append(f"<a href=\"/locations/{location['slug']}/\">{location['name']} tradespeople</a>")

    for loc in nearby[:3]:
        links.append(
            f"<a href=\"/services/{service['slug']}/{loc['slug']}\">{service['name']} in {loc['name']}</a>"
        )
    for svc in related_services[:3]:
        links.append(
            f"<a href=\"/services/{svc['slug']}/{location['slug']}\">{svc['name']} in {location['name']}</a>"
        )

    links = links[:10]

    list_items = "".join([f"<li>{link}</li>" for link in links])
    return (
        "<p>Explore related services and nearby options to compare quotes and availability.</p>"
        f"<ul class=\"contextual-link-list\">{list_items}</ul>"
    )


def build_nearby_section(service, location, context):
    nearby = get_nearby_locations(location, context, limit=8)
    links = "".join(
        [
            f"<a href=\"/services/{service['slug']}/{loc['slug']}\">{loc['name']}</a>"
            for loc in nearby
        ]
    )
    return links


def build_popular_services_section(location):
    services = SERVICES[:6]
    links = "".join(
        [
            f"<a href=\"/services/{svc['slug']}/{location['slug']}\">{svc['name']}</a>"
            for svc in services
        ]
    )
    return links


def render_nav_html(nav_links):
        nav_services, nav_cities = nav_links
        return (
                "<nav class=\"site-nav\">"
                "<div class=\"container nav-inner\">"
                "<a class=\"nav-logo\" href=\"/\">TradeMatch</a>"
                "<div class=\"nav-links\">"
                "<a href=\"/\">Home</a>"
                "<details class=\"nav-dropdown\"><summary>Services</summary>"
                f"<div class=\"dropdown-menu\">{nav_services}</div></details>"
                "<details class=\"nav-dropdown\"><summary>Locations</summary>"
                f"<div class=\"dropdown-menu\">{nav_cities}</div></details>"
                "<a href=\"/how-it-works.html\">How it works</a>"
                "<a href=\"/quote-engine.html\">Get quotes</a>"
                "</div></div></nav>"
        )


def render_footer_html(footer_links):
        footer_services, footer_cities = footer_links
        return (
                "<footer class=\"footer\">"
                "<div class=\"container\">"
                "<div class=\"footer-grid\">"
                "<div class=\"footer-column\"><h4>Top Services</h4>"
                f"<div class=\"footer-links\">{footer_services}</div></div>"
                "<div class=\"footer-column\"><h4>Top Cities</h4>"
                f"<div class=\"footer-links\">{footer_cities}</div></div>"
                "</div>"
                "<div class=\"footer-bottom\">"
                "<p>&copy; 2026 TradeMatch UK. All rights reserved.</p>"
                "<div class=\"footer-legal\">"
                "<a href=\"/terms-and-conditions\">Terms &amp; Conditions</a>"
                "<a href=\"/privacy-policy\">Privacy Policy</a>"
                "</div></div></div></footer>"
        )


def render_hub_page(title, intro, link_block, nav_links, footer_links):
        nav_html = render_nav_html(nav_links)
        footer_html = render_footer_html(footer_links)
        return f"""<!DOCTYPE html>
<html lang=\"en-GB\">
<head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
    <title>{title} | TradeMatch</title>
    <style>
        body {{ font-family: 'Manrope', sans-serif; margin: 0; color: #1A2332; background: #F8FAFB; }}
        .container {{ max-width: 1100px; margin: 0 auto; padding: 24px; }}
        .site-nav {{ position: sticky; top: 0; background: rgba(26,35,50,0.95); padding: 12px 0; }}
        .nav-inner {{ display: flex; justify-content: space-between; align-items: center; }}
        .nav-logo {{ color: #fff; font-weight: 800; text-decoration: none; }}
        .nav-links {{ display: flex; gap: 16px; align-items: center; }}
        .nav-links a, .nav-dropdown summary {{ color: #fff; text-decoration: none; font-weight: 600; font-size: 14px; }}
        .nav-dropdown {{ position: relative; }}
        .nav-dropdown summary {{ list-style: none; }}
        .dropdown-menu {{ position: absolute; top: 32px; left: 0; background: #0f172a; padding: 12px; border-radius: 10px; display: grid; gap: 8px; }}
        .dropdown-menu a {{ color: #e2e8f0; font-size: 13px; }}
        .hub-card {{ background: #fff; padding: 28px; border-radius: 16px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); }}
        .hub-links {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }}
        .hub-links a {{ background: #ecfeff; color: #0f766e; padding: 6px 12px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 13px; }}
        .footer {{ background: #111827; color: #fff; padding: 40px 0; margin-top: 48px; }}
        .footer-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }}
        .footer-links a {{ color: #e5e7eb; text-decoration: none; display: block; margin-bottom: 8px; }}
        .footer-bottom {{ display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }}
        .footer-legal a {{ color: #e5e7eb; margin-left: 12px; text-decoration: none; }}
    </style>
</head>
<body>
    {nav_html}
    <main class=\"container\">
        <div class=\"hub-card\">
            <h1>{title}</h1>
            <p>{intro}</p>
            <div class=\"hub-links\">
                {link_block}
            </div>
        </div>
    </main>
    {footer_html}
</body>
</html>"""


def generate_hub_pages(output_dir, locations, nav_links, footer_links):
    output_path = Path(output_dir)
    services_index_links = "".join(
        [
            f"<a href=\"/services/{svc['slug']}/\">{svc['name']} services</a>"
            for svc in SERVICES
        ]
    )
    services_index_html = render_hub_page(
        "All TradeMatch Services",
        "Browse service categories and compare trusted professionals.",
        services_index_links,
        nav_links,
        footer_links,
    )
    services_index_dir = output_path / "services"
    services_index_dir.mkdir(parents=True, exist_ok=True)
    (services_index_dir / "index.html").write_text(services_index_html, encoding="utf-8")

    locations_index_links = "".join(
        [
            f"<a href=\"/locations/{city['slug']}/\">Tradespeople in {city['name']}</a>"
            for city in UK_CITIES
        ]
    )
    locations_index_html = render_hub_page(
        "TradeMatch Locations",
        "Explore top UK locations and compare services nearby.",
        locations_index_links,
        nav_links,
        footer_links,
    )
    locations_index_dir = output_path / "locations"
    locations_index_dir.mkdir(parents=True, exist_ok=True)
    (locations_index_dir / "index.html").write_text(locations_index_html, encoding="utf-8")

    for service in SERVICES:
        links = "".join(
            [
                f"<a href=\"/services/{service['slug']}/{city['slug']}\">{service['name']} in {city['name']}</a>"
                for city in UK_CITIES[:10]
            ]
        )
        title = f"{service['name']} Services"
        intro = "Compare verified professionals and request quotes in top UK cities."
        html = render_hub_page(title, intro, links, nav_links, footer_links)
        hub_dir = output_path / "services" / service["slug"]
        hub_dir.mkdir(parents=True, exist_ok=True)
        (hub_dir / "index.html").write_text(html, encoding="utf-8")

    for location in locations:
        links = "".join(
            [
                f"<a href=\"/services/{svc['slug']}/{location['slug']}\">{svc['name']} in {location['name']}</a>"
                for svc in SERVICES[:10]
            ]
        )
        title = f"Tradespeople in {location['name']}"
        intro = "Explore popular services and compare quotes from local professionals."
        html = render_hub_page(title, intro, links, nav_links, footer_links)
        hub_dir = output_path / "locations" / location["slug"]
        hub_dir.mkdir(parents=True, exist_ok=True)
        (hub_dir / "index.html").write_text(html, encoding="utf-8")


def generate_page_content(service, location, template_content, context, nav_links, footer_links):
    """
    Replace template variables with actual service and location data
    """
    # Calculate price range (±20%)
    base_price = service['avg_price']
    price_min = int(base_price * 0.8)
    price_max = int(base_price * 1.2)
    
    # Calculate review count based on population (if city data available)
    review_count = 150  # Default
    vendor_count = 12   # Default
    
    # Replace all template variables
    content = template_content
    
    nav_services, nav_cities = nav_links
    footer_services, footer_cities = footer_links
    replacements = {
        '{{SERVICE_NAME}}': service['name'],
        '{{SERVICE_NAME_LOWER}}': service['name'].lower(),
        '{{SERVICE_SLUG}}': service['slug'],
        '{{SERVICE_CATEGORY}}': service['category'],
        '{{LOCATION_FULL}}': location['name'],
        '{{LOCATION_LOWER}}': location['name'].lower(),
        '{{LOCATION_SLUG}}': location['slug'],
        '{{RATING}}': str(service['rating']),
        '{{PRICE_MIN}}': str(price_min),
        '{{PRICE_MAX}}': str(price_max),
        '{{REVIEW_COUNT}}': str(review_count),
        '{{VENDOR_COUNT}}': str(vendor_count),
        '{{NAV_SERVICES}}': nav_services,
        '{{NAV_CITIES}}': nav_cities,
        '{{BREADCRUMBS}}': build_breadcrumbs(service, location),
        '{{CONTEXTUAL_LINKS}}': build_contextual_links(service, location, context),
        '{{NEARBY_AREAS}}': build_nearby_section(service, location, context),
        '{{POPULAR_SERVICES}}': build_popular_services_section(location),
        '{{FOOTER_SERVICES}}': footer_services,
        '{{FOOTER_CITIES}}': footer_cities,
    }
    
    for placeholder, value in replacements.items():
        content = content.replace(placeholder, value)
    
    return content


def generate_all_pages(template_path, output_dir, locations, context):
    """
    Generate all SEO pages for all service and location combinations
    """
    # Read template
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    total_pages = 0
    
    nav_links = build_nav_links()
    footer_links = build_footer_links()

    # Generate pages for each service/location combination
    for service in SERVICES:
        service_dir = Path(output_dir) / 'services' / service['slug']
        service_dir.mkdir(parents=True, exist_ok=True)

        # Generate location pages
        for location in locations:
            page_content = generate_page_content(service, location, template_content, context, nav_links, footer_links)
            
            # Save page
            output_file = service_dir / f"{location['slug']}.html"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(page_content)
            
            total_pages += 1

            if total_pages % 100 == 0:
                print(f"Generated {total_pages} pages...")
    
    print(f"\n✅ Generation complete!")
    print(f"📊 Total pages generated: {total_pages}")
    print(f"📁 Output directory: {output_dir}")

    generate_hub_pages(output_dir, locations, nav_links, footer_links)
    
    # Generate sitemaps
    generate_sitemaps(output_dir, locations)
    
    return total_pages


def iter_urls(locations):
    for service in SERVICES:
        for location in locations:
            yield f"{BASE_URL}/services/{service['slug']}/{location['slug']}"


def write_sitemap_file(sitemap_path, urls):
    with open(sitemap_path, "w", encoding="utf-8") as f:
        f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        f.write("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
        for url in urls:
            f.write("  <url>\n")
            f.write(f"    <loc>{url}</loc>\n")
            f.write("    <changefreq>weekly</changefreq>\n")
            f.write("    <priority>0.8</priority>\n")
            f.write("  </url>\n")
        f.write("</urlset>")


def generate_sitemaps(output_dir, locations):
    """
    Generate sitemap index + split sitemaps (max 20,000 URLs per sitemap)
    """
    sitemaps_dir = Path(output_dir) / "sitemaps"
    sitemaps_dir.mkdir(parents=True, exist_ok=True)

    total_urls = len(SERVICES) * len(locations)
    total_sitemaps = math.ceil(total_urls / SITEMAP_URL_LIMIT)

    url_iter = iter_urls(locations)
    sitemap_files = []

    for i in range(1, total_sitemaps + 1):
        chunk_urls = []
        for _ in range(SITEMAP_URL_LIMIT):
            try:
                chunk_urls.append(next(url_iter))
            except StopIteration:
                break

        if not chunk_urls:
            break

        sitemap_file = sitemaps_dir / f"sitemap-{i}.xml"
        write_sitemap_file(sitemap_file, chunk_urls)
        sitemap_files.append(sitemap_file)

    sitemap_index = Path(output_dir) / "sitemap-index.xml"
    with open(sitemap_index, "w", encoding="utf-8") as f:
        f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
        f.write("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
        for sitemap_file in sitemap_files:
            loc = f"{BASE_URL}/sitemaps/{sitemap_file.name}"
            f.write("  <sitemap>\n")
            f.write(f"    <loc>{loc}</loc>\n")
            f.write("  </sitemap>\n")
        f.write("</sitemapindex>")

    print(f"✅ Sitemaps generated: {len(sitemap_files)} files")


def generate_data_json(output_dir, locations):
    """
    Export services and locations data to JSON for reference
    """
    data = {
        'services': SERVICES,
        'cities': UK_CITIES,
        'total_services': len(SERVICES),
        'total_cities': len(UK_CITIES),
        'total_locations': len(locations),
        'total_pages': len(SERVICES) * len(locations),
        'locations': locations,
    }

    with open(Path(output_dir) / 'page-data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Data exported to page-data.json")


def maybe_generate_phased_sitemaps():
    if os.environ.get("PHASED_SITEMAPS", "1") == "0":
        return
    script_path = Path(__file__).resolve().parent / "build-phased-sitemaps.py"
    if not script_path.exists():
        return
    spec = importlib.util.spec_from_file_location("phased_builder", script_path)
    if spec is None or spec.loader is None:
        print("⚠️  Skipping phased sitemaps (unable to load builder).")
        return
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if hasattr(module, "main"):
        module.main()


# ============================================
# MAIN EXECUTION
# ============================================
if __name__ == '__main__':
    import sys
    
    print("=" * 60)
    print("TradeMatch SEO Page Generator")
    print("=" * 60)
    print()
    
    # Configuration
    TEMPLATE_FILE = 'seo-template-ULTIMATE-ENHANCED.html'
    OUTPUT_DIR = 'generated-pages'
    CSV_FILE = 'uk-locations.csv'
    
    # Check template exists
    if not os.path.exists(TEMPLATE_FILE):
        print(f"❌ Error: Template file not found: {TEMPLATE_FILE}")
        sys.exit(1)
    
    # Print statistics
    print(f"📋 Services: {len(SERVICES)}")
    print(f"🏙️  Major Cities: {len(UK_CITIES)}")
    print(f"📍 Expected Locations: {EXPECTED_LOCATIONS}")
    print(f"📄 Expected Total Pages: {EXPECTED_PAGES}")
    print()

    try:
        locations = load_locations(CSV_FILE)
    except Exception as exc:
        print(f"❌ Error loading locations: {exc}")
        sys.exit(1)

    if len(locations) * len(SERVICES) != EXPECTED_PAGES:
        print(
            f"❌ Page count mismatch: expected {EXPECTED_PAGES}, got {len(locations) * len(SERVICES)}"
        )
        sys.exit(1)

    print(f"✅ Loaded {len(locations)} locations from {CSV_FILE}")
    print(f"📄 Total Pages to Generate: {len(locations) * len(SERVICES)}")
    print()

    # Ask for confirmation
    response = input("Generate pages? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        print("\n🚀 Starting page generation...")
        print()
        
        tmp_output = f"{OUTPUT_DIR}.tmp"
        try:
            if os.path.exists(tmp_output):
                shutil.rmtree(tmp_output)

            link_context = build_link_context(locations)
            total = generate_all_pages(TEMPLATE_FILE, tmp_output, locations, link_context)
            generate_data_json(tmp_output, locations)

            if total != EXPECTED_PAGES:
                raise RuntimeError(
                    f"Generated page count mismatch: expected {EXPECTED_PAGES}, got {total}"
                )

            if os.path.exists(OUTPUT_DIR):
                shutil.rmtree(OUTPUT_DIR)
            os.rename(tmp_output, OUTPUT_DIR)
            maybe_generate_phased_sitemaps()

        except Exception as exc:
            if os.path.exists(tmp_output):
                shutil.rmtree(tmp_output)
            print(f"❌ Generation failed: {exc}")
            sys.exit(1)
        
        print()
        print("=" * 60)
        print(f"✅ SUCCESS! Generated {total} pages")
        print(f"📁 Pages saved to: {OUTPUT_DIR}/")
        print("=" * 60)
    else:
        print("\n❌ Generation cancelled")
