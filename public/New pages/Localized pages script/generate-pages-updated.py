#!/usr/bin/env python3
"""
TradeMatch SEO Page Generator - Updated for New Template
Generates 165,696 SEO-optimized pages (48 services × 3,452 locations)
"""

import os
import csv
import json
import random
from pathlib import Path
from datetime import datetime

# ============================================
# CONFIGURATION
# ============================================
BASE_URL = "https://www.tradematch.uk"
SITEMAP_URL_LIMIT = 50000
BASE_DIR = Path(__file__).resolve().parent
OUTPUT_DIR = BASE_DIR / "generated-pages"
TEMPLATE_FILE = BASE_DIR / "city-trade-seo-page.html"
LOCATIONS_CSV = BASE_DIR / "uk-locations.csv"

# ============================================
# SERVICES DATA (48 services matching your list)
# ============================================
SERVICES = [
    # Core Trades
    {"name": "Plumbing", "slug": "plumbing", "category": "Core Trades", "icon": "🚰"},
    {"name": "Electrical", "slug": "electrical", "category": "Core Trades", "icon": "⚡"},
    {"name": "Building", "slug": "building", "category": "Construction", "icon": "🏗️"},
    {"name": "Carpentry", "slug": "carpentry", "category": "Core Trades", "icon": "🔨"},
    {"name": "Painting & Decorating", "slug": "painting-decorating", "category": "Finishing", "icon": "🎨"},
    
    # Home Improvements
    {"name": "Bathroom Fitting", "slug": "bathroom-fitting", "category": "Home Improvement", "icon": "🛁"},
    {"name": "Kitchen Fitting", "slug": "kitchen-fitting", "category": "Home Improvement", "icon": "🍳"},
    {"name": "Carpets & Lino", "slug": "carpets-lino", "category": "Flooring", "icon": "📐"},
    {"name": "Hard Flooring", "slug": "hard-flooring", "category": "Flooring", "icon": "📐"},
    {"name": "Tiling", "slug": "tiling", "category": "Finishing", "icon": "⬜"},
    
    # Heating & Energy
    {"name": "Central Heating", "slug": "central-heating", "category": "Heating", "icon": "♨️"},
    {"name": "Gas Work", "slug": "gas-work", "category": "Heating", "icon": "♨️"},
    {"name": "Insulation", "slug": "insulation", "category": "Energy", "icon": "🏠"},
    
    # Construction
    {"name": "Bricklaying", "slug": "bricklaying", "category": "Construction", "icon": "🧱"},
    {"name": "Extensions", "slug": "extensions", "category": "Construction", "icon": "🏗️"},
    {"name": "Loft Conversion", "slug": "loft-conversion", "category": "Construction", "icon": "🏠"},
    {"name": "Conversions - General", "slug": "conversions-general", "category": "Construction", "icon": "🏗️"},
    {"name": "New Builds", "slug": "new-builds", "category": "Construction", "icon": "🏗️"},
    {"name": "Groundwork & Foundations", "slug": "groundwork-foundations", "category": "Construction", "icon": "🏗️"},
    {"name": "Demolition", "slug": "demolition", "category": "Construction", "icon": "🏗️"},
    
    # Roofing
    {"name": "Roofing (Flat)", "slug": "roofing-flat", "category": "Roofing", "icon": "🏠"},
    {"name": "Roofing (Pitched)", "slug": "roofing-pitched", "category": "Roofing", "icon": "🏠"},
    {"name": "Fascias & Soffits", "slug": "fascias-soffits", "category": "Roofing", "icon": "🏠"},
    {"name": "Guttering", "slug": "guttering", "category": "Roofing", "icon": "🏠"},
    
    # Outdoor
    {"name": "Landscaping", "slug": "landscaping", "category": "Outdoor", "icon": "🌳"},
    {"name": "Garden Maintenance", "slug": "garden-maintenance", "category": "Outdoor", "icon": "🌳"},
    {"name": "Fencing", "slug": "fencing", "category": "Outdoor", "icon": "🌲"},
    {"name": "Decking", "slug": "decking", "category": "Outdoor", "icon": "🌳"},
    {"name": "Driveways (Paved & Loose)", "slug": "driveways-paved", "category": "Outdoor", "icon": "🚗"},
    {"name": "Driveways (Tarmac Surface)", "slug": "driveways-tarmac", "category": "Outdoor", "icon": "🚗"},
    {"name": "Tree Surgery", "slug": "tree-surgery", "category": "Outdoor", "icon": "🌳"},
    
    # Specialist
    {"name": "Plastering", "slug": "plastering", "category": "Finishing", "icon": "🧱"},
    {"name": "Repointing", "slug": "repointing", "category": "Masonry", "icon": "🧱"},
    {"name": "Stonemasonry", "slug": "stonemasonry", "category": "Masonry", "icon": "🧱"},
    {"name": "Damp Proofing", "slug": "damp-proofing", "category": "Property Care", "icon": "🏠"},
    {"name": "Restoration & Refurbishment", "slug": "restoration-refurbishment", "category": "Property Care", "icon": "🏗️"},
    
    # Windows & Doors
    {"name": "Windows & Doors (uPVC & Metal)", "slug": "windows-doors-upvc", "category": "Windows & Doors", "icon": "🪟"},
    {"name": "Windows & Doors (Wooden)", "slug": "windows-doors-wooden", "category": "Windows & Doors", "icon": "🪟"},
    
    # Services & Maintenance
    {"name": "Handyman", "slug": "handyman", "category": "General Services", "icon": "🔧"},
    {"name": "Cleaning Services", "slug": "cleaning-services", "category": "General Services", "icon": "🧹"},
    {"name": "Waste Clearance", "slug": "waste-clearance", "category": "General Services", "icon": "♻️"},
    {"name": "Moving Services", "slug": "moving-services", "category": "General Services", "icon": "📦"},
    {"name": "Locksmiths", "slug": "locksmiths", "category": "Security", "icon": "🔐"},
    {"name": "Security Systems", "slug": "security-systems", "category": "Security", "icon": "🔒"},
    
    # Specialist Trades
    {"name": "Joinery & Cabinet Making", "slug": "joinery-cabinet-making", "category": "Specialist", "icon": "🔨"},
    {"name": "Fireplaces & Flues", "slug": "fireplaces-flues", "category": "Specialist", "icon": "🔥"},
    {"name": "Conservatories", "slug": "conservatories", "category": "Construction", "icon": "🏡"},
    {"name": "Architecture", "slug": "architecture", "category": "Design", "icon": "📐"},
    {"name": "CAD / Drawings", "slug": "cad-drawings", "category": "Design", "icon": "📐"},
]

