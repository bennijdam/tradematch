#!/usr/bin/env python3
"""
PageSpeed optimizer for 13 footer-linked pages under apps/web/
Changes applied to each page:
  - Non-blocking Google Fonts (preload/onload swap)
  - dns-prefetch hints for both font hosts
  - Critical CSS split (nav/hero/above-fold in <head>; rest deferred to end of body)
  - register.html only: Lucide script moved from <head> to end of body
"""

import os

BASE = r'C:\Users\ASUS\Desktop\tradematch-fixed\apps\web'

# ─────────────────────────────────────────────────────────────────────────────
# Font URLs (exact originals → new cleaned-up values)
# ─────────────────────────────────────────────────────────────────────────────
ARCHIVO_URL = (
    'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
    '&family=Space+Mono:wght@400;700&display=swap'
)
ARCHIVO_900_URL = (
    'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900'
    '&family=Space+Mono:wght@400;700&display=swap'
)
INTER_URL = (
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900'
    '&display=swap'
)
MANROPE_URL = (
    'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800'
    '&family=Source+Serif+4:wght@600;700&display=swap'
)
# register.html — Sora:300 removed (unused thin weight)
SORA_URL = (
    'https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900'
    '&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700'
    '&family=JetBrains+Mono:wght@400;500&display=swap'
)

