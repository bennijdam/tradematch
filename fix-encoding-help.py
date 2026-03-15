import sys

file = 'apps/web/help-centre.html'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

def h(hex_str):
    return bytes.fromhex(hex_str).decode('utf-8')

replacements = [
  (h('c482cb98c3a2e282acc2a0e28099'), '\u2192'),
  (h('c482e2809ac2b7'), '\u00b7'),
  (h('c482cb98c3a2e2809ac2acc3a2e282acc5a5'), '\u2014'),
  (h('c482cb98c3a2e282acc5a5c3a2e2809ac2ac'), '\u2014'),
  (h('c482e2809ac4b9c281'), '\u00a3'),
  (h('c482cb98c3a2e2809ac2acc4b9c5ba'), '\u203a'),
  (h('c482cb98c3a2e2809ac2acc3a2e282acc59b'), '\u2013'),
  (h('c482cb98c3a2e2809ac2acc382c2a6'), '\u2026'),
  (h('c482cb98c3a2e282accb98c382c290'), '\u2022'),
  (h('c482cb98e28094c4b9c485'), '\u2713'),
  (h('c482cb98c4b9e280bac3a2e282accb98'), '\u2715'),
  (h('c482cb98c4b9e280bac3a2e282acc59b'), '\u2713'),
  (h('c482cb98c4b9cb87c38be280a1'), '\u26a1'),
  (h('c482cb98c4b9cb87c2a0c384c5b9c382c2b8c4b9c485'), '\u26a0\ufe0f'),
  (h('c482cb98c4b9cb87e28093c384c5b9c382c2b8c4b9c485'), '\u2696\ufe0f'),
  (h('c482cb98c382c2adc382c290'), '\u2b50'),
  (h('c482cb98c4b9e280bac3a2e282ac'), '\ud83d\udd0d'),
  (h('c384e28098c4b9c59fc3a2e282acc59bc3a2e282acc485'), '\ud83d\udccb'),
  (h('c384e28098c4b9c59fe28099c382c2ac'), '\ud83d\udcac'),
  (h('c384e28098c4b9c59fc3a2e282acc5a5c382c290'), '\ud83d\udd10'),
  (h('c384e28098c4b9c59fc3a2e282acc59fc38be280a1c384c5b9c382c2b8c4b9c485'), '\ud83d\udee1\ufe0f'),
  (h('c384e28098c4b9c59fc4b9cb87c3a2e2809ac2ac'), '\ud83d\ude80'),
  (h('c384e28098c4b9c59fe28099c2b0'), '\ud83d\udcb0'),
  (h('c384e28098c4b9c59fc3a2e282acc59bc4b9c2a0'), '\ud83d\udcca'),
  (h('c384e28098c4b9c59fe28094c3a2e282acc5bec384c5b9c382c2b8c4b9c485'), '\ud83d\udd11'),
  (h('c384e28098c4b9c59fc3a2e282acc59bc382c288'), '\ud83d\udcc8'),
  (h('c384e28098c4b9c59fc4b9c485c3a2e282acc2a0'), '\ud83c\udfc6'),
  (h('c384e28098c4b9c59fc3a2e282acc5a5e28099'), '\ud83d\udca1'),
  (h('c384e28098c4b9c59fe28099cb87'), '\ud83d\udca1'),
  (h('c384e28098c4b9c59fc3a2e282acc59bc4b9c281'), '\ud83d\udce3'),
]

total_replaced = 0
for search, replace in replacements:
    count = content.count(search)
    if count > 0:
        content = content.replace(search, replace)
        total_replaced += count
        print(f"Replaced {count}x: {search.encode('utf-8').hex()[:12]} -> {replace}")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Total: {total_replaced}")
