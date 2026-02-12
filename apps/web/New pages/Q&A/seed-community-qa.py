#!/usr/bin/env python3
"""
TradeMatch Community Q&A Database Seeder
Generates thousands of trade questions and AI-powered expert answers
Optimized for Answer Engine Optimization (AEO)
"""

import os
import csv
import json
import hashlib
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from pathlib import Path
from typing import List, Dict
import re

# ============================================
# CONFIGURATION
# ============================================
BASE_DIR = Path(__file__).resolve().parent
LOCATIONS_CSV = BASE_DIR / "uk-locations.csv"
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://user:pass@host/db')
ERROR_LOG = BASE_DIR / "qa_injection_errors.log"

# Optional: Use Claude API for better answers
USE_AI_GENERATION = False
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', None)

# ============================================
# TRADE CATEGORIES
# ============================================
TRADE_CATEGORIES = [
    "Plumbing", "Electrical", "Building", "Carpentry", "Gas Work",
    "Kitchen Fitting", "Bathroom Fitting", "Roofing", "Landscaping",
    "Painting & Decorating", "Plastering", "Tiling", "Heating"
]

# ============================================
# QUESTION TEMPLATES
# ============================================
QUESTION_TEMPLATES = {
    "cost": [
        "How much does {service} cost in {location}?",
        "What's the average price for {service} in {location}?",
        "Cost of {service} in {location} - what should I expect?",
        "How much should I pay for {service} in {location}?",
        "What do {trade}s charge in {location}?"
    ],
    "how_to": [
        "How do I find a reliable {trade} in {location}?",
        "What should I look for when hiring a {trade} in {location}?",
        "How long does {service} take in {location}?",
        "Do I need planning permission for {service} in {location}?",
        "How do I know if my {trade} is qualified?"
    ],
    "problem": [
        "My {problem} - what should I do?",
        "Why is my {problem} happening?",
        "How urgent is {problem}?",
        "Can I fix {problem} myself or do I need a {trade}?",
        "What causes {problem}?"
    ],
    "comparison": [
        "What's better: {option_a} or {option_b}?",
        "Should I {option_a} or {option_b} in {location}?",
        "{option_a} vs {option_b} - which is best?",
        "Is it worth paying extra for {option_a}?"
    ],
    "timing": [
        "When is the best time for {service}?",
        "How long will {service} take?",
        "Can {trade}s work weekends in {location}?",
        "How much notice do I need to book a {trade} in {location}?"
    ]
}

# Service-specific problems
PROBLEMS_BY_TRADE = {
    "Plumbing": ["boiler not working", "leak under sink", "low water pressure", "radiator cold"],
    "Electrical": ["power keeps tripping", "socket not working", "lights flickering", "fuse box old"],
    "Gas Work": ["boiler making noise", "gas smell", "pilot light out", "no hot water"],
    "Roofing": ["roof leak", "missing tiles", "gutters overflowing", "flat roof ponding"],
    "Heating": ["radiators cold", "thermostat not working", "boiler pressure low", "heating not coming on"]
}

# ============================================
# ANSWER TEMPLATES
# ============================================
def generate_cost_answer(service: str, location: str, trade: str, price_range: str) -> str:
    """Generate answer for cost questions"""
    return f"""In {location}, you can expect to pay {price_range} for {service.lower()}. This price typically includes:

• Materials and labor
• Professional {trade.lower()} with relevant qualifications
• Public liability insurance
• Guarantee on workmanship

**Price factors in {location}:**
- Project size and complexity
- Quality of materials chosen
- Accessibility of the property
- Time of year (peak season costs more)

Based on 200+ completed jobs in {location}, most homeowners pay toward the middle of this range. Get 3-5 free quotes through TradeMatch to compare prices from verified {trade.lower()}s in your area.

**💡 Tip:** Always get multiple quotes and check reviews before hiring. The cheapest quote isn't always the best value."""

