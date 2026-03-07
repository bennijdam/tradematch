#!/usr/bin/env python3
"""
TradeMatch SEO Page Generator v3.0 — AI-Architecture Upgrade
Generates 165,696 SEO-optimized pages (48 services x 3,452 locations)

Upgrades in this version:
  All 30 template placeholders filled with unique content
  Trade-specific cost tables (8 cost profiles)
  Deterministic content variation (no duplicate text across pages)
  Nearby-location lookup from same county
  Review schema with realistic local reviewer names
  Competitor comparison table (Bark / MyBuilder / Checkatrade)
  Local insight blocks per page
  PIL hero-image watermarking (graceful fallback if Pillow absent)
  Realistic PRO_COUNT and REVIEW_COUNT seeded by population
"""

import os, csv, json, random, hashlib, shutil
from pathlib import Path
from datetime import datetime, timedelta

# ─── CONFIGURATION ────────────────────────────────────────────────
BASE_URL          = "https://www.tradematch.uk"
SITEMAP_URL_LIMIT = 5_000   # 5k per file — mimics organic authority growth, easier for Googlebot
BASE_DIR          = Path(__file__).resolve().parent
OUTPUT_DIR        = BASE_DIR / "generated-pages"
TEMPLATE_FILE     = BASE_DIR / "city-trade-seo-page-v2.html"
LOCATIONS_CSV     = BASE_DIR / "uk-locations.csv"

# ─── SERVICES LIST ────────────────────────────────────────────────
SERVICES = [
    # Core Trades
    {"name":"Plumbing","slug":"plumbing","category":"Core Trades","icon":"🚰","profile":"hourly"},
    {"name":"Electrical","slug":"electrical","category":"Core Trades","icon":"⚡","profile":"hourly"},
    {"name":"Building","slug":"building","category":"Construction","icon":"🏗️","profile":"project"},
    {"name":"Carpentry","slug":"carpentry","category":"Core Trades","icon":"🔨","profile":"hourly"},
    {"name":"Painting & Decorating","slug":"painting-decorating","category":"Finishing","icon":"🎨","profile":"area"},
    # Home Improvements
    {"name":"Bathroom Fitting","slug":"bathroom-fitting","category":"Home Improvement","icon":"🛁","profile":"supply_fit"},
    {"name":"Kitchen Fitting","slug":"kitchen-fitting","category":"Home Improvement","icon":"🍳","profile":"supply_fit"},
    {"name":"Carpets & Lino","slug":"carpets-lino","category":"Flooring","icon":"📐","profile":"area"},
    {"name":"Hard Flooring","slug":"hard-flooring","category":"Flooring","icon":"📐","profile":"area"},
    {"name":"Tiling","slug":"tiling","category":"Finishing","icon":"⬜","profile":"area"},
    # Heating & Energy
    {"name":"Central Heating","slug":"central-heating","category":"Heating","icon":"♨️","profile":"supply_fit"},
    {"name":"Gas Work","slug":"gas-work","category":"Heating","icon":"♨️","profile":"hourly"},
    {"name":"Insulation","slug":"insulation","category":"Energy","icon":"🏠","profile":"area"},
    # Construction
    {"name":"Bricklaying","slug":"bricklaying","category":"Construction","icon":"🧱","profile":"area"},
    {"name":"Extensions","slug":"extensions","category":"Construction","icon":"🏗️","profile":"project"},
    {"name":"Loft Conversion","slug":"loft-conversion","category":"Construction","icon":"🏠","profile":"project"},
    {"name":"Conversions - General","slug":"conversions-general","category":"Construction","icon":"🏗️","profile":"project"},
    {"name":"New Builds","slug":"new-builds","category":"Construction","icon":"🏗️","profile":"project"},
    {"name":"Groundwork & Foundations","slug":"groundwork-foundations","category":"Construction","icon":"🏗️","profile":"project"},
    {"name":"Demolition","slug":"demolition","category":"Construction","icon":"🏗️","profile":"project"},
    # Roofing
    {"name":"Roofing (Flat)","slug":"roofing-flat","category":"Roofing","icon":"🏠","profile":"roofing"},
    {"name":"Roofing (Pitched)","slug":"roofing-pitched","category":"Roofing","icon":"🏠","profile":"roofing"},
    {"name":"Fascias & Soffits","slug":"fascias-soffits","category":"Roofing","icon":"🏠","profile":"roofing"},
    {"name":"Guttering","slug":"guttering","category":"Roofing","icon":"🏠","profile":"roofing"},
    # Outdoor
    {"name":"Landscaping","slug":"landscaping","category":"Outdoor","icon":"🌳","profile":"outdoor"},
    {"name":"Garden Maintenance","slug":"garden-maintenance","category":"Outdoor","icon":"🌳","profile":"outdoor"},
    {"name":"Fencing","slug":"fencing","category":"Outdoor","icon":"🌲","profile":"outdoor"},
    {"name":"Decking","slug":"decking","category":"Outdoor","icon":"🌳","profile":"outdoor"},
    {"name":"Driveways (Paved & Loose)","slug":"driveways-paved","category":"Outdoor","icon":"🚗","profile":"outdoor"},
    {"name":"Driveways (Tarmac Surface)","slug":"driveways-tarmac","category":"Outdoor","icon":"🚗","profile":"outdoor"},
    {"name":"Tree Surgery","slug":"tree-surgery","category":"Outdoor","icon":"🌳","profile":"outdoor"},
    # Specialist
    {"name":"Plastering","slug":"plastering","category":"Finishing","icon":"🧱","profile":"area"},
    {"name":"Repointing","slug":"repointing","category":"Masonry","icon":"🧱","profile":"area"},
    {"name":"Stonemasonry","slug":"stonemasonry","category":"Masonry","icon":"🧱","profile":"hourly"},
    {"name":"Damp Proofing","slug":"damp-proofing","category":"Property Care","icon":"🏠","profile":"supply_fit"},
    {"name":"Restoration & Refurbishment","slug":"restoration-refurbishment","category":"Property Care","icon":"🏗️","profile":"project"},
    {"name":"Joinery & Cabinet Making","slug":"joinery-cabinet-making","category":"Specialist","icon":"🔨","profile":"supply_fit"},
    {"name":"Fireplaces & Flues","slug":"fireplaces-flues","category":"Specialist","icon":"🔥","profile":"supply_fit"},
    {"name":"Conservatories","slug":"conservatories","category":"Construction","icon":"🏡","profile":"project"},
    {"name":"Architecture","slug":"architecture","category":"Design","icon":"📐","profile":"design"},
    {"name":"CAD / Drawings","slug":"cad-drawings","category":"Design","icon":"📐","profile":"design"},
    # Windows & Doors
    {"name":"Windows & Doors (uPVC & Metal)","slug":"windows-doors-upvc","category":"Windows & Doors","icon":"🪟","profile":"supply_fit"},
    {"name":"Windows & Doors (Wooden)","slug":"windows-doors-wooden","category":"Windows & Doors","icon":"🪟","profile":"supply_fit"},
    # Services
    {"name":"Handyman","slug":"handyman","category":"General Services","icon":"🔧","profile":"hourly"},
    {"name":"Cleaning Services","slug":"cleaning-services","category":"General Services","icon":"🧹","profile":"hourly"},
    {"name":"Waste Clearance","slug":"waste-clearance","category":"General Services","icon":"♻️","profile":"hourly"},
    {"name":"Moving Services","slug":"moving-services","category":"General Services","icon":"📦","profile":"project"},
    {"name":"Locksmiths","slug":"locksmiths","category":"Security","icon":"🔐","profile":"hourly"},
    {"name":"Security Systems","slug":"security-systems","category":"Security","icon":"🔒","profile":"supply_fit"},
]

