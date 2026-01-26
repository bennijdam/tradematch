#!/usr/bin/env python3
"""
Patch existing generated HTML pages with internal link-weight scoring
and PageRank sculpting, without regenerating all pages.
"""

import csv
import importlib.util
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated-pages"
CSV_PATH = BASE_DIR / "uk-locations.csv"
DEBUG_PATH = OUTPUT_DIR / "internal-link-debug.json"

TOP_NAV_SERVICES = 8
TOP_NAV_CITIES = 10
FOOTER_SERVICE_LINKS = 10
FOOTER_CITY_LINKS = 10

NEARBY_LIMIT = 8
RELATED_SERVICES_LIMIT = 6

LARGE_TOWN_POP = 50000
MIN_LINK_WEIGHT = 15
MAX_LINKS_PER_PAGE = 45

SERVICE_GRID_SLUGS = [
    "electrical",
    "plumbing",
    "heating-gas",
    "carpentry",
    "landscaping",
    "roofing",
    "painting-decorating",
    "tiling",
]

CONTEXT_MULTIPLIERS = {
    "breadcrumb": 1.5,
    "contextual": 1.3,
    "nearby": 1.1,
    "footer": 0.6,
}

NAV_MULTIPLIER = 1.0  # treated as neutral navigation context

CSS_MARKER = "/* TM-INTERNAL-LINKS-CSS */"
NAV_MARKER_START = "<!-- TM-NAV-START -->"
NAV_MARKER_END = "<!-- TM-NAV-END -->"
BREADCRUMB_MARKER_START = "<!-- TM-BREADCRUMBS-START -->"
BREADCRUMB_MARKER_END = "<!-- TM-BREADCRUMBS-END -->"
CONTEXT_MARKER_START = "<!-- TM-CONTEXTUAL-START -->"
CONTEXT_MARKER_END = "<!-- TM-CONTEXTUAL-END -->"
NEARBY_MARKER_START = "<!-- TM-NEARBY-START -->"
NEARBY_MARKER_END = "<!-- TM-NEARBY-END -->"
POPULAR_MARKER_START = "<!-- TM-POPULAR-START -->"
POPULAR_MARKER_END = "<!-- TM-POPULAR-END -->"
FOOTER_MARKER = "<!-- TM-FOOTER-LINKS -->"
SEO_AUTOMATION_MARKER_START = "<!-- TM-SEO-AUTOMATION-START -->"
SEO_AUTOMATION_MARKER_END = "<!-- TM-SEO-AUTOMATION-END -->"

LINK_CONTEXT_PRIORITY = [
    "breadcrumbs",
    "nav",
    "contextual",
    "nearby",
    "popular",
    "services_grid",
    "cities_grid",
    "footer",
]


