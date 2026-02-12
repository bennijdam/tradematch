#!/usr/bin/env python3
"""
TradeMatch Database Injection Script for Next.js + Neon Stack
Transforms 165,696 pages into structured database records

Features:
- Batch processing (5,000 rows at a time)
- Efficient bulk insertion using execute_values
- Error handling with logging
- Progress tracking with tqdm
- SEO-optimized content generation
- JSONB support for flexible data
"""

import os
import csv
import json
import hashlib
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from tqdm import tqdm
import re

# ============================================
# CONFIGURATION
# ============================================
BASE_DIR = Path(__file__).resolve().parent
LOCATIONS_CSV = BASE_DIR / "uk-locations.csv"
ERROR_LOG = BASE_DIR / "injection_errors.log"
BATCH_SIZE = 5000  # Process 5,000 records at a time

# Neon Database Connection (use environment variable)
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@host/dbname')

# ============================================
# SERVICE DEFINITIONS (All 48 services)
# ============================================
SERVICES = [
    {"name": "Plumbing", "slug": "plumbing", "category": "Plumber", "qualification": "Gas Safe (for gas work)", "avg_cost": "£40-£80/hour", "emergency": True},
    {"name": "Electrical", "slug": "electrical", "category": "Electrician", "qualification": "Part P, NICEIC", "avg_cost": "£40-£80/hour", "emergency": True},
    {"name": "Building", "slug": "building", "category": "Builder", "qualification": "CSCS Card", "avg_cost": "£150-£250/day", "emergency": False},
    {"name": "Carpentry", "slug": "carpentry", "category": "Carpenter", "qualification": "City & Guilds", "avg_cost": "£150-£200/day", "emergency": False},
    {"name": "Painting & Decorating", "slug": "painting-decorating", "category": "Painter", "qualification": None, "avg_cost": "£100-£180/day", "emergency": False},
    {"name": "Bathroom Fitting", "slug": "bathroom-fitting", "category": "Bathroom Fitter", "qualification": "Plumbing certs", "avg_cost": "£4,000-£12,000", "emergency": False},
    {"name": "Kitchen Fitting", "slug": "kitchen-fitting", "category": "Kitchen Fitter", "qualification": "Joinery quals", "avg_cost": "£3,000-£15,000", "emergency": False},
    {"name": "Carpets & Lino", "slug": "carpets-lino", "category": "Carpet Fitter", "qualification": None, "avg_cost": "£30-£60/sq meter", "emergency": False},
    {"name": "Hard Flooring", "slug": "hard-flooring", "category": "Flooring Specialist", "qualification": None, "avg_cost": "£40-£120/sq meter", "emergency": False},
    {"name": "Tiling", "slug": "tiling", "category": "Tiler", "qualification": None, "avg_cost": "£25-£50/sq meter", "emergency": False},
    {"name": "Central Heating", "slug": "central-heating", "category": "Heating Engineer", "qualification": "Gas Safe", "avg_cost": "£2,000-£5,000", "emergency": True},
    {"name": "Gas Work", "slug": "gas-work", "category": "Gas Safe Engineer", "qualification": "Gas Safe", "avg_cost": "£60-£100/hour", "emergency": True},
    {"name": "Insulation", "slug": "insulation", "category": "Insulation Specialist", "qualification": None, "avg_cost": "£15-£40/sq meter", "emergency": False},
    {"name": "Bricklaying", "slug": "bricklaying", "category": "Bricklayer", "qualification": "CSCS Card", "avg_cost": "£150-£250/day", "emergency": False},
    {"name": "Extensions", "slug": "extensions", "category": "Extension Specialist", "qualification": "Building regs", "avg_cost": "£1,200-£2,000/sq meter", "emergency": False},
    {"name": "Loft Conversion", "slug": "loft-conversion", "category": "Loft Conversion Specialist", "qualification": "Building regs", "avg_cost": "£20,000-£50,000", "emergency": False},
    {"name": "Conversions - General", "slug": "conversions-general", "category": "Conversion Specialist", "qualification": "Building regs", "avg_cost": "£15,000-£60,000", "emergency": False},
    {"name": "New Builds", "slug": "new-builds", "category": "Builder", "qualification": "NHBC", "avg_cost": "£1,500-£2,500/sq meter", "emergency": False},
    {"name": "Groundwork & Foundations", "slug": "groundwork-foundations", "category": "Groundwork Specialist", "qualification": "CSCS", "avg_cost": "£80-£150/sq meter", "emergency": False},
    {"name": "Demolition", "slug": "demolition", "category": "Demolition Contractor", "qualification": "CSCS", "avg_cost": "£3,000-£15,000", "emergency": False},
    {"name": "Roofing (Flat)", "slug": "roofing-flat", "category": "Flat Roofer", "qualification": None, "avg_cost": "£40-£100/sq meter", "emergency": True},
    {"name": "Roofing (Pitched)", "slug": "roofing-pitched", "category": "Pitched Roofer", "qualification": None, "avg_cost": "£80-£180/sq meter", "emergency": True},
    {"name": "Fascias & Soffits", "slug": "fascias-soffits", "category": "Roofing Specialist", "qualification": None, "avg_cost": "£30-£60/meter", "emergency": False},
    {"name": "Guttering", "slug": "guttering", "category": "Guttering Specialist", "qualification": None, "avg_cost": "£25-£50/meter", "emergency": False},
    {"name": "Landscaping", "slug": "landscaping", "category": "Landscaper", "qualification": None, "avg_cost": "£100-£200/day", "emergency": False},
    {"name": "Garden Maintenance", "slug": "garden-maintenance", "category": "Gardener", "qualification": None, "avg_cost": "£15-£30/hour", "emergency": False},
    {"name": "Fencing", "slug": "fencing", "category": "Fencing Contractor", "qualification": None, "avg_cost": "£40-£100/meter", "emergency": False},
    {"name": "Decking", "slug": "decking", "category": "Decking Specialist", "qualification": None, "avg_cost": "£80-£150/sq meter", "emergency": False},
    {"name": "Driveways (Paved & Loose)", "slug": "driveways-paved", "category": "Driveway Specialist", "qualification": None, "avg_cost": "£40-£120/sq meter", "emergency": False},
    {"name": "Driveways (Tarmac Surface)", "slug": "driveways-tarmac", "category": "Tarmac Specialist", "qualification": None, "avg_cost": "£30-£80/sq meter", "emergency": False},
    {"name": "Tree Surgery", "slug": "tree-surgery", "category": "Tree Surgeon", "qualification": "NPTC", "avg_cost": "£300-£1,500/tree", "emergency": True},
    {"name": "Plastering", "slug": "plastering", "category": "Plasterer", "qualification": None, "avg_cost": "£15-£40/sq meter", "emergency": False},
    {"name": "Repointing", "slug": "repointing", "category": "Repointing Specialist", "qualification": None, "avg_cost": "£30-£60/sq meter", "emergency": False},
    {"name": "Stonemasonry", "slug": "stonemasonry", "category": "Stonemason", "qualification": None, "avg_cost": "£150-£250/day", "emergency": False},
    {"name": "Damp Proofing", "slug": "damp-proofing", "category": "Damp Specialist", "qualification": None, "avg_cost": "£500-£3,000", "emergency": False},
    {"name": "Restoration & Refurbishment", "slug": "restoration-refurbishment", "category": "Restoration Specialist", "qualification": None, "avg_cost": "£150-£300/day", "emergency": False},
    {"name": "Joinery & Cabinet Making", "slug": "joinery-cabinet-making", "category": "Joiner", "qualification": "City & Guilds", "avg_cost": "£150-£250/day", "emergency": False},
    {"name": "Windows & Doors (uPVC & Metal)", "slug": "windows-doors-upvc", "category": "Window Fitter", "qualification": "FENSA", "avg_cost": "£300-£1,200/window", "emergency": False},
    {"name": "Windows & Doors (Wooden)", "slug": "windows-doors-wooden", "category": "Carpenter", "qualification": None, "avg_cost": "£400-£1,500/window", "emergency": False},
    {"name": "Handyman", "slug": "handyman", "category": "Handyman", "qualification": None, "avg_cost": "£20-£40/hour", "emergency": False},
    {"name": "Cleaning Services", "slug": "cleaning-services", "category": "Cleaner", "qualification": None, "avg_cost": "£12-£25/hour", "emergency": False},
    {"name": "Waste Clearance", "slug": "waste-clearance", "category": "Waste Removal", "qualification": "Waste carrier license", "avg_cost": "£80-£400/load", "emergency": False},
    {"name": "Moving Services", "slug": "moving-services", "category": "Removal Company", "qualification": "BAR", "avg_cost": "£300-£1,500", "emergency": False},
    {"name": "Locksmiths", "slug": "locksmiths", "category": "Locksmith", "qualification": None, "avg_cost": "£65-£150", "emergency": True},
    {"name": "Security Systems", "slug": "security-systems", "category": "Security Installer", "qualification": "NSI/SSAIB", "avg_cost": "£500-£2,000", "emergency": False},
    {"name": "Fireplaces & Flues", "slug": "fireplaces-flues", "category": "Fireplace Specialist", "qualification": "HETAS", "avg_cost": "£500-£3,000", "emergency": False},
    {"name": "Conservatories", "slug": "conservatories", "category": "Conservatory Installer", "qualification": None, "avg_cost": "£8,000-£30,000", "emergency": False},
    {"name": "Architecture / CAD / Drawings", "slug": "architecture-cad-drawings", "category": "Architect", "qualification": "ARB", "avg_cost": "£1,500-£5,000", "emergency": False},
]