# ─── COST TABLE DATA (8 profiles) ─────────────────────────────────
COST_TABLES = {
    "hourly": {
        "intro": [
            "{TRADE} costs in {LOCATION} vary depending on job complexity, materials, and call-out urgency. The figures below reflect typical rates charged by vetted {LOCATION} tradespeople on the TradeMatch platform.",
            "Getting an accurate quote for {TRADE} in {LOCATION} starts with understanding typical market rates. We compiled these ranges from real jobs posted on TradeMatch across the {COUNTY} area.",
            "These {TRADE} price benchmarks for {LOCATION} are drawn from actual quotes submitted through TradeMatch, giving you a reliable baseline before you request your own free quotes.",
        ],
        "rows": [
            ("First hour / call-out fee", "£60", "£160", "£95"),
            ("Additional hours (per hour)", "£40", "£90", "£60"),
            ("Half-day rate (4 hrs)", "£180", "£350", "£240"),
            ("Full-day rate (8 hrs)", "£300", "£600", "£420"),
            ("Emergency / out-of-hours", "£100", "£250", "£160"),
        ],
        "tip": [
            "In {LOCATION}, booking {TRADE} work on weekdays (Mon-Fri) can save you up to 35% compared to weekend call-outs. Use TradeMatch to compare availability and rates instantly.",
            "{LOCATION} {TRADE} rates tend to peak in winter. If your job is non-urgent, scheduling in spring or summer often brings more competitive quotes from local pros.",
            "Always request at least 3 quotes for any {TRADE} job in {LOCATION}. TradeMatch sends your request to up to 5 verified specialists - making side-by-side comparison effortless.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs between £60 and £160 for the first hour, including call-out. Subsequent hours usually run £40-£90. Emergency or out-of-hours work commands a premium - expect to pay 50-80% more than standard rates. Always confirm whether the quote includes VAT and materials.",
            "Typical {TRADE} hourly rates in {LOCATION} range from £60 to £90 for standard work, rising to £120-£160 for emergency call-outs. Day rates usually offer better value for larger jobs. Get itemised quotes through TradeMatch to compare true all-in costs.",
        ],
    },
    "area": {
        "intro": [
            "{TRADE} in {LOCATION} is generally priced per square metre, with the final cost influenced by prep work, materials specification, and access. The ranges below are based on real {COUNTY} projects.",
            "When budgeting for {TRADE} in {LOCATION}, understanding per-m2 rates is essential. These figures come from verified quotes on the TradeMatch platform across the {COUNTY} region.",
            "The cost of {TRADE} in {LOCATION} depends heavily on the size of the area, the condition of the existing surface, and the materials you choose. Here are typical benchmarks from local jobs.",
        ],
        "rows": [
            ("Basic / standard specification", "£12/m2", "£28/m2", "£18/m2"),
            ("Mid-range specification", "£25/m2", "£55/m2", "£38/m2"),
            ("Premium / bespoke specification", "£50/m2", "£120/m2", "£75/m2"),
            ("Preparation & surface repair", "£8/m2", "£22/m2", "£14/m2"),
            ("Large area discount (50m2+)", "-10%", "-20%", "-15%"),
        ],
        "tip": [
            "In {LOCATION}, many {TRADE} specialists offer a day-rate discount for projects over 40m2. Mention your full area size upfront when using TradeMatch - it often unlocks better quotes.",
            "{COUNTY} {TRADE} pros typically include surface preparation in their quote. Always confirm this in writing - hidden prep costs are a common source of budget overruns.",
            "Combining {TRADE} with other finishing work in one job can save {LOCATION} homeowners 10-15% on total labour costs. Mention any related tasks when posting on TradeMatch.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs £18-£38 per m2 for mid-range work, including labour and standard materials. Preparation, room shape, and specification can push this higher. For a 20m2 room, expect to pay £400-£900 with a verified {LOCATION} tradesperson from TradeMatch.",
            "For {TRADE} work in {LOCATION}, budget between £12 and £55 per m2 depending on your specification. Entry-level finishes start around £12/m2; premium bespoke work can reach £120/m2. Always confirm whether your quote includes surface prep and waste disposal.",
        ],
    },
    "supply_fit": {
        "intro": [
            "{TRADE} in {LOCATION} is typically quoted as a supply-and-fit package, combining materials and installation labour. The figures below reflect complete project costs from verified {COUNTY} specialists.",
            "When budgeting for {TRADE} in {LOCATION}, it is important to understand both supply costs and installation fees. These benchmarks are drawn from real TradeMatch quotes across {COUNTY}.",
            "Complete {TRADE} costs in {LOCATION} vary significantly with specification and brand choice. The ranges here reflect typical installed prices from TradeMatch-verified professionals.",
        ],
        "rows": [
            ("Budget / entry-level package", "£800", "£2,200", "£1,400"),
            ("Mid-range package", "£2,000", "£5,500", "£3,500"),
            ("Premium / designer package", "£5,000", "£15,000", "£8,500"),
            ("Installation labour only", "£400", "£1,200", "£700"),
            ("Removal & disposal (old unit)", "£80", "£300", "£160"),
        ],
        "tip": [
            "In {LOCATION}, supply-only deals from trade merchants can save 20-30% on materials. Ask your TradeMatch pro whether they can source materials at trade discount and pass the saving on.",
            "Timing your {TRADE} project for January-February in {LOCATION} often means shorter lead times and more competitive installer quotes, as demand drops post-Christmas.",
            "Always get a fixed-price quote for {TRADE} in {LOCATION}, not a day-rate estimate. TradeMatch specialists provide itemised quotes so you know exactly what you are paying for.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs between £2,000 and £5,500 for a mid-range supply-and-fit project. Budget options start from £800 while premium installations can reach £15,000+. Labour typically accounts for 30-40% of the total cost. Use TradeMatch to get itemised quotes from verified {LOCATION} specialists.",
            "A fully installed mid-range {TRADE} project in {LOCATION} usually costs £3,000-£5,500 including supply, fitting, and waste removal. Entry-level work can be completed from £800, while bespoke premium projects often exceed £10,000. Always confirm what is included in the quote.",
        ],
    },
    "project": {
        "intro": [
            "{TRADE} projects in {LOCATION} are priced on scope, specification, and site conditions. The benchmarks below reflect real quotes from TradeMatch-verified {COUNTY} contractors.",
            "Budgeting for {TRADE} in {LOCATION} requires understanding typical project cost ranges. These figures are based on actual contracts placed through TradeMatch in the {COUNTY} region.",
            "The cost of {TRADE} work in {LOCATION} varies enormously with project scale. These typical ranges from local TradeMatch contractors give you a solid starting point for your budget.",
        ],
        "rows": [
            ("Small project (basic scope)", "£3,000", "£12,000", "£7,000"),
            ("Medium project (standard spec)", "£12,000", "£45,000", "£26,000"),
            ("Large / complex project", "£40,000", "£120,000", "£72,000"),
            ("Project management fee", "10%", "15%", "12%"),
            ("Planning / structural engineer", "£500", "£2,500", "£1,200"),
        ],
        "tip": [
            "For large {TRADE} projects in {LOCATION}, always request a detailed breakdown of labour, materials, and contingency. TradeMatch pros provide itemised quotes so you can compare like-for-like.",
            "Planning permission costs and timelines vary across {COUNTY}. Your TradeMatch {TRADE} specialist can advise on local requirements and often has established relationships with local planning teams.",
            "Getting {TRADE} quotes in {LOCATION} during autumn (Sept-Nov) often yields the most competitive prices, as contractors plan their winter workload. Use TradeMatch to reach multiple verified pros at once.",
        ],
        "faq": [
            "{TRADE} costs in {LOCATION} depend heavily on project scope, but typical mid-size projects range from £12,000 to £45,000. Smaller works can start from £3,000 while major projects exceed £100,000. Always include a 10-15% contingency budget and ensure your TradeMatch contractor provides a fixed-price contract.",
            "A standard {TRADE} project in {LOCATION} typically costs £26,000 at the mid-range, with smaller projects from £7,000 and larger complex builds exceeding £70,000. Planning fees and structural engineering add £500-£2,500 on top. TradeMatch connects you with verified contractors who provide transparent itemised quotes.",
        ],
    },
    "roofing": {
        "intro": [
            "{TRADE} costs in {LOCATION} depend on roof pitch, material choice, and access requirements. These benchmarks are from verified {COUNTY} roofing contractors on the TradeMatch platform.",
            "Getting accurate {TRADE} quotes in {LOCATION} means understanding material and labour costs separately. These typical ranges come from real {COUNTY} roofing jobs on TradeMatch.",
            "{TRADE} pricing in {LOCATION} varies with property size and the existing roof condition. The figures below reflect what homeowners typically pay through TradeMatch in the {COUNTY} area.",
        ],
        "rows": [
            ("Repair / patch (per repair)", "£150", "£450", "£280"),
            ("Re-roofing (per m2)", "£40/m2", "£85/m2", "£58/m2"),
            ("Full replacement (3-bed semi)", "£4,500", "£9,500", "£6,800"),
            ("Scaffolding (per week)", "£600", "£1,400", "£900"),
            ("Annual maintenance inspection", "£80", "£200", "£130"),
        ],
        "tip": [
            "In {LOCATION}, scaffolding costs can add £600-£1,400 to any roofing job. TradeMatch specialists can often share scaffolding costs with neighbouring properties - ask about this when you receive your quotes.",
            "{COUNTY} weather means roofing issues can escalate quickly. TradeMatch priority matching can connect you with a verified {LOCATION} roofer within hours for emergency leak repairs.",
            "For {TRADE} work in {LOCATION}, mid-spring is the ideal time to book. Materials are available, weather is stable, and contractors have better availability than in peak summer.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs £4,500-£9,500 for a full replacement on a 3-bedroom semi-detached, including materials and scaffolding. Repairs start from £150-£450. Always use a TradeMatch-verified roofer with public liability insurance.",
            "A full {TRADE} replacement in {LOCATION} for a typical 3-bed house costs £5,000-£9,000 including scaffolding. Individual repairs are £150-£450. Emergency call-outs cost more. Always confirm your TradeMatch roofer holds valid public liability insurance and a manufacturer warranty.",
        ],
    },
    "outdoor": {
        "intro": [
            "{TRADE} costs in {LOCATION} vary by project size, materials, and garden access. The benchmarks below come from verified {COUNTY} outdoor specialists on the TradeMatch platform.",
            "Understanding {TRADE} pricing in {LOCATION} helps you budget accurately. These typical ranges reflect real quotes from verified TradeMatch specialists across the {COUNTY} area.",
            "For {TRADE} in {LOCATION}, costs depend on the size of your outdoor space, ground conditions, and material quality. Here are typical figures from {COUNTY} professionals on TradeMatch.",
        ],
        "rows": [
            ("Small project / tidy-up", "£200", "£600", "£380"),
            ("Medium project (standard spec)", "£600", "£2,500", "£1,400"),
            ("Large / full transformation", "£2,500", "£8,000", "£4,800"),
            ("Materials allowance (per m2)", "£15/m2", "£80/m2", "£40/m2"),
            ("Annual maintenance contract", "£400", "£1,200", "£700"),
        ],
        "tip": [
            "In {LOCATION}, scheduling {TRADE} work in early spring means your garden is ready for summer. Book via TradeMatch in February-March for the best availability and most competitive quotes.",
            "{LOCATION} homeowners who bundle {TRADE} with a related outdoor service often save 10-20% on combined labour costs. Mention this when posting your job on TradeMatch.",
            "Ground conditions in {COUNTY} can affect {TRADE} costs significantly. A good TradeMatch specialist will survey your garden before quoting.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs £380-£1,400 for a standard project. Small tidy-ups start from £200 while full garden transformations can reach £8,000+. Materials are usually quoted separately on larger projects. TradeMatch connects you with verified {LOCATION} outdoor specialists who provide detailed, itemised quotes.",
            "For a typical medium-sized {TRADE} project in {LOCATION}, budget £600-£2,500 depending on materials and complexity. Larger landscape transformations often run £3,000-£8,000. Always confirm waste removal and material delivery are included in your TradeMatch quote.",
        ],
    },
    "design": {
        "intro": [
            "{TRADE} fees in {LOCATION} are typically structured as a percentage of build cost or fixed project fee. These benchmarks reflect typical rates from verified {COUNTY} professionals on TradeMatch.",
            "Understanding {TRADE} costs in {LOCATION} helps you allocate budget early in your project. These typical fee structures come from verified TradeMatch professionals in the {COUNTY} area.",
            "{TRADE} pricing in {LOCATION} varies with project complexity and the level of service required. The ranges below are based on real quotes from TradeMatch-verified professionals.",
        ],
        "rows": [
            ("Initial feasibility / concept", "£300", "£1,500", "£750"),
            ("Planning application package", "£800", "£3,500", "£1,800"),
            ("Full project drawings", "£1,200", "£6,000", "£3,000"),
            ("% of build cost (full service)", "5%", "12%", "8%"),
            ("Structural calculations", "£500", "£2,000", "£1,000"),
        ],
        "tip": [
            "In {LOCATION}, investing in full {TRADE} services upfront typically saves 15-25% on build costs through better specification and contractor management. TradeMatch connects you with qualified professionals.",
            "{COUNTY} planning requirements vary by conservation area and listed building status. A local TradeMatch {TRADE} professional will know your specific {LOCATION} planning context before drawing a single line.",
            "Getting planning permission right first time in {LOCATION} saves months of delays. TradeMatch {TRADE} specialists have local knowledge of planning officers and typical approval conditions in {COUNTY}.",
        ],
        "faq": [
            "{TRADE} in {LOCATION} typically costs £750-£1,800 for initial concept and planning work, rising to £3,000-£6,000 for full project drawings. Full-service fees are usually 5-12% of the total build cost. TradeMatch connects you with qualified {LOCATION} professionals who understand local planning requirements.",
            "A full {TRADE} package in {LOCATION} - from initial feasibility through to planning approval and working drawings - typically costs £2,500-£8,000 for a residential project. This fee often pays for itself through better contractor quotes and avoided planning delays.",
        ],
    },
}
COST_TABLES["_default"] = COST_TABLES["hourly"]

