# Image Setup (Stock API + CDN)

## 1) Pexels API (free image source)

- Create a Pexels API key and set it as an environment variable:

PowerShell:

$env:PEXELS_API_KEY="your_pexels_api_key"

- Run generator with stock-image mode:

c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py --yes --max-pages 100 --image-strategy pexels-watermark

If Pexels is rate-limited or blocked, use Unsplash fallback:

$env:UNSPLASH_ACCESS_KEY="your_unsplash_access_key"

c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py --yes --max-pages 100 --image-strategy pexels-watermark --stock-provider unsplash

What it does:
- Pulls one deterministic source photo per trade from Pexels
- Caches source files under generated-pages/.cache/pexels
- Creates per-page watermarked hero images under generated-pages/assets/hero/{trade}/{location}.webp
- Injects those URLs into generated page HTML

## 2) Cloudflare R2 / CDN URL mode

If assets are hosted at a CDN origin, set a base URL:

$env:ASSET_BASE_URL="https://assets.tradematch.uk"

Then run:

c:/Users/ASUS/Desktop/tradematch-fixed/.venv/Scripts/python.exe generate-pages-updated.py --yes --max-pages 100 --image-strategy pexels-watermark --asset-base-url $env:ASSET_BASE_URL

Resulting image URLs inside pages become:
https://assets.tradematch.uk/assets/hero/{trade}/{location}.webp

## 3) Cloudflare image transformations (example)

After publishing assets behind your domain, you can use Cloudflare image transform URLs:

https://yourdomain.com/cdn-cgi/image/width=1200,format=webp/https://assets.tradematch.uk/assets/hero/plumbing/london.webp

## 4) Notes

- If Pexels key is missing, generator automatically falls back to local hero mode.
- If stock provider requests fail, generator logs a warning and falls back to local hero mode per service.
- For massive runs, start with a small batch (100/500) to validate cost, crawl behavior, and quality.