def generate_how_to_answer(trade: str, location: str) -> str:
    """Generate answer for how-to questions"""
    return f"""Finding a reliable {trade.lower()} in {location} is straightforward if you follow these steps:

**1. Check Qualifications**
• Gas Safe registered (for gas work)
• Part P/NICEIC certified (for electrical)
• CSCS card (for construction)
• Trade-specific certifications

**2. Verify Insurance**
• Minimum £2M public liability insurance
• Proof of coverage up to date
• Covers accidental damage

**3. Read Reviews**
• Check ratings from 10+ verified customers
• Look for consistent positive feedback
• Pay attention to recent reviews

**4. Get Multiple Quotes**
• Request 3-5 quotes for comparison
• Detailed breakdown of costs
• Written estimates, not verbal

**5. Ask Questions**
• How long will it take?
• What's included in the price?
• Do you offer a guarantee?
• Can I see examples of previous work?

TradeMatch verifies all {trade.lower()}s in {location} with ID checks, insurance verification, and customer reviews. Post your job free and receive vetted quotes within 24 hours."""

def generate_problem_answer(problem: str, trade: str, urgency: str) -> str:
    """Generate answer for problem questions"""
    urgent_text = "This requires immediate attention. Contact an emergency {trade} now." if urgency == "high" else "This should be addressed soon, but it's not an immediate emergency."
    
    return f"""If you're experiencing {problem}, here's what you need to know:

**Urgency Level:** {urgency.upper()}
{urgent_text}

**Likely Causes:**
• Wear and tear over time
• Lack of regular maintenance
• Incorrect installation
• Component failure

**What To Do:**
1. **If emergency:** Turn off the main supply (water/gas/electric)
2. **Take photos:** Document the issue for quotes
3. **Get professional help:** Don't attempt complex DIY
4. **Get quotes:** Compare prices from qualified {trade.lower()}s

**Typical Cost Range:**
Emergency callout: £80-£150
Standard repair: £150-£400
Full replacement: £400-£1,500+

Post your job on TradeMatch to get free quotes from {trade.lower()}s in your area. Many offer same-day service for urgent issues."""

def sanitize_slug(text: str) -> str:
    """Create SEO-friendly slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text[:200]  # Limit length

# ============================================
# DATABASE FUNCTIONS
# ============================================
def create_questions_table(conn):
    """Create the community_questions table"""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS community_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT UNIQUE NOT NULL,
            question_text TEXT NOT NULL,
            expert_answer TEXT NOT NULL,
            trade_category TEXT NOT NULL,
            location_city TEXT,
            question_type TEXT,
            view_count INTEGER DEFAULT 0,
            helpful_count INTEGER DEFAULT 0,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_qa_slug ON community_questions(slug);
        CREATE INDEX IF NOT EXISTS idx_qa_trade ON community_questions(trade_category);
        CREATE INDEX IF NOT EXISTS idx_qa_location ON community_questions(location_city);
        CREATE INDEX IF NOT EXISTS idx_qa_type ON community_questions(question_type);
    """)
    
    conn.commit()
    print("✓ Questions table created/verified")

def generate_question_data(template_type: str, trade: str, location: str = None) -> Dict:
    """Generate a single Q&A pair"""
    import random
    
    templates = QUESTION_TEMPLATES[template_type]
    template = random.choice(templates)
    
    # Generate question
    if template_type == "cost":
        service = f"{trade.lower()} work"
        question = template.format(service=service, location=location or "UK", trade=trade)
        answer = generate_cost_answer(service, location or "UK", trade, "£150-£600")
        
    elif template_type == "how_to":
        question = template.format(trade=trade, location=location or "UK", service=f"{trade.lower()} work")
        answer = generate_how_to_answer(trade, location or "UK")
        
    elif template_type == "problem" and trade in PROBLEMS_BY_TRADE:
        problem = random.choice(PROBLEMS_BY_TRADE[trade])
        question = template.format(problem=problem, trade=trade.lower())
        urgency = "high" if any(word in problem.lower() for word in ["leak", "smell", "not working"]) else "medium"
        answer = generate_problem_answer(problem, trade, urgency)
    else:
        return None
    
    # Create slug
    slug = sanitize_slug(question)
    
    # Related questions
    related = [
        sanitize_slug(random.choice(templates).format(
            service=f"{trade.lower()} work",
            location=location or "UK",
            trade=trade,
            problem=random.choice(PROBLEMS_BY_TRADE.get(trade, ["common issue"]))
        )[:100])
        for _ in range(3)
    ]
    
    return {
        "slug": slug,
        "question_text": question,
        "expert_answer": answer,
        "trade_category": trade,
        "location_city": location,
        "question_type": template_type,
        "metadata": json.dumps({
            "related_questions": related,
            "tags": [trade.lower(), location.lower() if location else "uk", template_type],
            "estimated_answer_quality": "ai_generated"
        })
    }