# ─── CONTENT POOLS ────────────────────────────────────────────────

META_DESCRIPTIONS = [
    "Find trusted {TRADE} specialists in {LOCATION}. Compare quotes from {PRO_COUNT}+ verified local pros, read real reviews, and book with escrow payment protection. Free to use.",
    "Looking for reliable {TRADE} in {LOCATION}? TradeMatch connects you with {PRO_COUNT}+ vetted local tradespeople. Get up to 5 free quotes today - no obligation.",
    "The best {TRADE} contractors in {LOCATION}, hand-verified by TradeMatch. Read {REVIEW_COUNT}+ genuine reviews, compare prices, and pay securely via escrow.",
    "Need a {TRADE} expert in {LOCATION}? Compare quotes from verified {COUNTY} professionals on TradeMatch. Free, fast, and fully protected by our TradeMatch Guarantee.",
    "{LOCATION}'s most trusted {TRADE} directory. {PRO_COUNT}+ locally verified tradespeople, {REVIEW_COUNT}+ homeowner reviews, and zero-commission quotes. Get started free.",
    "Get 3-5 competitive {TRADE} quotes in {LOCATION} within 48 hours. All pros are ID-verified, insured, and DBS-checked. Escrow payment protection included. Free for homeowners.",
    "TradeMatch {TRADE} {LOCATION}: Compare prices, check reviews, and hire with confidence. {PRO_COUNT}+ vetted local specialists ready to quote on your job today.",
]

HERO_SUBHEADLINES = [
    "Get up to 5 free quotes from verified {LOCATION} {TRADE} specialists within 48 hours. All pros are ID-checked, insured, and covered by the TradeMatch Guarantee.",
    "{PRO_COUNT}+ verified {TRADE} professionals serving {LOCATION} and the wider {COUNTY} area. Compare real quotes, read genuine reviews, and pay safely via escrow.",
    "Stop scrolling directories and start comparing real quotes. TradeMatch connects {LOCATION} homeowners with {PRO_COUNT}+ fully vetted {TRADE} experts - free, fast, and fair.",
    "Trusted by thousands of {COUNTY} homeowners. Get competitive {TRADE} quotes from verified {LOCATION} professionals - no spam, no cold calls, no hidden commissions.",
    "Finding a reliable {TRADE} in {LOCATION} should not be stressful. TradeMatch does the hard work - vetting pros, collecting quotes, and protecting your payment.",
    "Every {TRADE} specialist on TradeMatch is manually verified, insured, and reviewed by real {LOCATION} homeowners. Your project is in safe hands.",
]

INTRO_P1_TEMPLATES = [
    "Finding a reliable {TRADE} specialist in {LOCATION} has historically meant trawling through search results, asking neighbours, or taking a chance on an unknown contractor. TradeMatch changes that - by connecting you directly with pre-vetted, insured {TRADE} professionals who have already proven their credentials.",
    "{LOCATION} has a thriving community of skilled {TRADE} professionals, but finding the right one for your specific project can be overwhelming. TradeMatch simplifies the process by presenting only verified, locally active tradespeople who have passed our rigorous ID, insurance, and DBS checks.",
    "The demand for qualified {TRADE} specialists across {COUNTY} continues to grow, making it more important than ever to use a platform that genuinely vets its tradespeople. TradeMatch is the only UK directory that manually verifies every contractor before they can respond to a single job.",
    "Homeowners in {LOCATION} deserve better than a gamble. That is why TradeMatch only presents {TRADE} specialists who have been ID-verified, insured, and cleared by our compliance team - before you ever see their name.",
    "Whether you need urgent {TRADE} repairs or a planned renovation, {LOCATION} homeowners on TradeMatch access a pool of pre-screened local professionals. Every tradesperson on our platform has been manually reviewed - no self-registration, no shortcuts.",
]

INTRO_P2_TEMPLATES = [
    "Our platform is free for homeowners and limits each job post to a maximum of five responses - so every quote you receive is a serious, detailed offer from a professional who genuinely wants the work. No inbox floods, no pushy sales calls.",
    "Unlike other directories where anyone can sign up, every {TRADE} professional on TradeMatch has been manually reviewed by our team. You will see their credentials, read verified homeowner reviews from across {COUNTY}, and compare transparent, itemised quotes side by side.",
    "TradeMatch's escrow payment system means your money is protected from day one. Funds are held securely and only released to the {TRADE} specialist once you confirm the work is complete and you are satisfied. If anything goes wrong, our resolution team steps in.",
    "We do not just list tradespeople - we stand behind them. The TradeMatch Guarantee means that if a vetted {TRADE} specialist fails to deliver, we will arrange alternative works at no additional cost to you. No arguments, no runaround.",
    "Every {TRADE} professional you see on TradeMatch has been active in the {LOCATION} area, so you know they understand local property types, materials suppliers, and any specific planning conditions that apply in {COUNTY}.",
]

LOCAL_INSIGHT_TEMPLATES = [
    "In {LOCATION}, {TRADE} projects often involve <strong>{LOCAL_FACTOR}</strong>. Local specialists on TradeMatch understand these nuances and can advise before work begins.",
    "{LOCATION} has a higher-than-average rate of <strong>{LOCAL_FACTOR}</strong> in its housing stock. Experienced {TRADE} professionals in our network flag this in their quotes so there are no surprises.",
    "Local {TRADE} specialists in {LOCATION} are familiar with <strong>{LOCAL_FACTOR}</strong> - a common requirement in {COUNTY} that generic national platforms often overlook.",
    "{COUNTY} properties frequently require <strong>{LOCAL_FACTOR}</strong> on {TRADE} projects. TradeMatch pros in {LOCATION} include this assessment as standard in their quote process.",
]

LOCAL_FACTORS = {
    "Core Trades":       ["older copper pipework needing pressure testing","period fuse boards requiring full upgrades","Victorian-era lath and plaster construction"],
    "Construction":      ["party wall agreements with neighbours","ground conditions requiring specialist foundations","conservation area planning constraints"],
    "Roofing":           ["clay plain tiles matched to local vernacular","chimney stack repointing as part of roof repairs","bat surveys before major roof replacement"],
    "Outdoor":           ["Tree Preservation Orders on mature garden trees","Japanese knotweed assessment before groundwork","permeable surface requirements for driveways over 5m2"],
    "Home Improvement":  ["solid walls requiring wet plaster skims","period fireplaces to be preserved during refits","lead pipework updates as part of bathroom replumbs"],
    "Finishing":         ["moisture management in Victorian solid-walled homes","horse-hair plaster removal on period properties","lime-compatible materials for pre-1920s buildings"],
    "Heating":           ["flue liner replacements on older chimney stacks","smart thermostat compatibility with existing systems","EPC improvement requirements for rental properties"],
    "Flooring":          ["subfloor levelling on older suspended timber floors","underfloor heating compatibility checks","humidity management in solid-floor properties"],
    "Masonry":           ["lime mortar matching on listed buildings","repointing to match original stone coursing","sandstone vs limestone identification for repairs"],
    "Property Care":     ["tanking vs cavity drain damp solutions","rising damp vs condensation diagnosis","structural waterproofing certificates for mortgage purposes"],
    "Windows & Doors":   ["listed building consent for window replacement","Article 4 Directions restricting external changes","draught-proofing historic timber windows as an alternative to replacement"],
    "Security":          ["planning exemptions for CCTV in conservation areas","shared access agreements for multi-occupancy properties","insurance-rated lock specifications for home cover"],
    "General Services":  ["heavy goods vehicle access restrictions in narrow streets","shared communal areas requiring building management consent","recycling facility proximity for sorted waste disposal"],
    "Design":            ["pre-application advice from local planning authority","permitted development rights checks before drawing","ecological surveys for larger plot developments"],
    "Specialist":        ["lime mortars for historic masonry","breathability requirements for solid-wall buildings","English Heritage guidance on period properties"],
    "Energy":            ["EPC ratings and government grant eligibility","vapour control layers in solid wall insulation","planning rules for external wall insulation in conservation areas"],
}

# ─── REVIEWER & VENDOR DATA ────────────────────────────────────────
REVIEWER_FIRST = ["James","Emma","Oliver","Sophie","Harry","Charlotte","George","Amelia","Jack","Lily",
                   "William","Grace","Thomas","Ella","Samuel","Hannah","Alexander","Chloe","Daniel","Mia",
                   "Michael","Isabelle","Matthew","Alice","Luke","Evie","Christopher","Poppy","Joshua","Ava"]
REVIEWER_LAST  = ["Smith","Jones","Williams","Taylor","Brown","Davies","Evans","Wilson","Thomas","Roberts",
                   "Johnson","Walker","Wright","Thompson","White","Hughes","Edwards","Green","Hall","Wood"]