def load_generator_module():
    module_path = BASE_DIR / "generate-pages.py"
    spec = importlib.util.spec_from_file_location("seo_generator", module_path)
    if spec is None or spec.loader is None:
        raise ImportError("Unable to load generate-pages.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_locations():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"Missing {CSV_PATH}")
    locations = []
    with open(CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            population = (row.get("population") or "").strip()
            try:
                population_value = int(float(population)) if population else 0
            except ValueError:
                population_value = 0
            locations.append({
                "name": (row.get("name") or "").strip(),
                "slug": (row.get("slug") or "").strip(),
                "city": (row.get("city") or "").strip(),
                "county": (row.get("county") or "").strip(),
                "population": population_value,
            })
    return locations


def build_link_context(locations):
    locations_by_county = {}
    locations_by_city = {}
    locations_by_slug = {}
    order = []

    for loc in locations:
        locations_by_slug[loc["slug"]] = loc
        order.append(loc["slug"])
        if loc["county"]:
            locations_by_county.setdefault(loc["county"], []).append(loc)
        if loc["city"]:
            locations_by_city.setdefault(loc["city"], []).append(loc)

    return {
        "locations_by_county": locations_by_county,
        "locations_by_city": locations_by_city,
        "locations_by_slug": locations_by_slug,
        "order": order,
    }


def is_major_city(location_slug, major_city_slugs):
    return location_slug in major_city_slugs


def get_location_tier(location, major_city_slugs):
    if is_major_city(location["slug"], major_city_slugs):
        return "major_city"
    if location.get("population", 0) >= LARGE_TOWN_POP:
        return "large_town"
    return "village"


def page_value_for_location(location, major_city_slugs):
    tier = get_location_tier(location, major_city_slugs)
    if tier == "major_city":
        return 70
    if tier == "large_town":
        return 55
    return 30


def page_depth_for_location(location, major_city_slugs):
    tier = get_location_tier(location, major_city_slugs)
    if tier == "major_city":
        return 2
    if tier == "large_town":
        return 3
    return 4


def calculate_link_weight(source_value, multiplier, target_depth):
    return (source_value * multiplier) / max(1, target_depth)


def make_link(url, label, weight, context):
    return {
        "url": url,
        "label": label,
        "weight": round(weight, 2),
        "context": context,
    }


def render_link(link):
    return (
        f"<a href=\"{link['url']}\" data-link-weight=\"{link['weight']:.2f}\">"
        f"{link['label']}</a>"
    )


def render_link_list(links):
    return "".join([render_link(link) for link in links])


def filter_links_by_weight(links):
    return [link for link in links if link["weight"] >= MIN_LINK_WEIGHT]


def sort_links_by_weight(links):
    return sorted(links, key=lambda item: item["weight"], reverse=True)


def enforce_link_budget(sections):
    remaining = MAX_LINKS_PER_PAGE
    pruned = {}
    for section_name in LINK_CONTEXT_PRIORITY:
        items = sections.get(section_name, [])
        if not items:
            pruned[section_name] = []
            continue
        items = sort_links_by_weight(items)
        if remaining <= 0:
            pruned[section_name] = []
            continue
        if len(items) > remaining:
            items = items[:remaining]
        pruned[section_name] = items
        remaining -= len(items)
    return pruned


def get_nearby_locations(location, context, major_city_slugs, limit=NEARBY_LIMIT):
    candidates = []
    county = location.get("county")
    city = location.get("city")
    if county and county in context["locations_by_county"]:
        candidates = context["locations_by_county"][county]
    elif city and city in context["locations_by_city"]:
        candidates = context["locations_by_city"][city]

    candidates = [loc for loc in candidates if loc["slug"] != location["slug"]]

    if len(candidates) < limit:
        order = context["order"]
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

    tier = get_location_tier(location, major_city_slugs)
    current_pop = location.get("population", 0)
    filtered = []
    for loc in candidates:
        if tier == "village" and loc.get("county") != location.get("county"):
            continue
        if loc.get("population", 0) < current_pop:
            continue
        filtered.append(loc)

    return filtered[:limit]


def get_related_services(services, current_service, limit=RELATED_SERVICES_LIMIT):
    same_category = [
        s for s in services if s["category"] == current_service["category"] and s["slug"] != current_service["slug"]
    ]
    related = same_category[:limit]
    if len(related) < limit:
        for svc in services:
            if svc["slug"] == current_service["slug"]:
                continue
            if svc in related:
                continue
            related.append(svc)
            if len(related) >= limit:
                break
    return related


def build_nav_links(source_value, services, cities):
    links = []
    links.append(make_link("/", "Home", calculate_link_weight(source_value, NAV_MULTIPLIER, 1), "nav"))
    links.append(make_link("/services/", "Services", calculate_link_weight(source_value, NAV_MULTIPLIER, 1), "nav"))
    links.append(make_link("/locations/", "Locations", calculate_link_weight(source_value, NAV_MULTIPLIER, 1), "nav"))
    links.append(make_link("/how-it-works.html", "How it works", calculate_link_weight(source_value, NAV_MULTIPLIER, 2), "nav"))
    links.append(make_link("/quote-engine.html", "Get quotes", calculate_link_weight(source_value, NAV_MULTIPLIER, 2), "nav"))

    for svc in services[:TOP_NAV_SERVICES]:
        links.append(
            make_link(
                f"/services/{svc['slug']}/",
                svc["name"],
                calculate_link_weight(source_value, NAV_MULTIPLIER, 1),
                "nav",
            )
        )
    for city in cities[:TOP_NAV_CITIES]:
        links.append(
            make_link(
                f"/locations/{city['slug']}/",
                city["name"],
                calculate_link_weight(source_value, NAV_MULTIPLIER, 1),
                "nav",
            )
        )

    return filter_links_by_weight(links)


def build_footer_links(source_value, services, cities, allow_footer):
    if not allow_footer:
        return []
    links = []
    for svc in services[:FOOTER_SERVICE_LINKS]:
        links.append(
            make_link(
                f"/services/{svc['slug']}/",
                svc["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["footer"], 1),
                "footer",
            )
        )
    for city in cities[:FOOTER_CITY_LINKS]:
        links.append(
            make_link(
                f"/locations/{city['slug']}/",
                city["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["footer"], 1),
                "footer",
            )
        )
    return filter_links_by_weight(links)


def build_breadcrumb_links(source_value, service, location):
    links = [
        make_link("/", "Home", calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["breadcrumb"], 1), "breadcrumb"),
        make_link("/services/", "Services", calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["breadcrumb"], 1), "breadcrumb"),
        make_link(
            f"/services/{service['slug']}/",
            service["name"],
            calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["breadcrumb"], 1),
            "breadcrumb",
        ),
    ]
    return filter_links_by_weight(links)


def build_contextual_links(source_value, service, location, context, services, major_city_slugs):
    links = []
    links.append(
        make_link(
            f"/locations/{location['slug']}/",
            f"{location['name']} tradespeople",
            calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["contextual"], 1),
            "contextual",
        )
    )

    tier = get_location_tier(location, major_city_slugs)
    if tier != "village":
        related_services = get_related_services(services, service, limit=5)
        for svc in related_services[:3]:
            links.append(
                make_link(
                    f"/services/{svc['slug']}/{location['slug']}",
                    f"{svc['name']} in {location['name']}",
                    calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["contextual"], page_depth_for_location(location, major_city_slugs)),
                    "contextual",
                )
            )

    return filter_links_by_weight(links)