# ─────────────────────────────────────────────────────────────────────────────
# Per-file configuration
# Keys:
#   name         - filename under apps/web/
#   indent       - indentation used on preconnect lines ('' or '    ')
#   old_font_url - original Google Fonts URL (for building old-block matcher)
#   new_font_url - cleaned URL (same URL for non-Sora pages)
#   lucide       - True if Lucide is in <head> and must be moved to body
#   split_marker - CSS comment text marking start of non-critical CSS
#                  (None = CSS too small, skip split)
# ─────────────────────────────────────────────────────────────────────────────
FILES = [
    {
        'name': 'how-it-works.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': '\n        /* GDPR Cookie Notice - Bottom Left */',
    },
    {
        'name': 'find-tradespeople.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': (
            '\n        /* ========================================\n'
            '           SECTION HEADER\n'
            '           ======================================== */'
        ),
    },
    {
        'name': 'cost-calculator.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_900_URL,
        'lucide': False,
        'split_marker': '\n        /* Results */',
    },
    {
        'name': 'register.html',
        'indent': '',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;700;800;900'
            '&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,700'
            '&family=JetBrains+Mono:wght@400;500&display=swap'
        ),
        'new_font_url': SORA_URL,
        'lucide': True,
        'split_marker': '\n/* \u2500\u2500 SUCCESS STATE \u2500\u2500 */',
    },
    {
        'name': 'compare.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': (
            '\n        /* ========================================\n'
            '           DETAILED COMPARISON CARDS\n'
            '           ======================================== */'
        ),
    },
    {
        'name': 'trade-signup.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': (
            '\n        /* ========================================\n'
            '           COMPETITOR COMPARISON TABLE\n'
            '           ======================================== */'
        ),
    },
    {
        'name': 'about-us.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': (
            '\n        /* ========================================\n'
            '           VALUES SECTION\n'
            '           ======================================== */'
        ),
    },
    {
        'name': 'careers.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_URL,
        'lucide': False,
        'split_marker': (
            '\n        /* ========================================\n'
            '           TEAM PHOTOS\n'
            '           ======================================== */'
        ),
    },
    {
        'name': 'blog.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900'
            '&family=Space+Mono:wght@400;700&display=swap'
        ),
        'new_font_url': ARCHIVO_900_URL,
        'lucide': False,
        'split_marker': '\n        /* Posts Grid */',
    },
    {
        'name': 'contact.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900'
            '&display=swap'
        ),
        'new_font_url': INTER_URL,
        'lucide': False,
        'split_marker': '\n        /* Success Message */',
    },
    {
        'name': 'privacy.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900'
            '&display=swap'
        ),
        'new_font_url': INTER_URL,
        'lucide': False,
        'split_marker': None,  # CSS only 170 lines — skip split
    },
    {
        'name': 'terms.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900'
            '&display=swap'
        ),
        'new_font_url': INTER_URL,
        'lucide': False,
        'split_marker': None,  # CSS only 163 lines — skip split
    },
    {
        'name': 'cookies.html',
        'indent': '    ',
        'old_font_url': (
            'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800'
            '&family=Source+Serif+4:wght@600;700&display=swap'
        ),
        'new_font_url': MANROPE_URL,
        'lucide': False,
        'split_marker': '\n        /* Trust Stats */',
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Processing helpers
# ─────────────────────────────────────────────────────────────────────────────
LUCIDE_SRC = (
    '<script defer src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"'
    ' onload="lucide.createIcons()"></script>'
)

def build_old_block(indent, old_font_url, include_lucide):
    lines = (
        f'{indent}<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'{indent}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'{indent}<link href="{old_font_url}" rel="stylesheet">'
    )
    if include_lucide:
        lines += f'\n{LUCIDE_SRC}'
    return lines


def build_new_block(indent, new_font_url, include_lucide_comment):
    block = (
        f'{indent}<!-- Resource hints -->\n'
        f'{indent}<link rel="dns-prefetch" href="https://fonts.googleapis.com">\n'
        f'{indent}<link rel="dns-prefetch" href="https://fonts.gstatic.com">\n'
        f'{indent}<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        f'{indent}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'{indent}<!-- Non-blocking Google Fonts (eliminates render-blocking resource) -->\n'
        f'{indent}<link rel="preload" href="{new_font_url}" as="style"'
        f' onload="this.onload=null;this.rel=\'stylesheet\'">\n'
        f'{indent}<noscript><link href="{new_font_url}" rel="stylesheet"></noscript>'
    )
    if include_lucide_comment:
        block += '\n<!-- Lucide icons \u2014 loaded at end of body; removed from head -->'
    return block


def process_file(cfg):
    path = os.path.join(BASE, cfg['name'])
    with open(path, encoding='utf-8') as f:
        html = f.read()
    original_len = len(html)

    # ── Step 1: Non-blocking fonts + dns-prefetch ──────────────────────────
    old_block = build_old_block(cfg['indent'], cfg['old_font_url'], cfg['lucide'])
    new_block = build_new_block(cfg['indent'], cfg['new_font_url'], cfg['lucide'])

    assert old_block in html, (
        f"  ERROR: font block not found in {cfg['name']}.\n"
        f"  Expected: {old_block[:80]!r}"
    )
    html = html.replace(old_block, new_block, 1)

    # ── Step 2: CSS split (if marker provided) ─────────────────────────────
    non_critical_css = None
    if cfg['split_marker']:
        marker = cfg['split_marker']
        assert marker in html, (
            f"  ERROR: split marker not found in {cfg['name']}.\n"
            f"  Marker: {marker!r}"
        )
        marker_idx  = html.index(marker)
        style_close = html.index('</style>', marker_idx)
        non_critical_css = html[marker_idx:style_close]
        html = html[:marker_idx] + '\n    ' + html[style_close:]

    # ── Step 3: Inject deferred block before </body> ───────────────────────
    if non_critical_css is not None or cfg['lucide']:
        body_idx = html.rfind('</body>')
        assert body_idx >= 0, f"</body> not found in {cfg['name']}"

        deferred = ''
        if non_critical_css is not None:
            deferred += (
                '<!-- Non-critical CSS (below-fold styles) \u2014 non-blocking -->\n'
                f'<style id="nc-styles">{non_critical_css}\n</style>\n'
            )
        if cfg['lucide']:
            deferred += (
                '<!-- Lucide icons \u2014 deferred, non-render-blocking -->\n'
                f'{LUCIDE_SRC}\n'
            )
        html = html[:body_idx] + deferred + html[body_idx:]

    # ── Write ──────────────────────────────────────────────────────────────
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

    new_len = len(html)
    split_note = f' + CSS split' if cfg['split_marker'] else ''
    lucide_note = f' + Lucide deferred' if cfg['lucide'] else ''
    print(f'  {cfg["name"]}: {original_len:,} -> {new_len:,} bytes (delta {new_len-original_len:+,}){split_note}{lucide_note}')


# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────
print('Applying PageSpeed optimisations to footer pages...\n')
errors = []
for cfg in FILES:
    try:
        process_file(cfg)
    except AssertionError as e:
        errors.append(str(e))
        print(f'  SKIPPED {cfg["name"]}: {e}')

print()
if errors:
    print(f'Completed with {len(errors)} error(s) — see above.')
else:
    print('All 13 footer pages optimised successfully.')