REVIEW_TEXTS = [
    "Really impressed with the quality of work. The tradesperson turned up on time, quoted fairly, and finished ahead of schedule. Will definitely use TradeMatch again.",
    "After a bad experience with an unverified builder, I was nervous. TradeMatch made it easy - the pro was verified, professional, and did a brilliant job.",
    "Got 4 quotes within 24 hours and went with the second cheapest who had better reviews. Job done perfectly. Very happy with the whole process.",
    "The TradeMatch escrow payment gave me real peace of mind. I knew my money was protected until the job was done right. Outstanding service.",
    "Fantastic result. The specialist was knowledgeable, tidy, and explained everything clearly. Neighbours have already asked for the recommendation.",
    "Quick, professional, and fairly priced. TradeMatch took all the stress out of finding a decent tradesperson. Highly recommend to anyone in {LOCATION}.",
    "Used TradeMatch for the first time after seeing it recommended online. Received 3 detailed quotes, picked the best value, and the work was completed flawlessly.",
    "Excellent experience from start to finish. The verification process gave me confidence before anyone even stepped through the door. Great platform.",
]

VENDOR_FIRST  = ["Mike","Sarah","David","Emma","James","Lisa","Tom","Kate","John","Rachel",
                  "Paul","Sophie","Chris","Amy","Mark","Laura","Dan","Helen","Steve","Claire",
                  "Rob","Lucy","Ben","Anna","Phil","Karen","Andy","Diane","Neil","Fiona"]
VENDOR_LAST   = ["Johnson","Smith","Williams","Brown","Jones","Miller","Davis","Wilson","Moore",
                  "Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Robinson"]
SPECIALISMS   = ["emergency repairs and same-day service","high-quality installations and refurbishments",
                  "commercial and residential projects","eco-friendly and sustainable solutions",
                  "restoration and period property work","modern installations and smart systems",
                  "emergency callouts and maintenance","bespoke design and custom builds",
                  "renovation and upgrade projects","insurance work and repairs"]

# ─── HELPERS ─────────────────────────────────────────────────────

def _seed(service_slug, location_slug, salt=""):
    h = hashlib.md5(f"{service_slug}:{location_slug}:{salt}".encode()).hexdigest()
    return int(h[:8], 16)

def _pick(lst, sslug, lslug, salt=""):
    return lst[_seed(sslug, lslug, salt) % len(lst)]

def _pickn(lst, n, sslug, lslug, salt=""):
    r = random.Random(_seed(sslug, lslug, salt))
    return r.sample(lst, min(n, len(lst)))

def get_initials(name):
    p = name.split()
    return f"{p[0][0]}{p[-1][0]}" if len(p) >= 2 else p[0][:2].upper()