def build_nearby_links(source_value, service, location, context, major_city_slugs):
    tier = get_location_tier(location, major_city_slugs)
    if tier == "village":
        return []
    nearby = get_nearby_locations(location, context, major_city_slugs, limit=NEARBY_LIMIT)
    links = []
    for loc in nearby:
        depth = page_depth_for_location(loc, major_city_slugs)
        links.append(
            make_link(
                f"/services/{service['slug']}/{loc['slug']}",
                loc["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["nearby"], depth),
                "nearby",
            )
        )
    return filter_links_by_weight(links)


def build_popular_service_links(source_value, location, services, major_city_slugs):
    tier = get_location_tier(location, major_city_slugs)
    if tier == "village":
        return []
    links = []
    for svc in services[:6]:
        depth = page_depth_for_location(location, major_city_slugs)
        links.append(
            make_link(
                f"/services/{svc['slug']}/{location['slug']}",
                svc["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["contextual"], depth),
                "popular",
            )
        )
    return filter_links_by_weight(links)


def build_city_grid_links(source_value, service, cities):
    links = []
    for city in cities[:TOP_NAV_CITIES]:
        links.append(
            make_link(
                f"/services/{service['slug']}/{city['slug']}",
                city["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["nearby"], 2),
                "cities_grid",
            )
        )
    return filter_links_by_weight(links)


def build_services_grid_weights(source_value, location, services, major_city_slugs):
    depth = page_depth_for_location(location, major_city_slugs)
    links = []
    for svc in services:
        links.append(
            make_link(
                f"/services/{svc['slug']}/{location['slug']}",
                svc["name"],
                calculate_link_weight(source_value, CONTEXT_MULTIPLIERS["contextual"], depth),
                "services_grid",
            )
        )
    return {link["url"]: link for link in filter_links_by_weight(links)}


def render_breadcrumbs_html(links, location_name):
    items = " › ".join([render_link(link) for link in links])
    return (
        f"{BREADCRUMB_MARKER_START}"
        "<nav class=\"breadcrumbs\" aria-label=\"Breadcrumb\">"
        f"{items} › <span>{location_name}</span>"
        "</nav>"
        f"{BREADCRUMB_MARKER_END}"
    )


def render_contextual_html(links):
    list_items = "".join([f"<li>{render_link(link)}</li>" for link in links])
    return (
        f"{CONTEXT_MARKER_START}"
        "<div class=\"contextual-links\">"
        "<p>Explore related services and nearby options to compare quotes and availability.</p>"
        f"<ul class=\"contextual-link-list\">{list_items}</ul>"
        "</div>"
        f"{CONTEXT_MARKER_END}"
    )


def render_nearby_html(links, service_name):
    return (
        f"{NEARBY_MARKER_START}"
        "<div class=\"nearby-areas\">"
        f"<h3>{service_name} services in nearby areas</h3>"
        f"<div class=\"link-pill-list\">{render_link_list(links)}</div>"
        "</div>"
        f"{NEARBY_MARKER_END}"
    )


def render_popular_html(links, location_name):
    return (
        f"{POPULAR_MARKER_START}"
        "<div class=\"popular-services\">"
        f"<h3>Popular services in {location_name}</h3>"
        f"<div class=\"link-pill-list\">{render_link_list(links)}</div>"
        "</div>"
        f"{POPULAR_MARKER_END}"
    )


def render_nav_html(nav_links):
    items = {
        "core": [],
        "services": [],
        "cities": [],
    }
    for link in nav_links:
        if link["url"].startswith("/services/") and link["url"].count("/") == 2:
            items["services"].append(link)
        elif link["url"].startswith("/locations/"):
            items["cities"].append(link)
        else:
            items["core"].append(link)

    core_html = "".join([render_link(link) for link in items["core"]])
    services_html = render_link_list(items["services"])
    cities_html = render_link_list(items["cities"])

    return (
        f"{NAV_MARKER_START}"
        "<nav class=\"site-nav\">"
        "<div class=\"container nav-inner\">"
        "<a class=\"nav-logo\" href=\"/\">TradeMatch</a>"
        "<div class=\"nav-links\">"
        f"{core_html}"
        "<details class=\"nav-dropdown\"><summary>Services</summary>"
        f"<div class=\"dropdown-menu\">{services_html}</div></details>"
        "<details class=\"nav-dropdown\"><summary>Locations</summary>"
        f"<div class=\"dropdown-menu\">{cities_html}</div></details>"
        "</div></div></nav>"
        f"{NAV_MARKER_END}"
    )


def render_footer_grid(footer_links):
    services_html = render_link_list([link for link in footer_links if "/services/" in link["url"]])
    cities_html = render_link_list([link for link in footer_links if "/locations/" in link["url"]])
    return (
        f"{FOOTER_MARKER}"
        "<div class=\"footer-column\">"
        "<h4>Top Services</h4>"
        f"<div class=\"footer-links\">{services_html}</div>"
        "</div>"
        "<div class=\"footer-column\">"
        "<h4>Top Cities</h4>"
        f"<div class=\"footer-links\">{cities_html}</div>"
        "</div>"
    )


def render_hub_page(title, intro, links, nav_links, footer_links):
    nav_html = render_nav_html(nav_links)
    footer_html = (
        "<footer class=\"footer\"><div class=\"container\">"
        f"<div class=\"footer-grid\">{render_footer_grid(footer_links)}</div>"
        "<div class=\"footer-bottom\">"
        "<p>&copy; 2026 TradeMatch UK. All rights reserved.</p>"
        "<div class=\"footer-legal\">"
        "<a href=\"/terms-and-conditions\">Terms &amp; Conditions</a>"
        "<a href=\"/privacy-policy\">Privacy Policy</a>"
        "</div></div></div></footer>"
    )
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
      <div class=\"hub-links\">{links}</div>
    </div>
  </main>
  {footer_html}
</body>
</html>"""


def generate_hub_pages(services, cities, locations, major_city_slugs, context):
    hub_pages = []

    services_index_links = [
        make_link(
            f"/services/{svc['slug']}/",
            f"{svc['name']} services",
            calculate_link_weight(80, CONTEXT_MULTIPLIERS["contextual"], 1),
            "contextual",
        )
        for svc in services
    ]
    services_index_html = render_hub_page(
        "All TradeMatch Services",
        "Browse service categories and compare trusted professionals.",
        render_link_list(services_index_links),
        build_nav_links(80, services, cities),
        build_footer_links(80, services, cities, True),
    )
    services_index_dir = OUTPUT_DIR / "services"
    services_index_dir.mkdir(parents=True, exist_ok=True)
    (services_index_dir / "index.html").write_text(services_index_html, encoding="utf-8")
    hub_pages.append({"url": "/services/", "outgoing": services_index_links, "page_value": 80, "page_depth": 1})

    locations_index_links = [
        make_link(
            f"/locations/{city['slug']}/",
            f"Tradespeople in {city['name']}",
            calculate_link_weight(80, CONTEXT_MULTIPLIERS["contextual"], 1),
            "contextual",
        )
        for city in cities
    ]
    locations_index_html = render_hub_page(
        "TradeMatch Locations",
        "Explore top UK locations and compare services nearby.",
        render_link_list(locations_index_links),
        build_nav_links(80, services, cities),
        build_footer_links(80, services, cities, True),
    )
    locations_index_dir = OUTPUT_DIR / "locations"
    locations_index_dir.mkdir(parents=True, exist_ok=True)
    (locations_index_dir / "index.html").write_text(locations_index_html, encoding="utf-8")
    hub_pages.append({"url": "/locations/", "outgoing": locations_index_links, "page_value": 80, "page_depth": 1})

    for service in services:
        service_links = []
        for city in cities[:30]:
            service_links.append(
                make_link(
                    f"/services/{service['slug']}/{city['slug']}",
                    f"{service['name']} in {city['name']}",
                    calculate_link_weight(80, CONTEXT_MULTIPLIERS["contextual"], 2),
                    "contextual",
                )
            )
        html = render_hub_page(
            f"{service['name']} Services",
            "Compare verified professionals and request quotes in top UK cities.",
            render_link_list(service_links),
            build_nav_links(80, services, cities),
            build_footer_links(80, services, cities, True),
        )
        hub_dir = OUTPUT_DIR / "services" / service["slug"]
        hub_dir.mkdir(parents=True, exist_ok=True)
        (hub_dir / "index.html").write_text(html, encoding="utf-8")
        hub_pages.append({"url": f"/services/{service['slug']}/", "outgoing": service_links, "page_value": 80, "page_depth": 1})

    for location in locations:
        location_value = page_value_for_location(location, major_city_slugs)
        allow_footer = location_value >= 55
        links = []
        tier = get_location_tier(location, major_city_slugs)
        if tier != "village":
            for svc in services[:6]:
                links.append(
                    make_link(
                        f"/services/{svc['slug']}/{location['slug']}",
                        f"{svc['name']} in {location['name']}",
                        calculate_link_weight(location_value, CONTEXT_MULTIPLIERS["contextual"], page_depth_for_location(location, major_city_slugs)),
                        "contextual",
                    )
                )
            towns = get_nearby_locations(location, context, major_city_slugs, limit=10)
            for town in towns:
                if get_location_tier(town, major_city_slugs) == "village":
                    continue
                links.append(
                    make_link(
                        f"/locations/{town['slug']}/",
                        f"{town['name']} hub",
                        calculate_link_weight(location_value, CONTEXT_MULTIPLIERS["nearby"], 1),
                        "nearby",
                    )
                )

        html = render_hub_page(
            f"Tradespeople in {location['name']}",
            "Explore popular services and compare quotes from local professionals.",
            render_link_list(filter_links_by_weight(links)),
            build_nav_links(location_value, services, cities),
            build_footer_links(location_value, services, cities, allow_footer),
        )
        hub_dir = OUTPUT_DIR / "locations" / location["slug"]
        hub_dir.mkdir(parents=True, exist_ok=True)
        (hub_dir / "index.html").write_text(html, encoding="utf-8")
        hub_pages.append({"url": f"/locations/{location['slug']}/", "outgoing": filter_links_by_weight(links), "page_value": location_value, "page_depth": 1})

    return hub_pages


def inject_css(html):
    if CSS_MARKER in html:
        return html
    css_block = f"\n        {CSS_MARKER}\n        .site-nav {{\n            position: sticky;\n            top: 0;\n            z-index: 20;\n            background: rgba(26, 35, 50, 0.9);\n            backdrop-filter: blur(12px);\n            border-bottom: 1px solid rgba(255, 255, 255, 0.08);\n        }}\n        .nav-inner {{\n            display: flex;\n            align-items: center;\n            justify-content: space-between;\n            padding: 14px 0;\n        }}\n        .nav-logo {{\n            font-weight: 800;\n            color: var(--white);\n            text-decoration: none;\n            letter-spacing: 0.3px;\n        }}\n        .nav-links {{\n            display: flex;\n            align-items: center;\n            gap: 18px;\n        }}\n        .nav-links a,\n        .nav-dropdown summary {{\n            color: var(--white);\n            text-decoration: none;\n            font-weight: 600;\n            font-size: 14px;\n            cursor: pointer;\n        }}\n        .nav-dropdown {{\n            position: relative;\n        }}\n        .nav-dropdown summary {{\n            list-style: none;\n        }}\n        .nav-dropdown summary::-webkit-details-marker {{\n            display: none;\n        }}\n        .dropdown-menu {{\n            position: absolute;\n            top: 36px;\n            left: 0;\n            min-width: 220px;\n            background: #0f172a;\n            border-radius: 12px;\n            padding: 12px;\n            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);\n            display: grid;\n            gap: 8px;\n        }}\n        .dropdown-menu a {{\n            color: var(--gray-100);\n            text-decoration: none;\n            font-size: 14px;\n        }}\n        .breadcrumbs {{\n            margin-bottom: 16px;\n            font-size: 14px;\n            color: var(--gray-600);\n        }}\n        .breadcrumbs a {{\n            color: var(--teal);\n            text-decoration: none;\n            font-weight: 600;\n        }}\n        .contextual-links {{\n            margin: 24px 0;\n            padding: 16px;\n            border-radius: 12px;\n            background: #f7fafc;\n        }}\n        .contextual-link-list {{\n            margin: 12px 0 0;\n            padding-left: 18px;\n            color: var(--gray-600);\n        }}\n        .nearby-areas,\n        .popular-services {{\n            margin: 24px 0;\n            padding: 16px;\n            border-radius: 12px;\n            background: #f9fafb;\n        }}\n        .link-pill-list {{\n            display: flex;\n            flex-wrap: wrap;\n            gap: 10px;\n            margin-top: 12px;\n        }}\n        .link-pill-list a {{\n            background: #ecfeff;\n            color: #0f766e;\n            padding: 6px 12px;\n            border-radius: 999px;\n            text-decoration: none;\n            font-size: 13px;\n            font-weight: 600;\n        }}\n"
    return html.replace("</style>", css_block + "\n    </style>")


def inject_nav(html, nav_html):
    if NAV_MARKER_START in html:
        return html
    return html.replace("<body>", f"<body>\n{nav_html}")


def inject_breadcrumbs_and_context(html, breadcrumbs_html, contextual_html):
    marker = "<div class=\"content-area\">"
    if BREADCRUMB_MARKER_START in html and CONTEXT_MARKER_START in html:
        return html
    if marker in html:
        return html.replace(marker, f"{marker}\n                {breadcrumbs_html}\n                {contextual_html}")
    return html


def inject_nearby_and_popular(html, nearby_html, popular_html):
    marker = "</div>\n            \n            <aside>"
    if NEARBY_MARKER_START in html and POPULAR_MARKER_START in html:
        return html
    if marker in html:
        return html.replace(marker, f"{nearby_html}\n                {popular_html}\n            {marker}")
    return html


def render_seo_automation_html():
    return (
        f"{SEO_AUTOMATION_MARKER_START}"
        "<section class=\"seo-automation-spec\">"
        "<h3>SEO Optimisation Engine (Internal Spec)</h3>"
        "<p>You are a principal SEO platform engineer working on TradeMatch, a UK marketplace with ~175,950 programmatically generated pages (service × location × content).</p>"
        "<p>Your task is to build an automated SEO optimisation engine that (1) adjusts internal links based on Google Search Console performance data, (2) redistributes internal PageRank using CTR-weighted logic, and (3) automatically noindexes pages that harm site-wide SEO performance.</p>"
        "<p>All logic must be Google-safe, deterministic, explainable, and reversible.</p>"
        "<h4>Mandatory deliverables (non-negotiable)</h4>"
        "<ul>"
        "<li><strong>Unique content blocks per page</strong>: every generated page must include at least 2–3 distinct, non-templated paragraphs derived from trade + location + intent. No placeholder copy.</li>"
        "<li><strong>Clean URL structure</strong>: /trades/{trade}/{location}, /jobs/{job-id}, /tradespeople/{vendor-name}.</li>"
        "<li><strong>XML sitemap coverage</strong>: include jobs, locations, trades. Auto-split into multiple sitemaps if &gt; 50,000 URLs.</li>"
        "<li><strong>HTML sitemap</strong>: human-readable index of trades, locations, and recent jobs.</li>"
        "<li><strong>Robots.txt configured</strong>: allow public pages, block admin/dashboards/auth routes.</li>"
        "<li><strong>Canonicals</strong>: correct canonical tags on every page; avoid self-conflicts across variants.</li>"
        "<li><strong>Noindex</strong>: admin, dashboards, auth routes always noindex.</li>"
        "<li><strong>Core Web Vitals</strong>: mobile-first; LCP &lt; 2.5s, CLS &lt; 0.1, INP &lt; 200ms.</li>"
        "<li><strong>Schema markup</strong>: LocalBusiness, Review, AggregateRating, FAQ, Service.</li>"
        "</ul>"
        "<h4>Content refresh automation</h4>"
        "<ul>"
        "<li><strong>GSC → content rewrite triggers</strong>: if CTR drops &gt; 20% or avg position worsens by &gt; 5 positions over 28 days, queue a rewrite with updated copy blocks.</li>"
        "<li><strong>AI title/meta regeneration</strong>: low CTR pages (CTR below 25th percentile in the same intent cluster) get new titles and meta descriptions with log of previous versions.</li>"
        "<li><strong>Query clustering → new page generation</strong>: cluster GSC queries by intent and create new landing pages when clusters exceed impressions threshold and have no existing matching page.</li>"
        "</ul>"
        "<h4>System overview</h4>"
        "<p>Create a background optimisation system that runs daily or weekly and: reads Search Console performance exports, scores each page, adjusts internal link weights, modifies meta robots tags when required, and outputs audit logs for SEO review.</p>"
        "<h4>Data inputs</h4>"
        "<ul>"
        "<li><strong>Search Console Export (CSV or API)</strong>: url, impressions, clicks, ctr, average_position, query_count, date_range.</li>"
        "<li><strong>Page Metadata (existing generator output)</strong>: page_type, page_value, page_depth, location_population, service_priority, inbound_link_weight, outbound_link_weight.</li>"
        "</ul>"
        "<h4>Part 1 — Performance scoring engine</h4>"
        "<p>performance_score = (CTR × 40) + (log(impressions) × 25) + ((50 - average_position) × 20) + (query_count × 5) + (page_value × 10). Normalize scores to 0–100.</p>"
        "<ul>"
        "<li>⭐ Authority Boost Pages: score ≥ 70</li>"
        "<li>⚖️ Stable Pages: score 40–69</li>"
        "<li>⚠️ Weak Pages: score 20–39</li>"
        "<li>🧱 Toxic Pages: score &lt; 20</li>"
        "</ul>"
        "<h4>Part 2 — Dynamic link adjustment</h4>"
        "<ul>"
        "<li><strong>Authority Boost Pages</strong>: Increase inbound links by +30%, prioritise links from homepage, service hubs, high-CTR city pages, and elevate link placement (footer → content → above-the-fold).</li>"
        "<li><strong>Stable Pages</strong>: Maintain current link structure with minor anchor variety optimisation.</li>"
        "<li><strong>Weak Pages</strong>: Reduce outbound links by 40%, remove links to other weak pages, only link upward to hubs.</li>"
        "<li><strong>Toxic Pages</strong>: Remove from all lateral linking, only receive 1 inbound link from parent hub, prepare for noindex escalation.</li>"
        "</ul>"
        "<h4>Part 3 — Internal CTR-weighted linking</h4>"
        "<p>ctr_delta = page_ctr - site_average_ctr. Positive delta → link_weight × (1 + ctr_delta). Negative delta → link_weight × (1 - |ctr_delta|). Apply limits: max increase per cycle +20%, max decrease per cycle −30%. Never create or remove more than 10 links per page per cycle.</p>"
        "<h4>Part 4 — Automatic noindex escalation</h4>"
        "<p>Escalation conditions: performance_score &lt; 20, impressions &lt; 50/month, average_position &gt; 50, age &gt; 90 days, no inbound links from authority pages.</p>"
        "<ul>"
        "<li>Stage 0 (Default): index,follow</li>"
        "<li>Stage 1 (Watch): index,follow + reduce links</li>"
        "<li>Stage 2 (Soft Noindex): noindex,follow</li>"
        "<li>Stage 3 (Hard Noindex): noindex,nofollow</li>"
        "</ul>"
        "<p>Rules: Escalate one stage per cycle. Allow recovery if metrics improve. Never noindex service hubs, major city pages, or pages with backlinks. Inject meta tag dynamically: &lt;meta name=\"robots\" content=\"noindex,follow\"&gt;.</p>"
        "<h4>Part 5 — Implementation details</h4>"
        "<ul>"
        "<li>Create new modules: seo_performance_scoring.py, gsc_ingestion.py, link_optimizer.py, noindex_manager.py.</li>"
        "<li>Modify generator/template logic to accept dynamic meta robots values and adjust internal link rendering by weight.</li>"
        "<li>Persist optimisation state: page_id, last_score, escalation_stage, last_modified, recovery_flag.</li>"
        "<li>Add dry-run mode: outputs JSON diff only; no HTML changes.</li>"
        "</ul>"
        "<h4>Part 6 — Safety & governance</h4>"
        "<ul>"
        "<li>Log all changes with timestamps and store previous state for rollback.</li>"
        "<li>Never deindex more than 5% of pages per cycle.</li>"
        "<li>Never remove homepage or hub links; include manual override flags.</li>"
        "</ul>"
        "<h4>Outputs</h4>"
        "<ul>"
        "<li>Optimised HTML pages</li>"
        "<li>Updated internal link maps</li>"
        "<li>Noindex audit report</li>"
        "<li>GSC performance delta report</li>"
        "<li>SEO health dashboard JSON</li>"
        "</ul>"
        "<h4>Documentation</h4>"
        "<p>Generate README-SEO-AUTOMATION.md, flow diagrams (ASCII), and clear comments explaining why decisions are made.</p>"
        "<p>Proceed cautiously, deterministically, and with SEO-first thinking.</p>"
        "</section>"
        f"{SEO_AUTOMATION_MARKER_END}"
    )


def inject_seo_automation(html):
    if SEO_AUTOMATION_MARKER_START in html:
        return html
    seo_html = render_seo_automation_html()
    if CONTEXT_MARKER_END in html:
        return html.replace(CONTEXT_MARKER_END, f"{CONTEXT_MARKER_END}\n                {seo_html}")
    marker = "<div class=\"content-area\">"
    if marker in html:
        return html.replace(marker, f"{marker}\n                {seo_html}")
    return html


def replace_footer_links(html, footer_grid_html):
    pattern = r"(<div class=\"footer-grid\">)([\s\S]*?)(</div>\s*\n\s*<div class=\"footer-bottom\">)"
    match = re.search(pattern, html)
    if not match:
        return html
    replacement = f"{match.group(1)}\n            {footer_grid_html}\n        {match.group(3)}"
    return re.sub(pattern, replacement, html, count=1)


def patch_services_grid(html, services_grid_map, allow_links):
    def replacer(match):
        href = match.group(1)
        rest = match.group(2)
        if not allow_links:
            return f"<div class=\"service-card\" data-link-weight=\"0\">{rest}</div>"
        link = services_grid_map.get(href)
        if not link:
            return f"<div class=\"service-card\" data-link-weight=\"0\">{rest}</div>"
        weight_attr = f" data-link-weight=\"{link['weight']:.2f}\""
        return f"<a class=\"service-card\" href=\"{href}\"{weight_attr}>{rest}</a>"

    pattern = r"<a class=\"service-card\" href=\"([^\"]+)\">([\s\S]*?)</a>"
    return re.sub(pattern, replacer, html)


def patch_cities_grid(html, city_links):
    pattern = r"(<div class=\"cities-grid\">)([\s\S]*?)(</div>)"
    match = re.search(pattern, html)
    if not match:
        return html
    new_block = f"{match.group(1)}\n            {render_link_list(city_links)}\n        {match.group(3)}"
    return re.sub(pattern, new_block, html, count=1)


def patch_page(path, service, location, context, services, cities, major_city_slugs, debug_state):
    html = path.read_text(encoding="utf-8")

    source_value = page_value_for_location(location, major_city_slugs)
    tier = get_location_tier(location, major_city_slugs)
    allow_footer = source_value >= 55
    allow_services_grid = source_value >= 55

    nav_links = build_nav_links(source_value, services, cities)
    breadcrumb_links = build_breadcrumb_links(source_value, service, location)
    contextual_links = build_contextual_links(source_value, service, location, context, services, major_city_slugs)
    nearby_links = build_nearby_links(source_value, service, location, context, major_city_slugs)
    popular_links = build_popular_service_links(source_value, location, services, major_city_slugs)
    footer_links = build_footer_links(source_value, services, cities, allow_footer)
    cities_grid_links = build_city_grid_links(source_value, service, cities) if tier != "village" else []

    services_grid_map = build_services_grid_weights(source_value, location, services, major_city_slugs)

    services_grid_links = []
    if allow_services_grid:
        for slug in SERVICE_GRID_SLUGS:
            url = f"/services/{slug}/{location['slug']}"
            link = services_grid_map.get(url)
            if link:
                services_grid_links.append(link)

    sections = {
        "breadcrumbs": breadcrumb_links,
        "nav": nav_links,
        "contextual": contextual_links,
        "nearby": nearby_links,
        "popular": popular_links,
        "services_grid": services_grid_links,
        "cities_grid": cities_grid_links,
        "footer": footer_links,
    }
    sections = enforce_link_budget(sections)

    allowed_services_grid = {link["url"] for link in sections["services_grid"]}
    services_grid_map = {url: link for url, link in services_grid_map.items() if url in allowed_services_grid}

    html = inject_css(html)
    html = inject_nav(html, render_nav_html(sections["nav"]))
    html = inject_breadcrumbs_and_context(
        html,
        render_breadcrumbs_html(sections["breadcrumbs"], location["name"]),
        render_contextual_html(sections["contextual"]),
    )
    html = inject_seo_automation(html)
    html = inject_nearby_and_popular(
        html,
        render_nearby_html(sections["nearby"], service["name"]),
        render_popular_html(sections["popular"], location["name"]),
    )
    html = replace_footer_links(html, render_footer_grid(sections["footer"]))
    html = patch_services_grid(html, services_grid_map, allow_services_grid)
    html = patch_cities_grid(html, sections["cities_grid"])

    path.write_text(html, encoding="utf-8")

    page_url = f"/services/{service['slug']}/{location['slug']}"
    outgoing = []
    for key in ("breadcrumbs", "nav", "contextual", "nearby", "popular", "services_grid", "cities_grid", "footer"):
        outgoing.extend(sections.get(key, []))
    debug_state["pages"][page_url] = {
        "page_value": source_value,
        "page_depth": page_depth_for_location(location, major_city_slugs),
        "outgoing": outgoing,
    }


def compile_inbound_counts(debug_state):
    inbound = {url: 0 for url in debug_state["pages"].keys()}
    for data in debug_state["pages"].values():
        for link in data.get("outgoing", []):
            inbound.setdefault(link["url"], 0)
            inbound[link["url"]] += 1
    debug_state["inbound_counts"] = inbound
    debug_state["orphans"] = [url for url, count in inbound.items() if count == 0]


def main():
    generator = load_generator_module()
    services = generator.SERVICES
    cities = generator.UK_CITIES
    base_url = getattr(generator, "BASE_URL", "https://www.tradematch.uk")

    locations = load_locations()
    context = build_link_context(locations)
    major_city_slugs = {city["slug"] for city in cities}

    debug_state = {
        "base_url": base_url,
        "pages": {},
    }

    total = 0
    for service in services:
        service_dir = OUTPUT_DIR / "services" / service["slug"]
        if not service_dir.exists():
            continue
        for file_path in service_dir.glob("*.html"):
            location_slug = file_path.stem
            location = context["locations_by_slug"].get(location_slug)
            if not location:
                continue
            patch_page(file_path, service, location, context, services, cities, major_city_slugs, debug_state)
            total += 1
            if total % 5000 == 0:
                print(f"Patched {total} pages...")

    hub_pages = generate_hub_pages(services, cities, locations, major_city_slugs, context)
    for hub in hub_pages:
        debug_state["pages"][hub["url"]] = {
            "page_value": hub["page_value"],
            "page_depth": hub["page_depth"],
            "outgoing": hub["outgoing"],
        }

    compile_inbound_counts(debug_state)
    DEBUG_PATH.write_text(json.dumps(debug_state, indent=2), encoding="utf-8")

    print(f"✅ Patched {total} pages")
    print(f"✅ Debug output: {DEBUG_PATH}")


if __name__ == "__main__":
    main()