# ============================================
# HELPER FUNCTIONS
# ============================================

def sanitize_slug(text: str) -> str:
    """Convert text to SEO-friendly slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


def load_locations() -> List[Dict]:
    """Load UK locations from CSV"""
    locations = []
    with open(LOCATIONS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            locations.append(row)
    return locations


def generate_dynamic_stats(service_slug: str, location_slug: str) -> Dict:
    """Generate consistent dynamic values using hash"""
    import random
    hash_input = f"{service_slug}{location_slug}".encode()
    hash_val = int(hashlib.md5(hash_input).hexdigest(), 16)
    random.seed(hash_val)
    
    stats = {
        "pros_count": random.randint(12, 127),
        "review_count": random.randint(45, 485),
        "completed_jobs": random.randint(85, 650),
        "avg_response_hours": round(random.uniform(2.5, 5.5), 1),
    }
    
    random.seed()  # Reset
    return stats


def generate_content_body(service: Dict, location: Dict, stats: Dict) -> Dict:
    """Generate JSONB content body with flexible structured data"""
    service_name = service['name']
    location_name = location['name']
    category = service['category']
    
    # Build introduction paragraph
    intro_emergency = "offering 24/7 emergency callouts" if service['emergency'] else "available for scheduled work"
    intro = f"Find trusted {category.lower()}s in {location_name} through TradeMatch. We connect you with {stats['pros_count']}+ verified local professionals {intro_emergency}. All {category.lower()}s are ID checked, insurance verified, and rated by real customers."
    
    # Build benefits list
    benefits = [
        f"Local Experts: {category}s based in or near {location_name}",
        f"Fully Verified: ID checked, insurance verified" + (f", {service['qualification']} certified" if service['qualification'] else ""),
        f"Real Reviews: {stats['review_count']}+ verified customer ratings",
        "Free Quotes: Compare up to 5 quotes with zero obligation",
        f"Fast Response: Average {stats['avg_response_hours']}hrs to first quote"
    ]
    
    if service['emergency']:
        benefits.append(f"Emergency Available: 24/7 callouts for urgent {service_name.lower()}")
    
    # Build common services for this category
    common_services = {
        "Plumber": ["Leak Repairs", "Boiler Service", "Bathroom Installation", "Emergency Callouts"],
        "Electrician": ["Rewiring", "Fuse Box Upgrade", "Socket Installation", "Emergency Repairs"],
        "Gas Safe Engineer": ["Boiler Installation", "Gas Certificates", "Appliance Servicing", "Emergency Gas Leaks"],
        "Builder": ["Extensions", "New Builds", "Renovations", "Structural Work"],
        "Bathroom Fitter": ["Full Bathroom Install", "Shower Installation", "Tiling", "Plumbing & Electrics"],
        "Kitchen Fitter": ["Full Kitchen Install", "Worktop Fitting", "Appliance Installation", "Cabinet Assembly"],
    }
    
    services_list = common_services.get(category, [
        f"Standard {service_name}",
        f"Emergency {service_name}",
        f"{service_name} Repairs",
        f"{service_name} Installation"
    ])
    
    # Return structured JSONB data
    return {
        "introduction": intro,
        "benefits": benefits,
        "common_services": services_list,
        "pricing": {
            "avg_cost": service['avg_cost'],
            "description": f"Based on {stats['completed_jobs']} completed jobs in {location_name}",
            "standard": service['avg_cost'],
            "emergency": "£80-£150 callout + hourly" if service['emergency'] else None
        },
        "local_stats": {
            "verified_pros": stats['pros_count'],
            "avg_rating": "4.9",
            "total_reviews": stats['review_count'],
            "completed_jobs": stats['completed_jobs'],
            "avg_response": f"{stats['avg_response_hours']} hours"
        },
        "qualification_info": {
            "required": service['qualification'],
            "description": f"All {category.lower()}s are {service['qualification']} certified" if service['qualification'] else f"Professional {category.lower()}s with verified credentials"
        },
        "emergency_available": service['emergency']
    }


def create_database_tables(conn):
    """Create the seo_pages table if it doesn't exist"""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS seo_pages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(255) UNIQUE NOT NULL,
            city VARCHAR(100) NOT NULL,
            category VARCHAR(100) NOT NULL,
            seo_title VARCHAR(255) NOT NULL,
            seo_description TEXT NOT NULL,
            h1_header VARCHAR(255) NOT NULL,
            content_body JSONB NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_slug ON seo_pages(slug);
        CREATE INDEX IF NOT EXISTS idx_city ON seo_pages(city);
        CREATE INDEX IF NOT EXISTS idx_category ON seo_pages(category);
        CREATE INDEX IF NOT EXISTS idx_city_category ON seo_pages(city, category);
    """)
    
    conn.commit()
    print("✓ Database tables created/verified")


def generate_page_data(service: Dict, location: Dict) -> Dict:
    """Generate complete page data for one service + location combination"""
    service_name = service['name']
    service_slug = service['slug']
    category = service['category']
    
    location_name = location['name']
    location_slug = location['slug']
    postcode = location['postcode_area'] or "UK"
    
    # Generate unique slug
    slug = f"{service_slug}-{location_slug}"
    
    # Generate dynamic stats
    stats = generate_dynamic_stats(service_slug, location_slug)
    
    # Generate SEO metadata
    seo_title = f"{service_name} in {location_name} | Find Verified {category} Near {postcode} | TradeMatch"
    
    emergency_text = "Emergency services available 24/7. " if service['emergency'] else ""
    qualification_text = f"{service['qualification']} certified. " if service['qualification'] else ""
    
    seo_description = f"Find trusted {category.lower()} in {location_name} ({postcode}). {stats['pros_count']}+ verified professionals. {qualification_text}Average cost: {service['avg_cost']}. {emergency_text}Get free quotes in 24 hours."
    
    h1_header = f"{service_name} in {location_name}"
    
    # Generate content body (JSONB)
    content_body = generate_content_body(service, location, stats)
    
    return {
        "slug": slug,
        "city": location_name,
        "category": service_name,
        "seo_title": seo_title[:255],  # Ensure within limit
        "seo_description": seo_description[:500],  # Ensure within limit
        "h1_header": h1_header,
        "content_body": json.dumps(content_body),  # Convert to JSON string
        "last_updated": datetime.now()
    }


def batch_insert_pages(conn, pages_batch: List[Dict], log_file):
    """Bulk insert a batch of pages using execute_values"""
    cursor = conn.cursor()
    
    # Prepare data for insertion
    insert_query = """
        INSERT INTO seo_pages (slug, city, category, seo_title, seo_description, h1_header, content_body, last_updated)
        VALUES %s
        ON CONFLICT (slug) DO NOTHING
    """
    
    values = [
        (
            page['slug'],
            page['city'],
            page['category'],
            page['seo_title'],
            page['seo_description'],
            page['h1_header'],
            page['content_body'],
            page['last_updated']
        )
        for page in pages_batch
    ]
    
    try:
        execute_values(cursor, insert_query, values, page_size=1000)
        conn.commit()
    except Exception as e:
        conn.rollback()
        error_msg = f"[{datetime.now()}] Batch insertion error: {str(e)}\n"
        log_file.write(error_msg)
        print(f"  ⚠️ Error in batch (logged): {str(e)[:100]}")


def main():
    """Main execution function"""
    print("=" * 80)
    print("  TradeMatch Database Injection Script")
    print("  Next.js + Neon PostgreSQL Stack")
    print("=" * 80)
    print()
    
    # Load locations
    print("📍 Loading UK locations...")
    locations = load_locations()
    print(f"✓ Loaded {len(locations):,} locations")
    print()
    
    # Calculate total
    total_pages = len(SERVICES) * len(locations)
    print(f"📄 Will generate {len(SERVICES)} services × {len(locations):,} locations = {total_pages:,} database records")
    print()
    
    # Confirm
    response = input(f"⚠️  This will inject {total_pages:,} rows into your Neon database. Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Cancelled")
        return
    
    print()
    print("🚀 Starting database injection...")
    print()
    
    # Connect to database
    print("🔌 Connecting to Neon PostgreSQL...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✓ Connected successfully")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Create tables
    create_database_tables(conn)
    print()
    
    # Open error log
    with open(ERROR_LOG, 'w') as log_file:
        log_file.write(f"TradeMatch Injection Log - {datetime.now()}\n")
        log_file.write("=" * 80 + "\n\n")
        
        # Generate and batch insert data
        print(f"📊 Processing in batches of {BATCH_SIZE:,} records...")
        print()
        
        pages_batch = []
        total_inserted = 0
        
        # Progress bar
        with tqdm(total=total_pages, desc="Injecting pages", unit="page") as pbar:
            for service in SERVICES:
                for location in locations:
                    # Generate page data
                    page_data = generate_page_data(service, location)
                    pages_batch.append(page_data)
                    
                    # Insert when batch is full
                    if len(pages_batch) >= BATCH_SIZE:
                        batch_insert_pages(conn, pages_batch, log_file)
                        total_inserted += len(pages_batch)
                        pbar.update(len(pages_batch))
                        pages_batch = []
            
            # Insert remaining pages
            if pages_batch:
                batch_insert_pages(conn, pages_batch, log_file)
                total_inserted += len(pages_batch)
                pbar.update(len(pages_batch))
    
    # Close connection
    conn.close()
    
    print()
    print("=" * 80)
    print("  ✅ INJECTION COMPLETE!")
    print("=" * 80)
    print()
    print(f"📊 Total Records: {total_inserted:,}")
    print(f"🗄️  Database: Neon PostgreSQL")
    print(f"📋 Error Log: {ERROR_LOG}")
    print()
    print("🎯 Next Steps:")
    print("   1. Deploy your Next.js app to Vercel")
    print("   2. Set DATABASE_URL environment variable")
    print("   3. Test dynamic route: /trades/[slug]")
    print("   4. Generate sitemap index")
    print("   5. Submit to Google Search Console")
    print()
    print("🚀 Ready for Next.js ISR deployment!")
    print()


if __name__ == "__main__":
    main()