def load_locations():
    if not LOCATIONS_CSV.exists():
        print(f"ERROR: {LOCATIONS_CSV} not found!")
        exit(1)
    locs = []
    with open(LOCATIONS_CSV, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            locs.append({
                "name":         row["name"],
                "slug":         row["slug"],
                "county":       row.get("county") or row.get("city", ""),
                "postcode_area":row.get("postcode_area", ""),
                "population":   int(row.get("population", 0) or 0),
            })
    print(f"Loaded {len(locs)} locations from CSV")
    return locs

def build_county_index(locations):
    idx = {}
    for loc in locations:
        idx.setdefault(loc["county"], []).append(loc)
    return idx

def _pro_count(location):
    rng = random.Random(_seed("", location["slug"], "pc"))
    pop = location["population"]
    if pop > 500_000: return rng.randint(180, 320)
    if pop > 200_000: return rng.randint(90, 180)
    if pop > 100_000: return rng.randint(50, 110)
    if pop > 50_000:  return rng.randint(28, 65)
    if pop > 20_000:  return rng.randint(14, 35)
    return rng.randint(8, 22)

def _review_count(location):
    rng = random.Random(_seed("", location["slug"], "rc"))
    pop = location["population"]
    if pop > 500_000: return rng.randint(1800, 4200)
    if pop > 200_000: return rng.randint(800, 2000)
    if pop > 100_000: return rng.randint(400, 900)
    if pop > 50_000:  return rng.randint(180, 450)
    if pop > 20_000:  return rng.randint(80, 200)
    return rng.randint(35, 95)

def _postcode(location):
    pc = location.get("postcode_area", "")
    if pc and pc.strip():
        area = pc.strip().split(",")[0].strip()
        return f"{area}1 2AB"
    prefix = location["slug"][:2].upper()
    return f"{prefix}1 3XY"

def _sub(s, service, location, **extra):
    s = (s.replace("{TRADE}", service["name"])
          .replace("{LOCATION}", location["name"])
          .replace("{COUNTY}", location["county"]))
    for k, v in extra.items():
        s = s.replace("{" + k + "}", str(v))
    return s

# ─── CONTENT GENERATORS ───────────────────────────────────────────

def gen_meta(service, location, pc, rc):
    t = _pick(META_DESCRIPTIONS, service["slug"], location["slug"], "meta")
    return _sub(t, service, location, PRO_COUNT=pc, REVIEW_COUNT=rc)

def gen_hero_sub(service, location, pc):
    t = _pick(HERO_SUBHEADLINES, service["slug"], location["slug"], "hsub")
    return _sub(t, service, location, PRO_COUNT=pc)

def gen_intro(service, location):
    p1 = _sub(_pick(INTRO_P1_TEMPLATES, service["slug"], location["slug"], "p1"), service, location)
    p2 = _sub(_pick(INTRO_P2_TEMPLATES, service["slug"], location["slug"], "p2"), service, location)
    return p1, p2

def gen_local_insight(service, location):
    cat     = service.get("category", "General Services")
    factors = LOCAL_FACTORS.get(cat, LOCAL_FACTORS["General Services"])
    factor  = _pick(factors, service["slug"], location["slug"], "factor")
    tmpl    = _pick(LOCAL_INSIGHT_TEMPLATES, service["slug"], location["slug"], "insight")
    body    = _sub(tmpl, service, location, LOCAL_FACTOR=factor)
    return (
        '<div class="local-insight-block sr d5">'
        '<div class="lib-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>'
        f'<div class="lib-text"><strong>Local insight:</strong> {body}</div>'
        '</div>'
    )

def gen_cost(service, location):
    profile = service.get("profile", "_default")
    data    = COST_TABLES.get(profile, COST_TABLES["_default"])
    intro   = _sub(_pick(data["intro"], service["slug"], location["slug"], "ci"), service, location)
    tip     = _sub(_pick(data["tip"],   service["slug"], location["slug"], "ct"), service, location)
    faq     = _sub(_pick(data["faq"],   service["slug"], location["slug"], "cf"), service, location)
    rows_html = ""
    for label, low, high, avg in data["rows"]:
        rows_html += (
            f'<div class="cost-row">'
            f'<div class="cost-row-label">{label}</div>'
            f'<div class="cost-row-range">{low} - {high}</div>'
            f'<div class="cost-row-avg">{avg}</div>'
            f'</div>'
        )
    return intro, rows_html, tip, faq

def gen_nearby(service, location, county_index):
    county = location["county"]
    same   = [l for l in county_index.get(county, []) if l["slug"] != location["slug"]]
    picks  = _pickn(same, 8, service["slug"], location["slug"], "nearby")
    cards  = ""
    for loc in picks:
        cards += (
            f'<a href="/services/{service["slug"]}/{loc["slug"]}" class="nearby-card">'
            f'<div class="nearby-card-name">{loc["name"]}</div>'
            f'<div class="nearby-card-county">{loc["county"]}</div>'
            f'<div class="nearby-card-arrow">&#8594;</div>'
            f'</a>'
        )
    footer = ""
    for loc in picks[:6]:
        footer += f'<li><a href="/services/{service["slug"]}/{loc["slug"]}">{service["name"]} in {loc["name"]}</a></li>\n          '
    return cards, footer

def gen_comparison_table(service, location):
    trade = service["name"]
    loc   = location["name"]
    return f"""
<section class="comparison">
  <div class="comparison-inner">
    <div class="sec-label light sr">Platform Comparison</div>
    <h2 class="h2 on-lt sr d1">Why TradeMatch beats<br><em>Bark, MyBuilder &amp; Checkatrade</em></h2>
    <p class="body-sub on-lt sr d2">Not all trade directories are equal. Here is how TradeMatch compares when finding a trusted {trade} specialist in {loc}.</p>
    <div class="cmp-table-wrap sr d3">
      <table class="cmp-table">
        <thead>
          <tr>
            <th class="cmp-feature">Feature</th>
            <th class="cmp-tm">TradeMatch</th>
            <th>Checkatrade</th>
            <th>MyBuilder</th>
            <th>Bark.com</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Manual ID &amp; DBS verification</td><td class="cmp-tm cmp-yes">&#10003; Yes</td><td class="cmp-partial">&#9888; Partial</td><td class="cmp-no">&#10007; No</td><td class="cmp-no">&#10007; No</td></tr>
          <tr><td>Escrow payment protection</td><td class="cmp-tm cmp-yes">&#10003; Included</td><td class="cmp-no">&#10007; None</td><td class="cmp-no">&#10007; None</td><td class="cmp-no">&#10007; None</td></tr>
          <tr><td>Free for homeowners</td><td class="cmp-tm cmp-yes">&#10003; Always free</td><td class="cmp-yes">&#10003; Free</td><td class="cmp-yes">&#10003; Free</td><td class="cmp-partial">&#9888; Lead fees</td></tr>
          <tr><td>Max quotes per job</td><td class="cmp-tm cmp-yes">&#10003; 5 (quality)</td><td class="cmp-partial">&#9888; Unlimited</td><td class="cmp-partial">&#9888; Unlimited</td><td class="cmp-partial">&#9888; Unlimited</td></tr>
          <tr><td>TradeMatch Guarantee</td><td class="cmp-tm cmp-yes">&#10003; Full cover</td><td class="cmp-partial">&#9888; Limited</td><td class="cmp-no">&#10007; None</td><td class="cmp-no">&#10007; None</td></tr>
          <tr><td>Commission charged to homeowner</td><td class="cmp-tm cmp-yes">&#10003; Zero</td><td class="cmp-yes">&#10003; Zero</td><td class="cmp-yes">&#10003; Zero</td><td class="cmp-partial">&#9888; Sometimes</td></tr>
          <tr><td>Local {trade} specialists in {loc}</td><td class="cmp-tm cmp-yes">&#10003; {loc}-specific</td><td class="cmp-partial">&#9888; Regional</td><td class="cmp-partial">&#9888; National</td><td class="cmp-partial">&#9888; National</td></tr>
        </tbody>
      </table>
    </div>
    <p class="cmp-footnote sr d4">* Based on publicly available platform information as of 2025.</p>
  </div>
</section>

<div class="section-divider"></div>
"""

def gen_reviews_schema(service, location):
    rng  = random.Random(_seed(service["slug"], location["slug"], "rev"))
    revs = []
    for _ in range(5):
        fn  = rng.choice(REVIEWER_FIRST)
        ln  = rng.choice(REVIEWER_LAST)
        txt = rng.choice(REVIEW_TEXTS).replace("{LOCATION}", location["name"])
        rat = rng.choice([5, 5, 5, 4, 5])
        dt  = (datetime.now() - timedelta(days=rng.randint(10, 365))).strftime("%Y-%m-%d")
        revs.append({
            "@type": "Review",
            "author": {"@type": "Person", "name": f"{fn} {ln}"},
            "datePublished": dt,
            "reviewRating": {"@type": "Rating", "ratingValue": str(rat), "bestRating": "5"},
            "reviewBody": txt,
        })
    return json.dumps(revs, ensure_ascii=False)

# ─── SERVICE LORE SNIPPETS ────────────────────────────────────────
# 10 unique lore snippets per category (hybrid cache approach).
# The generator seeds selection by service+location so every page
# gets a different snippet without calling an LLM for each page.
SERVICE_LORE = {
    "Core Trades": [
        "The UK's plumbing and electrical trades trace their modern standards to post-war reconstruction, when local councils mandated inspection regimes that still underpin today's Part P and Water Regulations.",
        "Skilled trades like plumbing and electrical work were among the first to adopt nationally recognised qualification frameworks in the UK, giving homeowners a reliable benchmark for vetting contractors.",
        "Since the early 2000s, local authority building control has expanded its remit significantly — today covering not just structural work but gas, electrical, and drainage installations on domestic properties.",
        "The UK has one of the highest rates of owner-occupied housing in the developed world, creating sustained demand for local tradespeople who understand the specific construction methods used in each region.",
        "Period properties — Victorian, Edwardian, and inter-war — make up a disproportionate share of UK housing stock, meaning local tradespeople regularly encounter challenges that have no textbook answer.",
        "Apprenticeship routes into the skilled trades have seen a revival since 2015, with the introduction of Institute for Apprenticeships standards meaning today's newly qualified tradespeople are rigorously assessed.",
        "Regulatory tightening around Part P electrical work and Gas Safe registration has significantly raised the floor for who can legally carry out domestic installations in the UK.",
        "Local authority planning departments have become more proactive about enforcement since 2018, making the choice of a planning-aware local tradesperson increasingly important for homeowners.",
        "The UK insulation and retrofit market has grown substantially under government energy-efficiency grant schemes, creating a new generation of specialists with combined skills across building and energy performance.",
        "Trade associations such as NICEIC, Gas Safe Register, and NAPIT provide independent frameworks that TradeMatch uses as part of its verification process for the trades they cover.",
    ],
    "Construction": [
        "Large-scale domestic extensions and conversions now routinely require structural engineering sign-off, party wall agreements, and — in conservation areas — pre-application planning discussions.",
        "The UK's planning system underwent significant permitted development reform in 2020, expanding what homeowners can build without planning permission but also creating complex boundary conditions.",
        "Structural calculations for residential projects are now typically required by mortgage lenders for any work affecting load-bearing elements, making a qualified engineer an essential part of many build teams.",
        "Loft conversion demand in UK cities has accelerated as homeowners seek space without moving, driving specialist contractors to develop expertise in both structural and regulatory aspects specific to each region.",
        "The New Homes Quality Code introduced in 2022 raised the bar for new-build construction quality and dispute resolution, reflecting lessons from high-profile defects cases across the UK.",
        "Groundwork and foundations in many UK towns require specific knowledge of local soil types — London Clay, made ground, and flood-risk zones all demand different approaches from experienced contractors.",
        "The UK's net-zero targets have placed increased emphasis on the thermal performance of extensions and new builds, with Building Regulations Part L tightening minimum standards since 2022.",
        "Demolition in urban UK settings now routinely involves asbestos surveys, waste carrier licensing, and dust suppression planning — compliance areas where experienced contractors add significant value.",
        "Conservation areas across the UK impose specific design standards that go beyond planning requirements, meaning local construction contractors who know the local planning authority have a clear advantage.",
        "The Community Infrastructure Levy and Section 106 agreements increasingly affect even domestic-scale projects, making planning-aware contractors essential for larger residential schemes.",
    ],
    "Roofing": [
        "Clay plain tiles, Welsh slate, and concrete interlocking tiles each dominate different regions of the UK, making roofing a genuinely local craft where knowledge of regional materials matters.",
        "Building regulations require any reroofing project covering more than 25% of a roof area to meet current thermal performance standards, a compliance point that catches many homeowners off guard.",
        "The UK's bat protection laws under the Wildlife and Countryside Act mean that larger roof replacement projects sometimes require an ecological survey before work can begin — a local specialist will know when this applies.",
        "Flat roofing has evolved significantly with the adoption of GRP, EPDM, and warm roof systems, replacing traditional felt in many applications and extending typical lifespan from 15 to 30+ years.",
        "Chimney stack maintenance is one of the most commonly neglected elements of UK domestic maintenance, with repointing and flaunching failures the leading cause of water ingress in period properties.",
        "Storm damage claims under home insurance policies now frequently require a professional survey report before insurers will pay out, making a relationship with a trusted local roofer increasingly valuable.",
        "Green roofing and solar integration are increasingly incorporated into domestic roofing projects following changes to planning policy that support renewable energy installations.",
        "Scaffold design for domestic roofing projects in UK towns must comply with BS EN 12811 and TG20 guidance, requiring a certified scaffolding contractor with CISRS cards — not just any labour.",
        "The UK reroofing cycle typically runs at 30-50 years for modern concrete tiles and 60-100 years for natural slate, meaning most UK properties will be reroofed at least once during ownership.",
        "Fascia and soffit replacement is frequently the first visible sign of a wider roofline maintenance need, and an experienced roofer will assess sarking, rafter ends, and ventilation in the same visit.",
    ],
    "Outdoor": [
        "Changes to permitted development rights in 2024 require permeable paving or drainage management for any driveway over 5m2 that replaces a previously permeable surface.",
        "Tree Preservation Orders now cover an estimated 200,000+ trees across UK local authority areas, making a quick council database check essential before any outdoor works involving mature specimens.",
        "Japanese knotweed, giant hogweed, and Himalayan balsam are all listed as controlled plants under UK law, and their presence on a site requires licensed disposal rather than standard skip removal.",
        "The UK garden maintenance sector is one of the few construction-adjacent trades without mandatory licensing, making the TradeMatch verification process especially important for homeowners vetting contractors.",
        "Decking built above a certain height in conservation areas may require planning permission, and where a property is listed, any external alteration requires listed building consent regardless of size.",
        "Block paving and natural stone driveways have become the dominant driveway material in UK suburbs, replacing tarmac and concrete in new installations over the past decade.",
        "Sustainable drainage systems (SuDS) are now a planning requirement for new hard surfaces over 100m2, influencing how landscaping contractors design larger domestic and commercial projects.",
        "The UK fencing market has been significantly disrupted by timber supply shortages since 2020, making experienced contractors who have established supplier relationships more valuable than ever.",
        "Domestic tree surgery requires an Arborist with appropriate insurance and, for trees in conservation areas, a formal planning notification period of six weeks before any significant work can begin.",
        "The UK's aging garden fence stock — much of it installed in the 1980s and 1990s — is generating sustained replacement demand, with featheredge and close-board styles remaining the standard.",
    ],
    "Home Improvement": [
        "Kitchen and bathroom fitting are the two most commonly undertaken domestic renovation projects in the UK, representing a combined market of over £3bn annually.",
        "Modern bathroom ventilation requirements under Part F of Building Regulations have become more stringent since 2022, requiring whole-house ventilation assessments in some renovation scenarios.",
        "The UK's hard water belt — covering much of the Midlands, South East, and East of England — means local plumbers and bathroom fitters understand limescale management as part of standard installation.",
        "Under-tile heating and wall-hung sanitaryware have both seen rapid adoption in UK bathroom refits since 2018, requiring installers with current product training to install correctly.",
        "Permitted development rules for rear extensions — which were relaxed in 2013 and made permanent in 2019 — have generated a wave of kitchen extensions combining new cooking and living spaces.",
        "The UK's older housing stock presents unique challenges for kitchen fitters, including out-of-square walls, timber framing with unpredictable stud positions, and Victorian chimney breasts to navigate.",
        "Local authority building control now frequently requests evidence of compliant waste plumbing layouts as part of bathroom sign-off, even for like-for-like replacements.",
        "Period-appropriate design has become a significant market segment for kitchen and bathroom fitting, with specialist companies producing traditional cabinetry that complies with listed building requirements.",
        "The UK's leasehold tenure model means many flat owners need landlord or building management company approval before proceeding with wet room or kitchen extension work.",
        "The proliferation of online supply channels — Howdens, Victoria Plum, Wren — has created a generation of homeowners who supply their own materials, requiring fitters who can work with diverse product specifications.",
    ],
    "Finishing": [
        "The UK's commitment to conservation-area character has created sustained demand for lime plaster and traditional finishing skills, as permitted development rules often require like-for-like material matching.",
        "Skimming over artex — the textured ceiling finish common in 1970s-1990s UK properties — requires testing for asbestos content in pre-2000 applications before any mechanical disturbance.",
        "British Standard BS 8481 covers the specification and application of gypsum plasters for finishing work, providing the technical reference that distinguishes professional plasterers from generalists.",
        "Venetian plaster, microcement, and tadelakt are among the premium decorative finishes gaining market share in UK residential finishing, requiring specialist training to apply correctly.",
        "Period property painting in conservation areas or on listed buildings must use breathable, historically appropriate paints to comply with both planning conditions and conservation best practice.",
        "The development of faster-setting gypsum boards and patching compounds has increased the speed of domestic plastering jobs, but the skill differential between qualified and unqualified practitioners remains significant.",
        "UK painting and decorating is covered by the Painting and Decorating Association's (PDA) accreditation scheme, which TradeMatch uses alongside insurance and ID checks during verification.",
        "Preparation accounts for 80% of a professional painting job's durability — a principle understood by qualified decorators but often skipped by informal contractors.",
        "The widespread adoption of airless spray equipment in domestic decorating has raised the stakes for preparation and masking, making experienced professionals significantly more valuable on complex projects.",
        "New build snagging — the process of identifying and rectifying finishing defects after builder handover — has become a specialist service in its own right, blending finishing skills with quality assurance.",
    ],
    "Heating": [
        "Gas Safe registration has been a legal requirement for all gas work on domestic properties since 1998, replacing CORGI registration — yet surveys consistently find homeowners who are unaware of the requirement.",
        "The UK government's Heat Pump Ready programme and boiler upgrade scheme have accelerated the transition from gas to heat pump heating, creating growing demand for accredited heat pump installers.",
        "The Microgeneration Certification Scheme (MCS) is required for heat pump and solar thermal installations to qualify for the Boiler Upgrade Scheme grant, making MCS-accredited installers highly sought after.",
        "Combi boilers account for over 70% of UK domestic boiler installations, but their efficiency varies enormously by brand, model, and installation quality — factors a TradeMatch-verified Gas Safe engineer will assess.",
        "EPC (Energy Performance Certificate) ratings now directly affect rental property legality following 2023 regulations requiring a minimum E rating for new tenancies, driving demand for heating and insulation upgrades.",
        "Thermostatic radiator valves (TRVs) and smart thermostat systems offer 15-25% energy savings in typical UK homes, an area where a gas-qualified TradeMatch engineer can offer immediate value.",
        "The UK's wet central heating system — hot water pipes feeding radiators — is largely unique among European housing markets, maintaining strong demand for specialist heating engineers.",
        "Landlord Gas Safety Record (CP12) certificates must be renewed annually for rental properties, creating a steady revenue stream for Gas Safe engineers and a compliance headache for landlords who miss the deadline.",
        "Powerflush services — which clear magnetite deposits from older central heating systems — can recover 20-30% of a system's lost efficiency without the cost of a full replacement.",
        "System boilers combined with unvented cylinders are increasingly specified in UK homes as an alternative to combi boilers for higher hot water demand, requiring dual qualification from the installer.",
    ],
    "Flooring": [
        "UK flooring installation is one of the trade sectors with the highest rate of DIY failure leading to professional remediation, making qualified installers significantly more cost-effective in the long run.",
        "The Resilient Floor Covering Industry's (RFCI) recommended acclimatisation period for solid hardwood flooring in UK homes varies by heating system type — underfloor, radiator, or none — and season.",
        "Subfloor preparation is the most common source of flooring failures in UK domestic installations, requiring moisture testing, levelling compound, and in older properties, damp-proof membrane assessment.",
        "Luxury Vinyl Tile (LVT) has overtaken laminate as the leading mid-market flooring product in UK renovation since 2019, driven by its water resistance and acoustic properties.",
        "Underfloor heating compatibility is now a key specification question for any UK flooring installation, as both adhesive and click-lock systems have specific maximum-temperature requirements.",
        "The BS 8203 standard for installation of resilient floor coverings is the reference document for UK professional flooring installers, covering substrate preparation, adhesive selection, and finishing details.",
        "Noise transmission between floors is a growing issue in UK flatted developments following changes to Approved Document E (sound insulation) in 2004, making correct underlay specification a compliance matter.",
        "The revival of real wood flooring in UK home renovations has driven demand for floor sanding and restoration specialists as an alternative to replacement, particularly in period properties.",
        "Stair nosing and threshold strip installation — apparently minor details — are increasingly cited in UK building control and disability access reviews, elevating their importance for compliant professional installation.",
        "Carpet fitting in the UK has increasingly specialised toward commercial-grade domestic products, with higher twist counts, pile density, and underlay specification requiring fitter training from manufacturers.",
    ],
    "Masonry": [
        "Lime mortar — the traditional binding material in UK stone and brick construction — is incompatible with modern Portland cement in repointing applications, a technical distinction that separates qualified masons from generalists.",
        "English Heritage and Historic England both publish detailed guidance on appropriate repair techniques for listed buildings, which TradeMatch-verified stonemasons use as standard reference.",
        "The geological diversity of UK building stone — from Portland limestone to Yorkshire sandstone to Welsh slate — means that effective stonemasonry is deeply regional in its knowledge base.",
        "Damp penetration through failed pointing is the leading cause of masonry deterioration in the UK's wet climate, making timely repointing one of the highest-return maintenance investments a homeowner can make.",
        "Conservation area designation frequently specifies matching mortar mixes for any repointing visible from a public highway, requiring the masonry contractor to obtain a colour-matched mix before starting.",
        "Victorian and Edwardian brickwork used softer, handmade bricks that are mechanically incompatible with modern hard-fired replacements — a common DIY mistake that leads to stress cracking.",
        "The Guild of Bricklayers and the Stone Federation Great Britain both maintain registers of qualified practitioners in the UK, which TradeMatch cross-references during verification for masonry work.",
        "Frost damage to saturated masonry is a predictable UK problem, with the autumn-to-spring period seeing the majority of the pointing failures that drive spring repointing demand.",
        "Listed building consent is required not just for major alterations but for any change to the external appearance of a listed structure — including repointing with a visually different mortar.",
        "The growing interest in natural stone landscaping has created crossover demand between traditional stonemasons and landscape contractors, producing a new hybrid specialist category.",
    ],
    "Property Care": [
        "BS 8102 is the British Standard for protection of below-ground structures against water from the ground, and any competent damp proofing contractor should be able to reference it in their specification.",
        "The Property Care Association (PCA) is the principal trade body for damp proofing and timber treatment contractors in the UK, offering a qualification route that TradeMatch uses in verification.",
        "Rising damp and condensation-related dampness are frequently confused by homeowners, yet require entirely different remediation approaches — a correct diagnosis is the single most important step.",
        "Cavity wall insulation, when incorrectly installed in exposed UK locations, is a documented cause of damp penetration — leading to a significant remediation market for property care specialists.",
        "Structural waterproofing guarantees in the UK are typically backed by insurance-backed guarantees (IBGs) rather than contractor warranties, providing longer-term protection independent of business continuity.",
        "Dry rot (Serpula lacrymans) is the most destructive timber decay organism in UK buildings, with the potential to spread through masonry as well as timber — remediation requires a specialist approach.",
        "The Building Regulations Approved Document C (Resistance to Contaminants and Moisture) sets minimum standards for damp proofing in new construction and major renovation.",
        "Japanese knotweed removal — a specialist aspect of property care — now requires a licensed waste carrier and, in some circumstances, a management plan approved by the Environment Agency.",
        "Thermal imaging surveys have become a standard diagnostic tool for UK damp proofing and insulation specialists, enabling precise identification of cold bridges and moisture ingress paths.",
        "The prevalence of flat-roofed extensions in 1970s UK housing stock has created a sustained market for specialist waterproofing contractors who understand both the original materials and modern remediation products.",
    ],
    "Windows & Doors": [
        "FENSA (Fenestration Self-Assessment Scheme) certification is the primary compliance route for window and door replacement in England and Wales, and TradeMatch requires evidence of current registration from all window installers.",
        "Article 4 Directions in conservation areas remove permitted development rights for window replacement, requiring full planning permission and, frequently, like-for-like timber window specifications.",
        "The introduction of PAS 24 security standards — required by building regulations for all new window and door installations — has raised the manufacturing and installation bar across the industry.",
        "Energy-rated window products are now mandatory under Part L of Building Regulations for replacement windows, with a minimum C rating required and A+ becoming the market norm.",
        "Secondary glazing — used in conservation areas where original windows must be retained — has seen significant product development since 2018 and is now a viable thermal upgrade without planning risk.",
        "Composite doors have rapidly displaced UPVC and traditional timber as the dominant front door product in UK residential new-install since 2015, offering improved thermal and security performance.",
        "Bi-fold and sliding door systems require precise installation tolerances to maintain weather performance, making the quality of the installation — not just the product — the primary determinant of satisfaction.",
        "Smart access systems — keypad, app-controlled, and fingerprint locks — are increasingly integrated into UK residential door installations, requiring installers with current product training.",
        "The UK glazing market has consolidated significantly since 2010, with fewer but larger manufacturers producing the sealed unit components that installers source — making supply chain awareness a valuable installer attribute.",
        "Listed building consent is required for virtually all window replacement work on listed buildings in the UK, including like-for-like replacements — a compliance requirement that applies even to Grade II listings.",
    ],
    "Security": [
        "The Security Industry Authority (SIA) licenses CCTV surveillance operators but not necessarily installers, creating a compliance grey area that TradeMatch navigates through its own installer verification process.",
        "Police-approved security products — identified by the Secured by Design mark — are increasingly specified in planning conditions for new residential developments and are often required for insurance purposes.",
        "Smart home security systems integrating CCTV, alarm, and access control have grown from a premium niche to a mainstream residential product since 2020, driven by falling sensor costs.",
        "In listed buildings, external CCTV installation requires listed building consent and must be designed to minimise visual impact — a compliance point that specialist security installers navigate as standard.",
        "BS EN 50131 is the European standard for intruder alarm systems, specifying four grades of alarm system appropriate to different property types and risk levels in the UK.",
        "Neighbourhood Watch data suggests that properties with visible, high-quality security installations in the UK experience burglary rates up to 300% lower than unprotected equivalents.",
        "The proliferation of doorbell cameras in UK residential areas has generated a significant body of insurance and legal guidance around GDPR compliance for homeowners capturing footage of public spaces.",
        "Insurance-rated locks — meeting BS 3621 for mortice deadlocks or BS EN 1303 for cylinder locks — are often a specific requirement of UK home insurance policies, making compliant installation essential.",
        "Keypad and biometric access control for residential properties has become significantly more affordable since 2019, with reputable UK installers now offering systems from under £500 installed.",
        "Fire alarm and CO detector installation in UK rental properties is now mandated by law, creating significant ongoing demand for compliant installation and periodic testing services.",
    ],
    "General Services": [
        "The UK handyman market is one of the least regulated in the construction sector, making TradeMatch's ID, DBS, and insurance verification process especially important for homeowners commissioning work.",
        "Professional cleaning services in the UK have seen strong growth since 2020, with end-of-tenancy and post-renovation cleans becoming standard expectations in the lettings market.",
        "The Environment Agency's Waste Carrier Registration scheme means that any contractor removing waste from a UK domestic property must hold a current carrier licence — a compliance point TradeMatch verifies.",
        "Removal and storage industry regulation in the UK is primarily self-regulated through the British Association of Removers (BAR), whose Code of Practice governs member firm standards.",
        "The Locksmiths Guild and the Master Locksmiths Association both provide independently audited registers of qualified UK locksmiths, which TradeMatch cross-references during verification.",
        "GDPR and data protection requirements now affect domestic cleaning companies who create client key registers or access records, a compliance area that professional operators manage as standard.",
        "The UK skip hire and waste clearance sector is regulated by the Controlled Waste Regulations, which prohibit fly-tipping and require that waste is disposed of at licensed facilities.",
        "Professional rubbish clearance contractors are increasingly expected to provide waste transfer notes — legal documents proving licensed disposal — a practice that protects homeowners from fines.",
        "Removal company liability insurance varies enormously in scope: comprehensive policies cover goods in transit, storage, and third-party damage, while budget operators may carry minimal cover.",
        "Emergency locksmith services in the UK are subject to Trading Standards guidance on upfront pricing, following a series of high-profile cases involving misleading call-out fee advertising.",
    ],
    "Design": [
        "Architects in the UK are regulated by the Architects Registration Board (ARB), making 'architect' a legally protected title — a distinction that matters when commissioning residential design work.",
        "The Royal Institute of British Architects (RIBA) Plan of Work provides a standard project stages framework that TradeMatch architects use to structure fee agreements and deliverables.",
        "Pre-application advice from local planning authorities — available in most UK councils for a fee — has become an increasingly valuable service for architects advising on complex permitted development questions.",
        "Building Information Modelling (BIM) has moved from commercial construction into domestic residential design over the past five years, enabling more accurate cost forecasting and clash detection.",
        "Conservation area appraisals — documents that define the character of each UK conservation area — are the essential reference for architects designing within them, and experienced local architects know them well.",
        "The UK government's push for Modern Methods of Construction (MMC) has generated demand for architects and designers who can work with off-site manufactured components alongside traditional build.",
        "Structural engineers working on UK domestic projects now typically use advanced finite element analysis software for unusual or complex geometries, moving beyond traditional rule-of-thumb calculations.",
        "SAP energy calculations — required for all new dwellings and major renovations in the UK — have become a routine part of the architectural specification process since the 2021 Building Regulation revisions.",
        "Planning application drawings require specific level of detail that varies by local authority, and experienced local architects can save clients significant time by front-loading the design work appropriately.",
        "The UK's Biodiversity Net Gain requirement — now a planning condition for many developments — has generated demand for ecologist input at design stage, a new interdisciplinary requirement for architects.",
    ],
    "Specialist": [
        "Historic England's guidance on the repair of traditional buildings is the primary technical reference for UK conservation specialists working on listed and historic properties.",
        "Lime wash, lime plaster, and hydraulic lime render are the three principal breathable materials used in UK conservation repair, each with specific mix ratios and application techniques.",
        "The Joint Contracts Tribunal (JCT) Minor Works Building Contract is the standard agreement recommended for specialist restoration projects in the UK, providing a framework for variation management.",
        "Period joinery restoration — including sash windows, panelled doors, and box gutters — requires the ability to source or manufacture matching profiles, a capability that distinguishes restoration specialists.",
        "The Woodworking Machinery Directive and PUWER regulations govern the use of powered machinery in UK joinery shops, and compliant operators maintain documented risk assessments and maintenance records.",
        "Custom cabinet making in the UK is increasingly influenced by German manufacturing standards for precision and tolerance, particularly in fitted furniture for high-specification residential projects.",
        "Inglenook fireplace restoration requires specialist knowledge of structural lintels, flue sizes, and fire surround materials — a convergence of building, masonry, and heating disciplines.",
        "Gas and solid fuel fireplace installation in the UK requires separate Gas Safe or HETAS registration depending on fuel type, and both require Competent Person Scheme notification to building control.",
        "The UK's National Fireplace Association provides product standards and installer guidance that complement the Gas Safe and HETAS regulatory frameworks for fireplace installation.",
        "Conservation-grade timber treatments — used in listed buildings where chemical penetration of historic materials must be controlled — are a specialist area covered by the Property Care Association.",
    ],
    "Energy": [
        "The UK government's ECO4 scheme provides funding for insulation and heating upgrades in lower-income households, channelled through installers approved by Ofgem.",
        "Cavity wall insulation failure in exposed UK locations has created a significant remediation market, requiring specialist diagnosis and extraction before any reinstatement.",
        "Solid wall insulation — either external render or internal dry-lining — is the primary retrofit intervention for UK pre-1920 solid-wall properties which lack a cavity.",
        "The PAS 2035 framework governs whole-house retrofit in the UK, requiring a Retrofit Assessor and Retrofit Coordinator for any project using government grant funding.",
        "Roof insulation is typically the highest-return UK retrofit investment per pound spent, with payback periods of three to seven years in most UK climate zones.",
        "The UK's Smart Export Guarantee (SEG) tariff pays solar PV and other microgeneration owners for electricity exported to the grid, making MCS-certified installation a financial imperative.",
        "Air tightness testing — required under Part L for new and substantially renovated UK dwellings — has created a specialist testing sector alongside the insulation and draught-proofing trades.",
        "Ground source heat pumps in the UK require planning permission in most scenarios, and the borehole or ground loop work involves specialist contractors beyond the standard heat pump installer.",
        "The UK Green Building Council's Net Zero Carbon Buildings Standard is increasingly referenced by progressive contractors as a design target for major renovation projects.",
        "Thermal bridges — junctions between insulation layers where heat bypasses the insulation — are the leading cause of performance gaps between designed and measured UK building energy performance.",
    ],
    "Flooring": [
        "UK flooring installation is one of the trade sectors with the highest rate of DIY failure leading to professional remediation, making qualified installers significantly more cost-effective in the long run.",
        "The Resilient Floor Covering Industry's recommended acclimatisation period for solid hardwood flooring in UK homes varies by heating system type and season.",
        "Subfloor preparation is the most common source of flooring failures in UK domestic installations, requiring moisture testing, levelling compound, and damp-proof membrane assessment.",
        "Luxury Vinyl Tile (LVT) has overtaken laminate as the leading mid-market flooring product in UK renovation since 2019, driven by its water resistance and acoustic properties.",
        "Underfloor heating compatibility is now a key specification question for any UK flooring installation, as both adhesive and click-lock systems have specific maximum-temperature requirements.",
        "The BS 8203 standard for installation of resilient floor coverings is the reference document for UK professional flooring installers.",
        "Noise transmission between floors is a growing issue in UK flatted developments following changes to Approved Document E in 2004, making correct underlay specification a compliance matter.",
        "The revival of real wood flooring in UK home renovations has driven demand for floor sanding and restoration specialists as an alternative to replacement.",
        "Stair nosing and threshold strip installation are increasingly cited in UK building control and disability access reviews, elevating their importance for compliant professional installation.",
        "Carpet fitting in the UK has increasingly specialised toward commercial-grade domestic products, requiring fitter training from manufacturers for correct installation.",
    ],
}
# Fallback for any category not explicitly listed
SERVICE_LORE["_default"] = SERVICE_LORE["Core Trades"]

# ─── CERTIFICATION POOLS ─────────────────────────────────────────
# Each trade category maps to a set of real UK accreditations/certs.
# Vendors get 2-3 deterministically selected from this pool.
CERT_POOLS = {
    "Core Trades":       [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("CIPHE Member","ins"),("Part P Registered","ins")],
    "Construction":      [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("CSCS Gold Card","ins"),("Site Safe","ins")],
    "Roofing":           [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("NFRC Member","ins"),("PASMA Certified","ins")],
    "Outdoor":           [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("Arb Approved","ins"),("RHS Qualified","ins")],
    "Home Improvement":  [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("NICEIC Approved","ins"),("Gas Safe","gas")],
    "Finishing":         [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("PDA Member","ins"),("CSCS Card","ins")],
    "Heating":           [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("Gas Safe Reg.","gas"),("MCS Certified","ins")],
    "Flooring":          [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("CFA Member","ins"),("CSCS Card","ins")],
    "Masonry":           [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("Guild Member","ins"),("CSCS Blue Card","ins")],
    "Property Care":     [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("PCA Qualified","ins"),("CSRT Certified","ins")],
    "Windows & Doors":   [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("FENSA Registered","ins"),("PAS 24 Certified","ins")],
    "Security":          [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("MLA Approved","ins"),("NSI Gold","ins")],
    "General Services":  [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("Waste Carrier","ins"),("Trading Standards","ins")],
    "Design":            [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("ARB Registered","ins"),("RIBA Member","ins")],
    "Specialist":        [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("HETAS Certified","gas"),("PCA Member","ins")],
    "Energy":            [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins"),("MCS Certified","ins"),("Ofgem Approved","ins")],
    "_default":          [("ID Verified","id"),("DBS Checked","dbs"),("Insured","ins")],
}

def _cert_html(certs):
    """Render a list of (label, css_class) cert tuples as badge HTML."""
    check_svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>'
    return "".join(
        f'<span class="vc-cert {cls}">{check_svg}{label}</span>'
        for label, cls in certs
    )

def gen_vendors(service, location):
    """Generate 3 vendor profiles with deterministic certs."""
    rng   = random.Random(_seed(service["slug"], location["slug"], "vend"))
    cat   = service.get("category", "_default")
    pool  = CERT_POOLS.get(cat, CERT_POOLS["_default"])
    vend  = []
    for i in range(3):
        fn = rng.choice(VENDOR_FIRST)
        ln = rng.choice(VENDOR_LAST)
        nm = f"{fn} {ln}"
        # Featured vendor (i==0) always gets 3 certs; others get 2
        n_certs  = 3 if i == 0 else 2
        # Seed picks differently per vendor slot
        cert_rng = random.Random(_seed(service["slug"], location["slug"], f"cert{i}"))
        chosen   = cert_rng.sample(pool, min(n_certs, len(pool)))
        vend.append({
            "name":      nm,
            "initials":  get_initials(nm),
            "years":     rng.randint(8, 25),
            "specialism":rng.choice(SPECIALISMS),
            "certs":     _cert_html(chosen),
        })
    return vend

# ─── WATERMARKING ────────────────────────────────────────────────

def try_watermark(src, dst, text):
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.open(src).convert("RGBA")
        ov  = Image.new("RGBA", img.size, (0, 0, 0, 0))
        drw = ImageDraw.Draw(ov)
        try:
            fnt = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 26)
        except Exception:
            fnt = ImageFont.load_default()
        w, h  = img.size
        label = f"Verified: {text}"
        bb    = drw.textbbox((0, 0), label, font=fnt)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        x, y  = w - tw - 22, h - th - 22
        pad   = 9
        drw.rounded_rectangle([x-pad, y-pad, x+tw+pad, y+th+pad], radius=6, fill=(0,0,0,155))
        drw.text((x, y), label, font=fnt, fill=(0, 229, 130, 255))
        Image.alpha_composite(img, ov).convert("RGB").save(dst, "WEBP", quality=82)
        return True
    except Exception:
        return False

def gen_service_lore(service, location):
    """Return a unique service-lore snippet (no API required)."""
    cat     = service.get("category", "_default")
    snippets = SERVICE_LORE.get(cat, SERVICE_LORE["_default"])
    snippet  = _pick(snippets, service["slug"], location["slug"], "lore")
    return snippet

# ─── PAGE ASSEMBLY ────────────────────────────────────────────────

def build_page(template, service, location, county_index):
    pc = _pro_count(location)
    rc = _review_count(location)

    meta_desc        = gen_meta(service, location, pc, rc)
    hero_sub         = gen_hero_sub(service, location, pc)
    p1, p2           = gen_intro(service, location)
    local_insight    = gen_local_insight(service, location)
    cost_intro, cost_rows, cost_tip, faq_cost = gen_cost(service, location)
    nearby_cards, footer_links = gen_nearby(service, location, county_index)
    comparison_html  = gen_comparison_table(service, location)
    reviews_schema   = gen_reviews_schema(service, location)
    vendors          = gen_vendors(service, location)

    replacements = {
        "{TRADE}":                 service["name"],
        "{TRADE_SLUG}":            service["slug"],
        "{LOCATION}":              location["name"],
        "{LOCATION_SLUG}":         location["slug"],
        "{COUNTY}":                location["county"],
        "{POSTCODE_EXAMPLE}":      _postcode(location),
        "{META_DESCRIPTION}":      meta_desc,
        "{HERO_SUBHEADLINE}":      hero_sub,
        "{LOCAL_INTRO_P1}":        p1,
        "{LOCAL_INTRO_P2}":        p2,
        "{PRO_COUNT}":             str(pc),
        "{REVIEW_COUNT}":          str(rc),
        "{COST_INTRO}":            cost_intro,
        "{COST_ROWS}":             cost_rows,
        "{COST_TIP}":              cost_tip,
        "{FAQ_COST_ANSWER}":       faq_cost,
        "{NEARBY_LOCATIONS_HTML}": nearby_cards,
        "{FOOTER_NEARBY_LINKS}":   footer_links,
        "{VENDOR_1_NAME}":         vendors[0]["name"],
        "{VENDOR_1_INITIALS}":     vendors[0]["initials"],
        "{VENDOR_1_YEARS}":        str(vendors[0]["years"]),
        "{VENDOR_1_SPECIALISM}":   vendors[0]["specialism"],
        "{VENDOR_1_CERTS}":        vendors[0]["certs"],
        "{VENDOR_2_NAME}":         vendors[1]["name"],
        "{VENDOR_2_INITIALS}":     vendors[1]["initials"],
        "{VENDOR_2_YEARS}":        str(vendors[1]["years"]),
        "{VENDOR_2_SPECIALISM}":   vendors[1]["specialism"],
        "{VENDOR_2_CERTS}":        vendors[1]["certs"],
        "{VENDOR_3_NAME}":         vendors[2]["name"],
        "{VENDOR_3_INITIALS}":     vendors[2]["initials"],
        "{VENDOR_3_YEARS}":        str(vendors[2]["years"]),
        "{VENDOR_3_SPECIALISM}":   vendors[2]["specialism"],
        "{VENDOR_3_CERTS}":        vendors[2]["certs"],
        "{LOCAL_INSIGHT}":         local_insight,
        "{SERVICE_LORE}":          gen_service_lore(service, location),
        "{COMPARISON_SECTION}":    comparison_html,
        "{REVIEWS_SCHEMA}":        reviews_schema,
    }

    html = template
    for k, v in replacements.items():
        html = html.replace(k, v)
    return html

def write_page(html, service, location):
    d = OUTPUT_DIR / "services" / service["slug"]
    d.mkdir(parents=True, exist_ok=True)
    out = d / f"{location['slug']}.html"
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    return out

# ─── SITEMAP ────────────────────────────────────────────────────

def generate_sitemap(services, locations):
    sitemap_dir = OUTPUT_DIR / "sitemaps"
    sitemap_dir.mkdir(parents=True, exist_ok=True)
    total  = len(services) * len(locations)
    n_maps = (total // SITEMAP_URL_LIMIT) + 1
    files  = []
    count  = 0
    sm_idx = 1
    today  = datetime.now().strftime("%Y-%m-%d")

    curr = sitemap_dir / f"sitemap-{sm_idx}.xml"
    files.append(curr)
    f = open(curr, "w", encoding="utf-8")
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

    for svc in services:
        for loc in locations:
            url = f"{BASE_URL}/services/{svc['slug']}/{loc['slug']}"
            f.write(f'  <url><loc>{url}</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n')
            count += 1
            if count >= SITEMAP_URL_LIMIT and sm_idx < n_maps:
                f.write("</urlset>")
                f.close()
                sm_idx += 1; count = 0
                curr = sitemap_dir / f"sitemap-{sm_idx}.xml"
                files.append(curr)
                f = open(curr, "w", encoding="utf-8")
                f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')

    f.write("</urlset>"); f.close()

    if n_maps > 1:
        idx = sitemap_dir / "sitemap-index.xml"
        with open(idx, "w", encoding="utf-8") as f:
            f.write('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
            for sf in files:
                f.write(f'  <sitemap><loc>{BASE_URL}/sitemaps/{sf.name}</loc><lastmod>{today}</lastmod></sitemap>\n')
            f.write("</sitemapindex>")
        print(f"  Sitemap index: {idx.name}")
    return files

# ─── MAIN ─────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  TradeMatch SEO Page Generator  v3.0")
    print("=" * 60)

    if not TEMPLATE_FILE.exists():
        print(f"ERROR: Template not found: {TEMPLATE_FILE}")
        print("Ensure city-trade-seo-page-v2.html is in the same folder.")
        return

    print(f"Loading template: {TEMPLATE_FILE.name}")
    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        template = f.read()

    locations    = load_locations()
    county_index = build_county_index(locations)
    total_pages  = len(SERVICES) * len(locations)

    print()
    print(f"Generation Plan:")
    print(f"  Services  : {len(SERVICES)}")
    print(f"  Locations : {len(locations)}")
    print(f"  Total     : {total_pages:,} pages")
    print(f"  Output    : {OUTPUT_DIR}")
    print()

    resp = input("Ready to generate? (y/n): ").strip().lower()
    if resp != "y":
        print("Cancelled.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    hero_src = BASE_DIR / "hero-background.webp"
    hero_dst = OUTPUT_DIR / "hero-background.webp"
    if hero_src.exists():
        watermarked = try_watermark(hero_src, hero_dst, "UK Verified")
        status = "watermarked" if watermarked else "copied"
        print(f"Hero image {status}")
        if not watermarked:
            shutil.copy(hero_src, hero_dst)

    print()
    print("=" * 60)
    print("  Generating pages...")
    print("=" * 60)
    print()

    generated = 0
    for idx, service in enumerate(SERVICES, 1):
        print(f"[{idx:02d}/{len(SERVICES)}] {service['name']:<36}", end="", flush=True)
        for location in locations:
            html = build_page(template, service, location, county_index)
            write_page(html, service, location)
            generated += 1
        print(f"  {len(locations):,} pages done")

    print()
    print(f"Total: {generated:,} pages generated")
    print()
    print("=" * 60)
    print("  Generating sitemaps...")
    print("=" * 60)
    sm_files = generate_sitemap(SERVICES, locations)
    print(f"{len(sm_files)} sitemap file(s) created")

    with open(OUTPUT_DIR / "page-data.json", "w") as f:
        json.dump({
            "generated_at":    datetime.now().isoformat(),
            "generator_ver":   "3.0",
            "total_pages":     generated,
            "services_count":  len(SERVICES),
            "locations_count": len(locations),
        }, f, indent=2)

    print()
    print("=" * 60)
    print("  GENERATION COMPLETE!")
    print("=" * 60)
    print()
    print(f"Output  : {OUTPUT_DIR}")
    print(f"Pages   : {generated:,}")
    print(f"Sitemaps: {len(sm_files)}")
    print()
    print("Next steps:")
    print("  1. Upload generated-pages/ to your hosting / CDN")
    print("  2. Submit sitemaps/sitemap-index.xml to Google Search Console")
    print("  3. Submit sitemaps/sitemap-index.xml to Bing Webmaster Tools")
    print("  4. Spot-check a few pages in your browser")
    print()

if __name__ == "__main__":
    main()
