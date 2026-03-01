#!/usr/bin/env python3
"""
PageSpeed optimizer for apps/web/quote-engine.html
Changes: non-blocking fonts, dns-prefetch, critical-CSS split,
         non-critical CSS deferred to end of body.
"""
import re

PATH = r'C:\Users\ASUS\Desktop\tradematch-fixed\apps\web\quote-engine.html'
with open(PATH, encoding='utf-8') as f:
    html = f.read()
original_len = len(html)

# ─────────────────────────────────────────────────────────────────────────────
# 1. HEAD: dns-prefetch + non-blocking fonts
#    Remove Sora:300 (unused weight).
# ─────────────────────────────────────────────────────────────────────────────
OLD_HEAD = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800'
    '&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400'
    '&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
)

FONT_URL = (
    'https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800'
    '&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400'
    '&family=JetBrains+Mono:wght@400;500;600&display=swap'
)

NEW_HEAD = (
    '<!-- Resource hints -->\n'
    '    <link rel="dns-prefetch" href="https://fonts.googleapis.com">\n'
    '    <link rel="dns-prefetch" href="https://fonts.gstatic.com">\n'
    '    <link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '    <!-- Non-blocking Google Fonts (eliminates render-blocking resource) -->\n'
    '    <link rel="preload" href="' + FONT_URL + '" as="style"'
    ' onload="this.onload=null;this.rel=\'stylesheet\'">\n'
    '    <noscript><link href="' + FONT_URL + '" rel="stylesheet"></noscript>'
)

assert OLD_HEAD in html, "HEAD block not found — check whitespace"
html = html.replace(OLD_HEAD, NEW_HEAD, 1)
print("1. Non-blocking fonts + dns-prefetch applied")

# ─────────────────────────────────────────────────────────────────────────────
# 2. CRITICAL CSS SPLIT
#    Everything from /* AI GENERATOR */ through </style> is
#    non-critical (below-the-fold). Close the <style> before it and
#    inject it as <style id="nc-styles"> at end of body.
# ─────────────────────────────────────────────────────────────────────────────
SPLIT_MARKER = '\n\n        /* AI GENERATOR */'

assert SPLIT_MARKER in html, "CSS split marker not found"

marker_idx  = html.index(SPLIT_MARKER)
style_close = html.index('</style>', marker_idx)

# Extract the non-critical CSS (from marker to just before </style>)
non_critical_css = html[marker_idx : style_close]

# In the head: replace [marker … </style>] with just </style>
html = html[:marker_idx] + '\n    ' + html[style_close:]
print("2. Non-critical CSS extracted from <head>")

# ─────────────────────────────────────────────────────────────────────────────
# 3. INJECT DEFERRED CSS — just before </body>
# ─────────────────────────────────────────────────────────────────────────────
BEFORE_BODY_CLOSE = '<script src="/shared/ui/profile-menu.js" defer></script>\n</body>'
DEFERRED_BLOCK = (
    '<script src="/shared/ui/profile-menu.js" defer></script>\n'
    '<!-- Non-critical CSS (below-fold styles) — non-blocking -->\n'
    '<style id="nc-styles">' + non_critical_css + '\n</style>\n'
    '</body>'
)
assert BEFORE_BODY_CLOSE in html, "</body> anchor not found"
html = html.replace(BEFORE_BODY_CLOSE, DEFERRED_BLOCK, 1)
print("3. Non-critical CSS moved to end of body")

# ─────────────────────────────────────────────────────────────────────────────
# 4. WRITE OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(html)

new_len = len(html)
print(f"\nFile size: {original_len:,} -> {new_len:,} bytes (delta {new_len-original_len:+,})")
print("All optimizations applied successfully.")
