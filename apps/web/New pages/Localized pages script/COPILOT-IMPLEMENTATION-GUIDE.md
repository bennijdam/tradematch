# TradeMatch SEO Page Generator — GitHub Copilot Implementation Guide
### For use with GitHub Copilot (Codex) in VS Code / Cursor / JetBrains

> **Target audience:** A developer setting up, extending, or deploying the TradeMatch SEO generator using GitHub Copilot as a coding co-pilot. Every section includes exact prompts to paste into Copilot Chat or inline suggestions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Setup](#2-repository-setup)
3. [File Structure & Roles](#3-file-structure--roles)
4. [Copilot Workspace Setup](#4-copilot-workspace-setup)
5. [Core Prompts — Generator Script](#5-core-prompts--generator-script)
6. [Core Prompts — HTML Template](#6-core-prompts--html-template)
7. [Core Prompts — Image Watermarking](#7-core-prompts--image-watermarking)
8. [Core Prompts — Sitemap Strategy](#8-core-prompts--sitemap-strategy)
9. [Core Prompts — Vendor Cards & Certs](#9-core-prompts--vendor-cards--certs)
10. [Core Prompts — Content Uniqueness Engine](#10-core-prompts--content-uniqueness-engine)
11. [Core Prompts — Deployment Pipeline](#11-core-prompts--deployment-pipeline)
12. [Testing & Validation Prompts](#12-testing--validation-prompts)
13. [Extending the System](#13-extending-the-system)
14. [Troubleshooting Prompts](#14-troubleshooting-prompts)
15. [Copilot Agent Mode Tasks](#15-copilot-agent-mode-tasks)

---

## 1. Project Overview

### What this system does

The TradeMatch SEO generator produces **165,696+ HTML pages** (48 services × 3,450+ UK locations) from a single HTML template and a Python generator script. Every page is unique: different meta descriptions, intro copy, cost tables, nearby locations, vendor profiles, verification badges, competitor comparisons, and service lore snippets — all generated deterministically without any API calls.

### Key files

| File | Purpose |
|---|---|
| `city-trade-seo-page-v2.html` | Master HTML template with 33+ `{PLACEHOLDER}` variables |
| `generate-pages-updated.py` | Python generator — fills all placeholders, writes files, builds sitemaps |
| `uk-locations.csv` | 3,450 UK locations with name, slug, county, postcode, population |
| `hero-background.webp` | Hero image (optionally watermarked per-location by Pillow) |

### Architecture summary

```
uk-locations.csv
       │
       ▼
generate-pages-updated.py
  ├── Content pools (meta descriptions, intros, cost tables, lore)
  ├── Deterministic seeding (hashlib MD5 → same page = same content always)
  ├── County index (nearby locations from same county)
  ├── Cert pools (trade-specific UK accreditations per vendor)
  ├── PIL watermarking (optional, graceful fallback)
  └── Sitemap partitioner (5,000 URLs per file → ~34 sitemaps)
       │
       ▼
generated-pages/
  services/{slug}/{location-slug}.html   ← 165,696 files
  sitemaps/sitemap-{n}.xml               ← ~34 files
  sitemaps/sitemap-index.xml
  page-data.json
```

---

## 2. Repository Setup

### Step 1 — Initialise the repo

Open a terminal in VS Code and run:

```bash
mkdir tradematch-seo && cd tradematch-seo
git init
cp /path/to/city-trade-seo-page-v2.html .
cp /path/to/generate-pages-updated.py .
cp /path/to/uk-locations.csv .
cp /path/to/hero-background.webp .
```

### Step 2 — Create `.gitignore`

```gitignore
generated-pages/
__pycache__/
*.pyc
.env
node_modules/
.DS_Store
```

### Step 3 — Python environment

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install Pillow                 # Optional — enables hero image watermarking
pip install piexif                 # Optional — enables EXIF GPS injection
```

### Step 4 — Create `.github/copilot-instructions.md`

This file teaches Copilot the project conventions so all inline suggestions stay consistent.

```markdown
# Copilot Instructions — TradeMatch SEO Generator

## Language & stack
- Python 3.10+ only
- Standard library only (csv, json, random, hashlib, shutil, pathlib, datetime)
- Optional: Pillow for image watermarking, piexif for EXIF metadata

## Naming conventions
- All template placeholders use {UPPER_SNAKE_CASE} with curly braces
- Service slugs: lowercase-hyphen (e.g. "bathroom-fitting")
- Location slugs: lowercase-hyphen (e.g. "bishop-auckland")
- Output files: generated-pages/services/{service-slug}/{location-slug}.html

## Content uniqueness rule
ALL content variation MUST use deterministic seeding via the _seed() function.
Never use random.random() directly for content selection — always seed from service_slug + location_slug + salt string so the same page always renders identically on re-run.

## Placeholder contract
Every {PLACEHOLDER} in the HTML template must have a corresponding entry in the `replacements` dict inside build_page(). Adding a new placeholder to the HTML requires adding it to both the dict and the generator function.

## Cost profiles
Services use one of 8 profiles: hourly, area, supply_fit, project, roofing, outdoor, design, _default.
Each profile in COST_TABLES has: intro (list), rows (list of tuples), tip (list), faq (list).

## Cert generation
Vendor certs come from CERT_POOLS[category]. Featured vendor (index 0) gets 3 certs; others get 2.
Cert HTML uses _cert_html(list_of_tuples) → returns span tags with class vc-cert + type class.

## Sitemap limit
SITEMAP_URL_LIMIT = 5000. This is intentional — 5k per file mimics organic site growth.

## File output
All generated HTML goes to OUTPUT_DIR / "services" / service["slug"] / f"{location['slug']}.html"
Never write outside OUTPUT_DIR except for the sitemap index.
```

---

## 3. File Structure & Roles

### Template placeholder reference

Every placeholder the HTML template uses and where it's generated:

| Placeholder | Generator function | Notes |
|---|---|---|
| `{TRADE}` | Direct from SERVICES list | e.g. "Bathroom Fitting" |
| `{TRADE_SLUG}` | Direct from SERVICES list | e.g. "bathroom-fitting" |
| `{LOCATION}` | Direct from CSV | e.g. "Manchester" |
| `{LOCATION_SLUG}` | Direct from CSV | e.g. "manchester" |
| `{COUNTY}` | Direct from CSV | e.g. "Greater Manchester" |
| `{POSTCODE_EXAMPLE}` | `_postcode()` | e.g. "M1 2AB" |
| `{META_DESCRIPTION}` | `gen_meta()` | 7-variant pool |
| `{HERO_SUBHEADLINE}` | `gen_hero_sub()` | 6-variant pool |
| `{LOCAL_INTRO_P1}` | `gen_intro()` | 5-variant pool |
| `{LOCAL_INTRO_P2}` | `gen_intro()` | 5-variant pool |
| `{PRO_COUNT}` | `_pro_count()` | Population-seeded integer |
| `{REVIEW_COUNT}` | `_review_count()` | Population-seeded integer |
| `{LOCAL_INSIGHT}` | `gen_local_insight()` | Category-specific HTML block |
| `{SERVICE_LORE}` | `gen_service_lore()` | 10-snippet pool per category |
| `{COST_INTRO}` | `gen_cost()` | Profile-specific, 3-variant |
| `{COST_ROWS}` | `gen_cost()` | Profile-specific HTML rows |
| `{COST_TIP}` | `gen_cost()` | Profile-specific, 3-variant |
| `{FAQ_COST_ANSWER}` | `gen_cost()` | Profile-specific, 2-variant |
| `{NEARBY_LOCATIONS_HTML}` | `gen_nearby()` | Same-county picks |
| `{FOOTER_NEARBY_LINKS}` | `gen_nearby()` | First 6 of nearby |
| `{COMPARISON_SECTION}` | `gen_comparison_table()` | Full HTML section |
| `{REVIEWS_SCHEMA}` | `gen_reviews_schema()` | JSON-LD array |
| `{VENDOR_1_NAME}` | `gen_vendors()` | Deterministic name |
| `{VENDOR_1_INITIALS}` | `gen_vendors()` | 2-char initials |
| `{VENDOR_1_YEARS}` | `gen_vendors()` | 8–25 years |
| `{VENDOR_1_SPECIALISM}` | `gen_vendors()` | From SPECIALISMS pool |
| `{VENDOR_1_CERTS}` | `gen_vendors()` | HTML badge spans |
| `{VENDOR_2_*}` | `gen_vendors()` | Same as above |
| `{VENDOR_3_*}` | `gen_vendors()` | Same as above |

---

## 4. Copilot Workspace Setup

### Enable Copilot Chat context

In VS Code, open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
**"GitHub Copilot: Open Chat"**

Add the following files to your Copilot workspace context by dragging them into the Chat panel or using `@workspace`:

- `generate-pages-updated.py`
- `city-trade-seo-page-v2.html`
- `uk-locations.csv` (first 10 rows is enough)
- `.github/copilot-instructions.md`

### Recommended VS Code extensions

```json
// .vscode/extensions.json
{
  "recommendations": [
    "github.copilot",
    "github.copilot-chat",
    "ms-python.python",
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode"
  ]
}
```

### Recommended VS Code settings

```json
// .vscode/settings.json
{
  "github.copilot.enable": {
    "*": true,
    "plaintext": false,
    "markdown": true,
    "python": true,
    "html": true
  },
  "editor.inlineSuggest.enabled": true,
  "editor.formatOnSave": true,
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python"
}
```

---

## 5. Core Prompts — Generator Script

Use these in **Copilot Chat** (`Cmd+I` inline or Chat panel). All prompts assume `generate-pages-updated.py` is open and in context.

---

### Prompt 5.1 — Understand the seeding system

```
@workspace Explain how the _seed() function in generate-pages-updated.py ensures that 
every page renders identically on re-run, and why this matters for a 165k-page 
static site generator. What would break if we used random.random() directly?
```

**Expected Copilot output:** Explanation of deterministic MD5 hashing from service_slug + location_slug + salt, how it maps to list indices, and why re-running the generator must produce byte-identical output for CDN cache invalidation and incremental deploys.

---

### Prompt 5.2 — Add a new service

```
@workspace I need to add "Scaffolding" as a new service to the SERVICES list in 
generate-pages-updated.py. It should:
- slug: "scaffolding"
- category: "Construction"  
- icon: "🏗️"
- profile: "project"
Add it after the "Demolition" entry. Also confirm which CERT_POOLS entry it will 
use and whether SERVICE_LORE has a matching category.
```

---

### Prompt 5.3 — Add a new cost profile

```
@workspace Add a new cost profile called "emergency" to the COST_TABLES dict in 
generate-pages-updated.py. It should cover emergency callout trades (24/7 response).
Use the same structure as the "hourly" profile: intro (3 variants), rows (5 tuples 
with label/low/high/avg), tip (3 variants), faq (2 variants). 
Make the pricing reflect emergency premiums — roughly 2x standard hourly rates.
Then add "emergency" as the profile value for the Locksmiths service entry.
```

---

### Prompt 5.4 — Add a new content pool variant

```
@workspace The META_DESCRIPTIONS list in generate-pages-updated.py currently has 7 
variants. Add 3 more variants that specifically target "near me" search intent — 
e.g. "Find a {TRADE} near me in {LOCATION}..." style phrasing. 
Make sure they use the same {PLACEHOLDER} tokens as the existing variants and 
will pass the same .replace() substitution in gen_meta().
```

---

### Prompt 5.5 — Extend LOCAL_FACTORS for a new category

```
@workspace The LOCAL_FACTORS dict in generate-pages-updated.py maps service 
categories to lists of local insight strings. The "Windows & Doors" category 
currently has 3 entries. Add 3 more entries specific to UK windows and doors — 
focus on real compliance requirements, planning constraints, or material 
considerations that a homeowner in any UK location might encounter.
Keep them factually accurate and avoid generic statements.
```

---

### Prompt 5.6 — Add EXIF GPS injection to watermarking

```
@workspace Extend the try_watermark() function in generate-pages-updated.py to 
also inject GPS EXIF metadata into the output WebP image using the piexif library.
The function should:
1. Accept lat and lng float parameters (defaulting to None)
2. If piexif is available and lat/lng are provided, inject GPS IFD data
3. Handle the degree/minute/second conversion from decimal degrees
4. Fail silently (return True) if piexif is not installed
5. Not break the existing watermark text overlay logic

Also update the build_page() call site to pass location lat/lng if the CSV 
has those columns, otherwise pass None.
```

---

### Prompt 5.7 — Add progress bar and ETA

```
@workspace The main() function in generate-pages-updated.py prints a simple line 
per service during generation. Upgrade it to show:
1. An inline progress bar (use only stdlib — no tqdm dependency)
2. Pages per second throughput
3. Estimated time remaining
4. Total elapsed time at the end

The progress bar should work in both interactive terminals and CI/CD log output.
Use carriage return (\r) for the inline update but fall back to newlines if not a TTY.
```

---

### Prompt 5.8 — Parallelise generation with multiprocessing

```
@workspace The generation loop in main() is single-threaded and takes 30-60 minutes 
for 165k pages. Refactor it to use Python's multiprocessing.Pool to parallelise 
across services (not locations — that would cause too many processes).

Requirements:
- Pool size should default to os.cpu_count() - 1 (leave one core for I/O)
- Each worker receives: template string, service dict, all locations, county_index
- Output directory creation must be thread-safe (exist_ok=True handles this)
- Progress reporting must still work (use multiprocessing.Manager().Value or a Queue)
- Total count must be accurate at the end
- Must not break the deterministic seeding (each worker uses the same _seed() logic)
```

---

## 6. Core Prompts — HTML Template

Use these with `city-trade-seo-page-v2.html` open in context.

---

### Prompt 6.1 — Add a new placeholder to the template

```
@workspace I want to add a {SERVICE_LORE} placeholder to city-trade-seo-page-v2.html.
It should appear as a styled "Industry Context" block inside the intro section 
(section S2), positioned after the {LOCAL_INSIGHT} block.

The block should:
- Have a subtle dark border-left (2px, emerald colour var(--g))
- Use font-size 13px, italic, colour var(--tx-dk3)
- Be wrapped in a div with class "service-lore-block sr d6"
- Include a small label "Industry Context" in var(--fm) monospace uppercase

Write the HTML for the block and the CSS class definition to add to the <style> section.
```

---

### Prompt 6.2 — Audit all placeholders

```
@workspace Scan city-trade-seo-page-v2.html and list every {PLACEHOLDER} token 
found in the file. Then cross-reference with the replacements dict in build_page() 
in generate-pages-updated.py and identify:
1. Any placeholders in the HTML that are NOT in the replacements dict (would render literally)
2. Any keys in the replacements dict that don't match any placeholder in the HTML (dead code)
Format the output as two lists: "Missing from generator" and "Unused in template".
```

---

### Prompt 6.3 — Add Open Graph image meta tag

```
@workspace Add Open Graph image meta tags to the <head> section of 
city-trade-seo-page-v2.html. The og:image URL should be constructed from 
BASE_URL + "/assets/hero/" + {LOCATION_SLUG} + "-" + {TRADE_SLUG} + ".webp"
so each page references its unique watermarked hero image.

Also add:
- og:image:width (1200)
- og:image:height (630) 
- og:image:alt using {TRADE} and {LOCATION}
- twitter:card set to "summary_large_image"
- twitter:image pointing to the same URL
```

---

### Prompt 6.4 — Fix button sizing via CSS custom property

```
@workspace In city-trade-seo-page-v2.html, the .btn-primary, .btn-secondary and 
.btn-outline-dk classes all hard-code padding and font-size values separately.

Refactor this so button sizing is controlled by two CSS custom properties defined 
in :root — --btn-pad (default: 11px 22px) and --btn-font (default: 13.5px).
Both should cascade to all three button classes.

This makes it trivial to adjust button scale site-wide from a single location.
Show the :root additions and the updated button class CSS.
```

---

## 7. Core Prompts — Image Watermarking

---

### Prompt 7.1 — Generate per-location hero images

```
@workspace The current try_watermark() function in generate-pages-updated.py 
watermarks one shared hero image with "Verified: UK Verified" text.

Upgrade it to generate a unique hero image per location with:
1. Location name overlaid in the bottom-left corner (not bottom-right)
2. Trade name overlaid in top-right corner in a smaller font
3. A subtle location-coloured gradient overlay (derive a hue from a hash of the 
   location slug so every location gets a slightly different tint)
4. Save to generated-pages/assets/hero/{location_slug}-{trade_slug}.webp
5. Cache: skip regeneration if the file already exists (for incremental runs)

Keep the graceful fallback if Pillow is not installed.
```

---

### Prompt 7.2 — Batch watermarking pre-pass

```
@workspace Currently hero images are watermarked inline during page generation, 
causing repeated file I/O. Refactor the watermarking into a separate pre-pass 
that runs before page generation:

1. Add a generate_hero_images(services, locations) function
2. It should create all location+trade hero images upfront
3. Use a thread pool (concurrent.futures.ThreadPoolExecutor) for I/O speed
4. Show a progress counter: "Generating hero images: 450/3450"
5. Return a dict: {(service_slug, location_slug): output_path} for use in build_page()
6. Skip if Pillow unavailable and return an empty dict

Update main() to call this before the page generation loop.
```

---

## 8. Core Prompts — Sitemap Strategy

---

### Prompt 8.1 — Per-trade sitemaps

```
@workspace The current generate_sitemap() function creates generic numbered sitemaps 
(sitemap-1.xml, sitemap-2.xml etc.) with a 5,000 URL limit per file.

Add an alternative mode: generate_trade_sitemaps(services, locations) that creates 
one sitemap per trade (e.g. sitemap-plumbing.xml, sitemap-electrical.xml).

Each trade sitemap should:
- Contain all location URLs for that trade (up to 3,450 per file)
- Use priority 0.9 for major cities (population > 200,000) and 0.7 for others
- Include a <lastmod> date
- Be added to the sitemap-index.xml

Also update the sitemap-index.xml generator to include both the numbered and 
trade-based sitemaps if both modes have been run.
```

---

### Prompt 8.2 — Add a robots.txt generator

```
@workspace Add a generate_robots_txt() function to generate-pages-updated.py that 
creates a robots.txt file in OUTPUT_DIR with:
1. User-agent: * — Allow: /
2. Disallow: /get-quotes (prevent crawling of the quote form)
3. Sitemap: pointing to BASE_URL + /sitemaps/sitemap-index.xml
4. A crawl-delay of 1 second for non-Googlebot agents
5. Explicit allow rules for Googlebot and Bingbot with no crawl-delay

Call it from main() after sitemap generation.
```

---

### Prompt 8.3 — Google Indexing API batch notifier

```
@workspace Add an optional notify_google(urls, batch_size=200) function to 
generate-pages-updated.py that submits URLs to the Google Indexing API.

Requirements:
- Only runs if GOOGLE_SERVICE_ACCOUNT_JSON environment variable is set
- Uses the google-auth library (add a requirements-optional.txt noting this)  
- Batches requests: 200 URLs per batch with a 1 second delay between batches
- Logs success/failure counts
- Does NOT block the main generation if the API call fails
- Includes a --notify-google CLI flag to trigger it (use argparse)

Show the function and the updated main() argparse integration.
```

---

## 9. Core Prompts — Vendor Cards & Certs

---

### Prompt 9.1 — Add a 4th vendor card for major cities

```
@workspace The vendors section (S3) in city-trade-seo-page-v2.html shows exactly 
3 vendor cards. For major cities (population > 200,000), add a 4th "Recently Joined" 
vendor card with a distinct visual treatment:

HTML changes:
- Add {VENDOR_4_NAME}, {VENDOR_4_INITIALS}, {VENDOR_4_YEARS}, {VENDOR_4_SPECIALISM}, 
  {VENDOR_4_CERTS} placeholders in the template
- Add a "New to TradeMatch" ribbon instead of "Featured Pro"
- Use a different image (img-electrician.jpg)

Generator changes:
- In build_page(), check if location population > 200,000
- If yes, generate a 4th vendor and include a {SHOW_VENDOR_4} = "" (empty)
- If no, set {SHOW_VENDOR_4} = "display:none" so the card is hidden via inline style

Show both the HTML and Python changes.
```

---

### Prompt 9.2 — Add Gas Safe registration number

```
@workspace For services in the "Heating" category, vendor cards should show a 
realistic Gas Safe registration number. 

In the gen_vendors() function, for heating services (check service["category"]):
- Generate a fake but realistic Gas Safe number: 7-digit integer seeded from the 
  vendor's name hash (so it's consistent across re-runs)
- Format: "Gas Safe: " + str(number)
- Add it as "gas_safe_num" key in the vendor dict
- Add a {VENDOR_1_GAS_SAFE} placeholder to the HTML template (and v2/v3 equivalents)
- Render it as a small text line below the cert badges, only visible when non-empty

For non-heating services the placeholder should render as an empty string.
```

---

## 10. Core Prompts — Content Uniqueness Engine

---

### Prompt 10.1 — Add "Local Landmark" injection

```
@workspace The intro paragraphs in generate-pages-updated.py are varied but don't 
reference specific local landmarks or geography. Add a LOCAL_LANDMARKS dict to the 
generator that maps specific well-known UK location slugs to a list of local 
geographic/landmark references.

Example:
LOCAL_LANDMARKS = {
    "london":     ["the Thames corridor", "Zone 2-6 boroughs", "period Victorian terraces"],
    "manchester":  ["the Irwell Valley", "Salford's media quarter", "Victorian mill conversions"],
    "edinburgh":   ["the New Town conservation zone", "sandstone tenements", "the Old Town"],
    ...
}

Add entries for the top 20 UK cities by population. Then in gen_intro(), if the 
location slug has a LOCAL_LANDMARKS entry, append a sentence referencing one of 
the landmarks (picked deterministically) to the P1 paragraph.

For locations without a landmarks entry, no change to the existing copy.
```

---

### Prompt 10.2 — Add seasonal content variation

```
@workspace Add seasonal variation to the COST_TIP content in generate-pages-updated.py.
The generator currently picks tips deterministically by page. Add a SEASONAL_SUFFIX 
dict that maps month numbers to a short seasonal observation:

SEASONAL_SUFFIX = {
    12: "December and January are typically the slowest months for {TRADE} bookings in {LOCATION}, meaning you may be able to negotiate on price.",
    1:  "January is traditionally quiet for {TRADE} in {LOCATION} — an ideal time to book non-urgent work at competitive rates.",
    ...
}

Modify gen_cost() to append the current month's seasonal suffix (if defined) to the 
tip text. Use datetime.now().month to get the current month.

This means pages generated in winter have different tip text than summer-generated 
pages — increasing content variation across re-generation cycles.
```

---

### Prompt 10.3 — Add "response time" local market data block

```
@workspace Add a "Local Market Data" HTML section to the page generator that produces 
a block showing:
- Average {TRADE} response time in {LOCATION}: seeded realistic figure (45–240 mins)
- Average quotes received per job in {LOCATION}: seeded figure (3.2–4.8)
- TradeMatch vs Bark comparison line: "Unlike Bark, TradeMatch {TRADE} pros in 
  {LOCATION} are verified locally — not just registered nationally."

In the generator:
1. Add gen_market_data(service, location) function that returns an HTML block
2. The response time should be shorter for major cities (population > 200k → 45–90 mins)
   and longer for rural areas (< 50k population → 120–240 mins)
3. All figures seeded deterministically
4. Add {MARKET_DATA_BLOCK} placeholder to the HTML template, positioned between 
   the cost guide section and the FAQ section

Show the generator function and the HTML template placement.
```

---

## 11. Core Prompts — Deployment Pipeline

---

### Prompt 11.1 — GitHub Actions workflow for generation + deploy to Netlify

```
@workspace Create a GitHub Actions workflow file at .github/workflows/generate-and-deploy.yml
that:

1. Triggers on push to main branch OR manual workflow_dispatch
2. Sets up Python 3.11
3. Installs Pillow (pip install Pillow piexif)
4. Runs python generate-pages-updated.py with --yes flag (skip the y/n prompt — 
   add this argparse flag to the generator)
5. Uploads the generated-pages/ directory as a GitHub Actions artifact
6. Deploys to Netlify using the netlify/actions/cli action with:
   - NETLIFY_AUTH_TOKEN from GitHub Secrets
   - NETLIFY_SITE_ID from GitHub Secrets
   - Deploy directory: generated-pages/
7. Posts a summary comment with: pages generated, sitemaps created, deploy URL

Note: The workflow needs to handle that generation takes 30-60 minutes — set 
timeout-minutes: 90.
```

---

### Prompt 11.2 — Add --dry-run and --services filter flags

```
@workspace Add argparse CLI flags to the main() function in generate-pages-updated.py:

--dry-run         Run the full logic but don't write any files. Print a summary of 
                  what would be generated. Useful for CI validation.

--services        Comma-separated list of service slugs to generate (subset mode).
                  Example: --services plumbing,electrical,gas-work
                  Validates that each slug exists in SERVICES before starting.

--locations-limit An integer to limit the number of locations processed (for testing).
                  Example: --locations-limit 10 generates only the first 10 locations.

--output-dir      Override the OUTPUT_DIR path.
                  Default remains BASE_DIR / "generated-pages".

Show the complete updated main() function with argparse integration.
```

---

### Prompt 11.3 — AWS S3 + CloudFront deployment script

```
@workspace Create a deploy-to-aws.py script in the project root that:

1. Uses boto3 to sync generated-pages/ to an S3 bucket
2. Sets correct Content-Type headers per file extension (text/html, application/xml, 
   application/json, image/webp)
3. Sets Cache-Control headers:
   - HTML files: "public, max-age=3600, must-revalidate"
   - XML sitemaps: "public, max-age=86400"
   - WebP images: "public, max-age=31536000, immutable"
4. Creates a CloudFront invalidation for /* after the sync completes
5. Reads AWS credentials from environment variables (not hardcoded)
6. Accepts --bucket and --distribution-id as CLI arguments
7. Prints a deployment summary with file counts and CloudFront invalidation ID

Add a requirements-deploy.txt with: boto3, botocore
```

---

## 12. Testing & Validation Prompts

---

### Prompt 12.1 — Write unit tests for the generator

```
@workspace Create a test_generator.py file using Python's built-in unittest module 
(no pytest dependency). Write tests for:

1. test_seed_determinism — Same inputs always produce same seed
2. test_all_placeholders_filled — Build a page and assert no {UPPERCASE} patterns remain
3. test_meta_description_variation — 5 different service+location combos produce 5 
   different meta descriptions
4. test_cost_profiles — Each of the 8 profiles produces valid HTML rows (contains 
   "cost-row" class)
5. test_nearby_county_match — gen_nearby() only returns locations from the same county
6. test_cert_badges — Vendor 1 gets 3 cert badges, vendors 2 and 3 get 2 each
7. test_featured_vendor — Vendor 1 card HTML contains "vc-featured-ribbon"
8. test_sitemap_limit — generate_sitemap() respects SITEMAP_URL_LIMIT = 5000
9. test_postcode_format — _postcode() returns a string matching UK postcode pattern

Use a small fixture dataset (5 locations, 3 services) to keep tests fast.
```

---

### Prompt 12.2 — Validate HTML output

```
@workspace Create a validate_output.py script that checks the quality of generated 
pages without requiring an external HTML validator. It should:

1. Sample N random pages from generated-pages/services/ (default N=100, CLI arg)
2. For each page check:
   - No remaining {PLACEHOLDER} tokens (regex: \{[A-Z_]+\})
   - Contains expected structural elements: <title>, <meta name="description">, 
     <script type="application/ld+json">, footer class="footer"
   - Title contains the location name and trade name
   - Meta description is 120-160 characters
   - JSON-LD schema parses as valid JSON
   - No duplicate content: compare meta description across sampled pages (all unique)
3. Print a pass/fail summary with specific error details for any failures
4. Exit with code 1 if any checks fail (for CI integration)
```

---

### Prompt 12.3 — SEO score checker

```
@workspace Create an seo_check.py script that scores a sample of generated pages 
against common SEO best practices. For each sampled page, check and score:

- Title tag: 50-60 chars (+1), contains location and trade (+1), unique (+1)
- Meta description: 120-160 chars (+1), contains location (+1), CTA present (+1)  
- H1 present (+1), contains trade name (+1)
- Schema markup: Service type (+1), aggregateRating present (+1), review array (+1)
- Canonical URL: present and matches expected pattern (+1)
- Open Graph tags: og:title, og:description, og:type all present (+1 each)
- Internal links: at least 8 nearby location links (+1), at least 6 service links (+1)

Output a per-page score out of 20, overall average, and highlight any pages 
scoring below 14 (below 70%) as requiring attention.
```

---

## 13. Extending the System

---

### Prompt 13.1 — Add a new UK nations layer (Scotland/Wales/NI specific content)

```
@workspace The uk-locations.csv contains locations across all UK nations. Add a 
nations-aware content layer to generate-pages-updated.py:

1. Add a NATIONS dict mapping location slugs (or postcode area prefixes) to nation:
   "england", "scotland", "wales", "northern_ireland"
2. Add nation-specific intro sentence variants that reference devolved planning 
   rules (e.g. Scottish Building Standards vs England's Building Regulations, 
   Wales Permitted Development differences)
3. In gen_intro(), detect the location's nation and append a nation-specific 
   compliance sentence to P2
4. In gen_comparison_table(), adjust the competitor table to remove MyBuilder 
   for NI (less market presence) and note it as regional
5. Detect nation from postcode_area prefix: EH/G/AB/DD = Scotland, CF/SA/LL = Wales,
   BT = Northern Ireland, everything else = England

Show the NATIONS dict (top 50 postcode areas mapped), the detection function, 
and the gen_intro() modification.
```

---

### Prompt 13.2 — Dynamic routing server (Node.js / Express)

```
@workspace Instead of pre-generating 165k static HTML files, create an 
express-server.js file that generates pages on-demand using the same logic 
as the Python generator, but implemented in JavaScript.

Requirements:
- Express route: GET /services/:trade/:location
- Load uk-locations.csv on startup using the csv-parse library
- Implement the same deterministic seeding using Node's crypto.createHash('md5')
- Port the content pools (META_DESCRIPTIONS, INTRO_P1_TEMPLATES etc.) to JS arrays
- Load city-trade-seo-page-v2.html as a string template and do string replacement
- Cache rendered pages in memory (LRU cache, max 10,000 entries)
- Return 404 with a sensible message if trade slug or location slug is invalid
- Include a /sitemap-index.xml route that generates the sitemap index on-the-fly
- Health check endpoint: GET /health → { status: "ok", cached: N }

Add package.json with dependencies: express, csv-parse, lru-cache
```

---

### Prompt 13.3 — Add a React preview component

```
@workspace Create a React component PreviewPage.jsx that renders a live preview 
of what a generated page will look like for any trade + location combination.

The component should:
1. Accept props: { tradeSlugs, locationSlugs } (arrays for dropdowns)
2. Render two <select> dropdowns for trade and location
3. On selection change, call a /api/preview?trade=X&location=Y endpoint 
   (or simulate with mock data)
4. Display the rendered HTML in an <iframe> below the selectors
5. Show metadata: estimated PRO_COUNT, REVIEW_COUNT, which cost profile is used,
   which SERVICE_LORE category applies, how many nearby locations were found
6. Include a "Copy page URL" button that copies the canonical URL to clipboard

This is a developer tool only — no production routing needed.
Use React hooks (useState, useEffect) and Tailwind utility classes.
```

---

## 14. Troubleshooting Prompts

Use these when something goes wrong.

---

### Prompt 14.1 — Debug missing placeholders

```
@workspace A generated page at generated-pages/services/plumbing/london.html 
contains the literal text "{SERVICE_LORE}" in the HTML (the placeholder wasn't 
replaced). 

Diagnose why this could happen in generate-pages-updated.py. Check:
1. Is {SERVICE_LORE} present as a key in the replacements dict in build_page()?
2. Is gen_service_lore() defined and returning a string (not None)?
3. Could the HTML template have a slightly different token (e.g. { SERVICE_LORE } 
   with spaces, or {service_lore} lowercase)?
4. Is the key added to the dict before the html.replace() loop runs?

List all the places in the code I need to check and fix.
```

---

### Prompt 14.2 — Fix slow generation performance

```
@workspace The generator is taking over 90 minutes for 165k pages. Profile where 
the time is going and suggest optimisations. Consider:

1. File I/O: is open() called once per page or is there a buffering opportunity?
2. String replacement: does doing 33 separate str.replace() calls add up? 
   Could a single regex substitution with a dict be faster?
3. Directory creation: mkdir() is called for every page — could we pre-create 
   all service directories upfront?
4. Template loading: is the template file read once or per-page?
5. County index: is it rebuilt each time or built once?

Show a profiling snippet I can add to main() to measure each phase, then suggest 
the top 3 code changes most likely to reduce total runtime.
```

---

### Prompt 14.3 — Handle CSV encoding issues

```
@workspace The load_locations() function in generate-pages-updated.py sometimes 
fails with UnicodeDecodeError on uk-locations.csv for locations with 
non-ASCII characters (e.g. Welsh place names with ŵ, î, ê).

Fix the function to:
1. Try UTF-8 first
2. Fall back to latin-1 if UTF-8 fails
3. Normalize special characters in the slug column to ASCII-safe equivalents
   (e.g. ŵ → w, î → i, ê → e) using unicodedata.normalize
4. Keep the display name (name column) unchanged — only normalise the slug
5. Log a warning for any locations where slug normalisation was applied

Also show how to pre-validate the CSV file before running the generator.
```

---

### Prompt 14.4 — Debug sitemap index URL issues

```
@workspace The sitemap-index.xml generated by generate_sitemap() contains URLs 
like https://www.tradematch.uk/sitemaps/sitemap-1.xml but after deployment the 
actual files are at /sitemaps/sitemap-1.xml (root-relative).

The BASE_URL variable is set correctly. Diagnose why the sitemap URL construction 
might produce wrong paths and show the exact line that builds the <loc> element 
for each sitemap entry. Then add a --base-url CLI argument that overrides BASE_URL 
at runtime, so staging and production deployments can use different domains.
```

---

## 15. Copilot Agent Mode Tasks

These are multi-step tasks for **Copilot Agent Mode** (available in VS Code Insiders with Copilot Chat set to `agent` mode). Paste each as a single instruction.

---

### Agent Task 15.1 — Full feature audit

```
You are reviewing generate-pages-updated.py and city-trade-seo-page-v2.html together.

Do the following in sequence:
1. Extract all {PLACEHOLDER} tokens from the HTML file
2. Extract all keys from the replacements dict in build_page()
3. Produce a diff showing any mismatches
4. Check that every generator function referenced in replacements is defined
5. Verify the COST_TABLES dict has all 8 profiles with all 4 required keys
6. Verify CERT_POOLS has an entry for every unique "category" value in SERVICES
7. Verify SERVICE_LORE has an entry for every unique "category" value in SERVICES
8. Write a summary report as a markdown table with pass/fail status for each check
```

---

### Agent Task 15.2 — Add complete test suite and CI workflow

```
Do the following in sequence:
1. Create test_generator.py with 12 unit tests covering: seeding, placeholder 
   coverage, content variation, cost profiles, cert generation, nearby locations,
   sitemap limits, HTML validity of output pages, and footer structure
2. Create .github/workflows/test.yml that runs the tests on every push and PR
3. Add a test:quick make target to a new Makefile that runs only the fastest 5 tests
4. Ensure all tests pass with the current codebase before finishing
5. Report which tests pass, which fail, and why
```

---

### Agent Task 15.3 — Optimise and benchmark

```
Do the following in sequence:
1. Add timing instrumentation to generate-pages-updated.py for each major phase
2. Run a benchmark generating all pages for 3 services × 50 locations (150 pages)
3. Identify the 3 slowest operations from the timing data
4. Implement the top optimisation: pre-create service directories upfront
5. Implement the second optimisation: replace 33 individual str.replace() calls 
   with a single re.sub() using a compiled pattern and the replacements dict
6. Re-run the benchmark and report the speedup percentage
```

---

## Appendix A — Placeholder Quick Reference Card

```
Template variables → Generator source

{TRADE}                  → service["name"]
{TRADE_SLUG}             → service["slug"]
{LOCATION}               → location["name"]  
{LOCATION_SLUG}          → location["slug"]
{COUNTY}                 → location["county"]
{POSTCODE_EXAMPLE}       → _postcode(location)
{META_DESCRIPTION}       → gen_meta(service, location, pc, rc)
{HERO_SUBHEADLINE}       → gen_hero_sub(service, location, pc)
{LOCAL_INTRO_P1}         → gen_intro(service, location)[0]
{LOCAL_INTRO_P2}         → gen_intro(service, location)[1]
{PRO_COUNT}              → _pro_count(location)
{REVIEW_COUNT}           → _review_count(location)
{LOCAL_INSIGHT}          → gen_local_insight(service, location)
{SERVICE_LORE}           → gen_service_lore(service, location)
{COST_INTRO}             → gen_cost(service, location)[0]
{COST_ROWS}              → gen_cost(service, location)[1]
{COST_TIP}               → gen_cost(service, location)[2]
{FAQ_COST_ANSWER}        → gen_cost(service, location)[3]
{NEARBY_LOCATIONS_HTML}  → gen_nearby(service, location, county_index)[0]
{FOOTER_NEARBY_LINKS}    → gen_nearby(service, location, county_index)[1]
{COMPARISON_SECTION}     → gen_comparison_table(service, location)
{REVIEWS_SCHEMA}         → gen_reviews_schema(service, location)
{VENDOR_1_NAME}          → gen_vendors(service, location)[0]["name"]
{VENDOR_1_INITIALS}      → gen_vendors(service, location)[0]["initials"]
{VENDOR_1_YEARS}         → gen_vendors(service, location)[0]["years"]
{VENDOR_1_SPECIALISM}    → gen_vendors(service, location)[0]["specialism"]
{VENDOR_1_CERTS}         → gen_vendors(service, location)[0]["certs"]
{VENDOR_2_*}             → gen_vendors(...)  index 1
{VENDOR_3_*}             → gen_vendors(...)  index 2
```

---

## Appendix B — Cost Profile Assignment

```
Profile        Services that use it
─────────────────────────────────────────────────────────────
hourly         Plumbing, Electrical, Carpentry, Gas Work,
               Stonemasonry, Handyman, Cleaning Services,
               Waste Clearance, Locksmiths

area           Painting & Decorating, Carpets & Lino, 
               Hard Flooring, Insulation, Bricklaying,
               Tiling, Plastering, Repointing

supply_fit     Bathroom Fitting, Kitchen Fitting, Central Heating,
               Damp Proofing, Joinery & Cabinet Making,
               Fireplaces & Flues, Windows & Doors (both),
               Security Systems

project        Building, Extensions, Loft Conversion, 
               Conversions General, New Builds, Groundwork,
               Demolition, Restoration, Conservatories,
               Moving Services

roofing        Roofing (Flat), Roofing (Pitched),
               Fascias & Soffits, Guttering

outdoor        Landscaping, Garden Maintenance, Fencing,
               Decking, Driveways (both), Tree Surgery

design         Architecture, CAD / Drawings

_default       Fallback (same as hourly)
```

---

## Appendix C — Service Category → Cert Pool Mapping

```
Category             Pool includes
──────────────────────────────────────────────────────────────
Core Trades          ID Verified, DBS Checked, Insured, CIPHE, Part P
Construction         ID Verified, DBS Checked, Insured, CSCS Gold, Site Safe
Roofing              ID Verified, DBS Checked, Insured, NFRC, PASMA
Outdoor              ID Verified, DBS Checked, Insured, Arb Approved, RHS
Home Improvement     ID Verified, DBS Checked, Insured, NICEIC, Gas Safe
Finishing            ID Verified, DBS Checked, Insured, PDA, CSCS
Heating              ID Verified, DBS Checked, Insured, Gas Safe, MCS
Flooring             ID Verified, DBS Checked, Insured, CFA, CSCS
Masonry              ID Verified, DBS Checked, Insured, Guild, CSCS Blue
Property Care        ID Verified, DBS Checked, Insured, PCA, CSRT
Windows & Doors      ID Verified, DBS Checked, Insured, FENSA, PAS 24
Security             ID Verified, DBS Checked, Insured, MLA, NSI Gold
General Services     ID Verified, DBS Checked, Insured, Waste Carrier, TSI
Design               ID Verified, DBS Checked, Insured, ARB, RIBA
Specialist           ID Verified, DBS Checked, Insured, HETAS, PCA
Energy               ID Verified, DBS Checked, Insured, MCS, Ofgem
```

---

*Guide version: v4.0 — matches generator v4.0 and template v4.0*  
*Last updated: March 2026*