# ============================================
# VENDOR NAMES POOL (for realistic fake data)
# ============================================
VENDOR_FIRST_NAMES = [
    "Mike", "Sarah", "David", "Emma", "James", "Lisa", "Tom", "Kate",
    "John", "Rachel", "Paul", "Sophie", "Chris", "Amy", "Mark", "Laura",
    "Dan", "Helen", "Steve", "Claire", "Rob", "Lucy", "Ben", "Anna"
]

VENDOR_LAST_NAMES = [
    "Johnson", "Smith", "Williams", "Brown", "Jones", "Miller", "Davis",
    "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White",
    "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson"
]

VENDOR_COMPANY_SUFFIXES = [
    "Services", "Solutions", "Contractors", "Professionals", "Experts",
    "Specialists", "Ltd", "& Sons", "Brothers", "Enterprises"
]

SPECIALISMS = [
    "emergency repairs and same-day service",
    "high-quality installations and refurbishments",
    "commercial and residential projects",
    "eco-friendly and sustainable solutions",
    "restoration and period property work",
    "modern installations and smart systems",
    "emergency callouts and maintenance",
    "bespoke design and custom builds",
    "renovation and upgrade projects",
    "insurance work and repairs"
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def load_locations():
    """Load locations from CSV file"""
    locations = []
    if not LOCATIONS_CSV.exists():
        print(f"❌ Error: {LOCATIONS_CSV} not found!")
        print("Please ensure uk-locations.csv is in the same directory.")
        exit(1)
    
    with open(LOCATIONS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            locations.append({
                'name': row['name'],
                'slug': row['slug'],
                'county': row.get('county', row['city']),
                'postcode_area': row.get('postcode_area', ''),
            })
    
    print(f"✅ Loaded {len(locations)} locations from CSV")
    return locations


def generate_vendor_name():
    """Generate a realistic vendor name"""
    first = random.choice(VENDOR_FIRST_NAMES)
    last = random.choice(VENDOR_LAST_NAMES)
    return f"{first} {last}"


def generate_company_name(trade_name):
    """Generate a realistic company name"""
    styles = [
        f"{random.choice(VENDOR_LAST_NAMES)} {trade_name}",
        f"{random.choice(VENDOR_FIRST_NAMES)}'s {trade_name}",
        f"{trade_name} {random.choice(VENDOR_COMPANY_SUFFIXES)}",
        f"Local {trade_name} Services",
    ]
    return random.choice(styles)


def get_initials(name):
    """Get initials from a name"""
    parts = name.split()
    if len(parts) >= 2:
        return f"{parts[0][0]}{parts[1][0]}"
    return parts[0][:2].upper()


def generate_postcode(location_slug):
    """Generate a realistic postcode area"""
    if location_slug == "london":
        return "SW1-SW20, SE1-SE28, N1-N22, E1-E18, W1-W14, NW1-NW11"
    # Generate based on first letters
    prefix = location_slug[:2].upper()
    return f"{prefix}1-{prefix}99"


def replace_template_variables(html_content, service, location, vendors):
    """Replace all template variables with actual data"""
    
    # Service variables
    replacements = {
        '{TRADE}': service['name'],
        '{TRADE_SLUG}': service['slug'],
        '{LOCATION}': location['name'],
        '{LOCATION_SLUG}': location['slug'],
        '{POSTCODE}': generate_postcode(location['slug']),
        
        # Vendor 1
        '{VENDOR_1_NAME}': vendors[0]['name'],
        '{VENDOR_1_INITIALS}': vendors[0]['initials'],
        '{VENDOR_1_YEARS}': str(vendors[0]['years']),
        '{VENDOR_1_SPECIALISM}': vendors[0]['specialism'],
        
        # Vendor 2
        '{VENDOR_2_NAME}': vendors[1]['name'],
        '{VENDOR_2_INITIALS}': vendors[1]['initials'],
        '{VENDOR_2_YEARS}': str(vendors[1]['years']),
        '{VENDOR_2_SPECIALISM}': vendors[1]['specialism'],
        
        # Vendor 3
        '{VENDOR_3_NAME}': vendors[2]['name'],
        '{VENDOR_3_INITIALS}': vendors[2]['initials'],
        '{VENDOR_3_YEARS}': str(vendors[2]['years']),
        '{VENDOR_3_SPECIALISM}': vendors[2]['specialism'],
    }
    
    # Replace all variables
    for placeholder, value in replacements.items():
        html_content = html_content.replace(placeholder, value)
    
    return html_content


def generate_vendors(service_name):
    """Generate 3 realistic vendor profiles"""
    vendors = []
    for _ in range(3):
        name = generate_vendor_name()
        vendors.append({
            'name': name,
            'initials': get_initials(name),
            'years': random.randint(8, 25),
            'specialism': random.choice(SPECIALISMS),
        })
    return vendors


def generate_page(template_content, service, location):
    """Generate a single page"""
    vendors = generate_vendors(service['name'])
    html_content = replace_template_variables(template_content, service, location, vendors)
    
    # Create output directory
    service_dir = OUTPUT_DIR / "services" / service['slug']
    service_dir.mkdir(parents=True, exist_ok=True)
    
    # Write file
    output_file = service_dir / f"{location['slug']}.html"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return output_file


def generate_sitemap(services, locations):
    """Generate XML sitemap"""
    sitemap_dir = OUTPUT_DIR / "sitemaps"
    sitemap_dir.mkdir(parents=True, exist_ok=True)
    
    # Calculate total pages and split into multiple sitemaps if needed
    total_pages = len(services) * len(locations)
    num_sitemaps = (total_pages // SITEMAP_URL_LIMIT) + 1
    
    print(f"\n📄 Generating {num_sitemaps} sitemap(s)...")
    
    sitemap_files = []
    url_count = 0
    sitemap_count = 1
    
    # Open first sitemap
    current_sitemap = sitemap_dir / f"sitemap-{sitemap_count}.xml"
    sitemap_files.append(current_sitemap)
    f = open(current_sitemap, 'w', encoding='utf-8')
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
    f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    
    for service in services:
        for location in locations:
            url = f"{BASE_URL}/services/{service['slug']}/{location['slug']}"
            f.write('  <url>\n')
            f.write(f'    <loc>{url}</loc>\n')
            f.write('    <changefreq>weekly</changefreq>\n')
            f.write('    <priority>0.8</priority>\n')
            f.write('  </url>\n')
            
            url_count += 1
            
            # Start new sitemap if limit reached
            if url_count >= SITEMAP_URL_LIMIT and sitemap_count < num_sitemaps:
                f.write('</urlset>')
                f.close()
                
                sitemap_count += 1
                url_count = 0
                current_sitemap = sitemap_dir / f"sitemap-{sitemap_count}.xml"
                sitemap_files.append(current_sitemap)
                f = open(current_sitemap, 'w', encoding='utf-8')
                f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
                f.write('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    
    f.write('</urlset>')
    f.close()
    
    # Create sitemap index if multiple sitemaps
    if num_sitemaps > 1:
        index_file = sitemap_dir / "sitemap-index.xml"
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
            f.write('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
            for sitemap_file in sitemap_files:
                f.write('  <sitemap>\n')
                f.write(f'    <loc>{BASE_URL}/sitemaps/{sitemap_file.name}</loc>\n')
                f.write(f'    <lastmod>{datetime.now().strftime("%Y-%m-%d")}</lastmod>\n')
                f.write('  </sitemap>\n')
            f.write('</sitemapindex>')
        print(f"✅ Created sitemap index: {index_file}")
    
    return sitemap_files


def save_page_data(services, locations):
    """Save page data as JSON for reference"""
    data = {
        "generated_at": datetime.now().isoformat(),
        "total_pages": len(services) * len(locations),
        "services_count": len(services),
        "locations_count": len(locations),
        "services": services,
        "locations": locations,
    }
    
    json_file = OUTPUT_DIR / "page-data.json"
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Saved page data: {json_file}")


# ============================================
# MAIN EXECUTION
# ============================================

def main():
    print("=" * 60)
    print("  TradeMatch SEO Page Generator")
    print("=" * 60)
    print()
    
    # Check template exists
    if not TEMPLATE_FILE.exists():
        print(f"❌ Error: Template file not found: {TEMPLATE_FILE}")
        print("Please ensure city-trade-seo-page.html is in the same directory.")
        return
    
    # Load template
    print(f"📄 Loading template: {TEMPLATE_FILE.name}")
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template_content = f.read()
    
    # Load locations
    locations = load_locations()
    
    # Calculate totals
    total_pages = len(SERVICES) * len(locations)
    print()
    print(f"📊 Generation Plan:")
    print(f"   Services: {len(SERVICES)}")
    print(f"   Locations: {len(locations)}")
    print(f"   Total Pages: {total_pages:,}")
    print(f"   Output Dir: {OUTPUT_DIR}")
    print()
    
    # Confirm
    response = input("🚀 Ready to generate pages? (y/n): ").strip().lower()
    if response != 'y':
        print("❌ Generation cancelled.")
        return
    
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Copy hero background image
    hero_image = BASE_DIR / "hero-background.webp"
    if hero_image.exists():
        import shutil
        shutil.copy(hero_image, OUTPUT_DIR / "hero-background.webp")
        print("✅ Copied hero background image")
    
    # Generate pages
    print("\n" + "=" * 60)
    print("  Generating Pages...")
    print("=" * 60)
    print()
    
    generated_count = 0
    for service_idx, service in enumerate(SERVICES, 1):
        print(f"[{service_idx}/{len(SERVICES)}] Generating {service['name']} pages...", end='', flush=True)
        
        for location in locations:
            generate_page(template_content, service, location)
            generated_count += 1
        
        print(f" ✅ {len(locations)} pages")
    
    print()
    print(f"✅ Generated {generated_count:,} pages successfully!")
    
    # Generate sitemap
    print("\n" + "=" * 60)
    print("  Generating Sitemaps...")
    print("=" * 60)
    sitemap_files = generate_sitemap(SERVICES, locations)
    print(f"✅ Created {len(sitemap_files)} sitemap file(s)")
    
    # Save page data
    save_page_data(SERVICES, locations)
    
    # Summary
    print("\n" + "=" * 60)
    print("  ✅ GENERATION COMPLETE!")
    print("=" * 60)
    print()
    print(f"📁 Output Directory: {OUTPUT_DIR}")
    print(f"📄 Total Pages: {generated_count:,}")
    print(f"🗺️  Sitemaps: {len(sitemap_files)}")
    print()
    print("📋 Next Steps:")
    print("   1. Copy hero-background.webp to your web server")
    print("   2. Upload generated-pages/ to your hosting")
    print("   3. Submit sitemaps to Google Search Console")
    print("   4. Test a few pages to verify rendering")
    print()
    print("🎉 Happy optimizing!")
    print()


if __name__ == "__main__":
    main()