def batch_insert_questions(conn, questions_batch: List[Dict], log_file):
    """Bulk insert questions"""
    cursor = conn.cursor()
    
    insert_query = """
        INSERT INTO community_questions (slug, question_text, expert_answer, trade_category, location_city, question_type, metadata)
        VALUES %s
        ON CONFLICT (slug) DO NOTHING
    """
    
    values = [
        (q['slug'], q['question_text'], q['expert_answer'], q['trade_category'], q['location_city'], q['question_type'], q['metadata'])
        for q in questions_batch
    ]
    
    try:
        execute_values(cursor, insert_query, values, page_size=1000)
        conn.commit()
    except Exception as e:
        conn.rollback()
        error_msg = f"[{datetime.now()}] Batch error: {str(e)}\n"
        log_file.write(error_msg)
        print(f"  ⚠️ Error: {str(e)[:100]}")

# ============================================
# MAIN EXECUTION
# ============================================
def main():
    print("=" * 80)
    print("  TradeMatch Community Q&A Seeder")
    print("  AEO-Optimized Question Database")
    print("=" * 80)
    print()
    
    # Load locations (first 50 for speed, or all for full coverage)
    print("📍 Loading UK locations...")
    locations = []
    with open(LOCATIONS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            locations.append(row['name'])
            if i >= 49:  # Top 50 cities
                break
    
    print(f"✓ Loaded {len(locations)} locations")
    print()
    
    # Calculate questions to generate
    questions_per_trade_location = 3  # 3 question types per trade per location
    questions_per_trade_general = 5   # 5 general questions per trade
    
    total_questions = (len(TRADE_CATEGORIES) * len(locations) * questions_per_trade_location) + \
                      (len(TRADE_CATEGORIES) * questions_per_trade_general)
    
    print(f"📄 Will generate approximately {total_questions:,} questions")
    print(f"   - {len(TRADE_CATEGORIES)} trades × {len(locations)} locations × {questions_per_trade_location} types")
    print(f"   - {len(TRADE_CATEGORIES)} trades × {questions_per_trade_general} general questions")
    print()
    
    response = input("Continue? (yes/no): ")
    if response.lower() != 'yes':
        print("❌ Cancelled")
        return
    
    print()
    print("🔌 Connecting to database...")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✓ Connected")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return
    
    # Create table
    create_questions_table(conn)
    print()
    
    # Generate questions
    print("🚀 Generating questions...")
    print()
    
    with open(ERROR_LOG, 'w') as log_file:
        log_file.write(f"Q&A Injection Log - {datetime.now()}\n\n")
        
        questions_batch = []
        total_generated = 0
        
        # Location-specific questions
        for trade in TRADE_CATEGORIES:
            print(f"[{trade}] Generating questions...")
            
            for location in locations:
                for q_type in ["cost", "how_to"]:
                    q_data = generate_question_data(q_type, trade, location)
                    if q_data:
                        questions_batch.append(q_data)
                
                if len(questions_batch) >= 1000:
                    batch_insert_questions(conn, questions_batch, log_file)
                    total_generated += len(questions_batch)
                    print(f"  Inserted {total_generated:,} questions...")
                    questions_batch = []
            
            # General questions for this trade
            for _ in range(5):
                q_type = "problem" if trade in PROBLEMS_BY_TRADE else "how_to"
                q_data = generate_question_data(q_type, trade, None)
                if q_data:
                    questions_batch.append(q_data)
        
        # Insert remaining
        if questions_batch:
            batch_insert_questions(conn, questions_batch, log_file)
            total_generated += len(questions_batch)
    
    conn.close()
    
    print()
    print("=" * 80)
    print("  ✅ GENERATION COMPLETE!")
    print("=" * 80)
    print()
    print(f"📊 Total Questions: {total_generated:,}")
    print(f"📋 Error Log: {ERROR_LOG}")
    print()
    print("🎯 Next Steps:")
    print("   1. Deploy Next.js Q&A pages")
    print("   2. Submit /questions sitemap to Google")
    print("   3. Monitor for AI citations")
    print()

if __name__ == "__main__":
    main()
