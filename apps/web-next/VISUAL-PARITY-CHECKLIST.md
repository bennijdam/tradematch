# Visual Parity Checklist

Use this checklist to verify pixel-perfect matching between legacy HTML and Next.js implementation.

## Breakpoint Testing

### Desktop (1440px)
- [ ] Sidebar width matches exactly (218px Admin, 280px Vendor/User)
- [ ] Topbar height matches (54px)
- [ ] Grid layouts align correctly
- [ ] Spacing between elements matches
- [ ] Typography sizes and weights match
- [ ] Border colors and widths match
- [ ] Shadow/glow effects visible

### Mobile (375px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Content reflows to single column
- [ ] Touch targets are appropriate size
- [ ] Text remains readable
- [ ] No horizontal scrolling

## Component Verification

### Sidebar
Legacy | Next.js | Status
--- | --- | ---
`.sidebar { width: 218px }` | `className="w-[218px]"` | ⬜
`.sb-logo { padding: 16px 14px 14px }` | `className="px-[14px] py-4"` | ⬜
`.sb-badge { width: 28px, height: 28px }` | `className="w-7 h-7"` | ⬜
`.sb-name { font-size: 13px }` | `className="text-[13px]"` | ⬜
`.sb-role { font-size: 7.5px }` | `className="text-[7.5px]"` | ⬜
`.ni { padding: 7px 14px }` | `className="px-[14px] py-[7px]"` | ⬜
`.ni.active { border-left: 2px solid #00E5A0 }` | `className="border-l-2 border-l-neon"` | ⬜
`.nb { font-size: 8.5px }` | `className="text-[8.5px]"` | ⬜

### Topbar
Legacy | Next.js | Status
--- | --- | ---
`.topbar { height: 54px }` | `className="h-[54px]"` | ⬜
`.tb-title { font-size: 14px }` | `className="text-[14px]"` | ⬜
`.tb-sub { font-size: 7.5px }` | `className="text-[7.5px]"` | ⬜
`.pulse-dot { box-shadow: 0 0 18px rgba(0,229,160,0.28) }` | `className="shadow-neon"` | ⬜
`.live-time { font-size: 13px, color: #00E5A0 }` | `className="text-[13px] text-neon"` | ⬜

### Cards
Legacy | Next.js | Status
--- | --- | ---
`.panel { border-radius: 11px }` | `className="rounded-[11px]"` | ⬜
`.card { border-radius: 16px }` | `className="rounded-[16px]"` | ⬜
`.mc { border-radius: 10px }` | `className="rounded-[10px]"` | ⬜
`.mc-label { font-size: 7.5px }` | `className="text-[7.5px]"` | ⬜
`.mc-val { font-size: 21px }` | `className="text-[21px]"` | ⬜
`.mc-delta { font-size: 8.5px }` | `className="text-[8.5px]"` | ⬜

### Tables
Legacy | Next.js | Status
--- | --- | ---
`.dt th { font-size: 7.5px }` | `className="text-[7.5px]"` | ⬜
`.dt td { font-size: 11.5px }` | `className="text-[11.5px]"` | ⬜
`.td-name { font-weight: 600 }` | `className="font-semibold"` | ⬜
`.td-mono { font-size: 9.5px }` | `className="text-[9.5px]"` | ⬜

### Buttons
Legacy | Next.Windows | Status
--- | --- | ---
`.tb-btn { border-radius: 6px }` | `className="rounded-md"` | ⬜
`.tb-btn.primary { background: #00E5A0 }` | `variant="primary"` | ⬜
`.tb-btn.danger { color: #FF4757 }` | `variant="danger"` | ⬜
`.pbtn { border-radius: 5px }` | `className="rounded-[5px]"` | ⬜
`.pbtn { font-size: 9.5px }` | `className="text-[9.5px]"` | ⬜

### Badges
Legacy | Next.js | Status
--- | --- | ---
`.badge { border-radius: 100px }` | `className="rounded-full"` | ⬜
`.badge { font-size: 8.5px }` | `className="text-[8.5px]"` | ⬜
`.b-neon { border: 1px solid rgba(0,229,160,0.18) }` | `variant="neon"` | ⬜

## Animation Verification

- [ ] Fade-in animation on view change (0.2s ease)
- [ ] Pulse animation on live indicator (2s infinite)
- [ ] Hover transitions (0.15s)
- [ ] Border color transitions (0.2s)
- [ ] Modal open/close animations
- [ ] Toast slide-in animation

## Interaction Verification

- [ ] Button hover states
- [ ] Card hover states
- [ ] Table row hover highlighting
- [ ] Navigation item active states
- [ ] Modal backdrop click to close
- [ ] Toast auto-dismiss (5s)
- [ ] Sidebar mobile toggle

## Color Verification

Use browser dev tools to verify exact color matching:

Element | Expected | Actual | Match
--- | --- | --- | ---
Background (bg-0) | `#050709` | | ⬜
Background (bg-1) | `#0a0d14` | | ⬜
Background (bg-2) | `#0f1219` | | ⬜
Neon accent | `#00E5A0` | | ⬜
Danger | `#FF4757` | | ⬜
Amber | `#FFA726` | | ⬜
Blue | `#42A5F5` | | ⬜
Text primary (t1) | `#ffffff` | | ⬜
Text secondary (t2) | `rgba(255,255,255,0.68)` | | ⬜
Border | `rgba(255,255,255,0.055)` | | ⬜
Border hover | `rgba(255,255,255,0.16)` | | ⬜

## Typography Verification

Element | Font | Size | Weight | Match
--- | --- | --- | --- | ---
Logo | Syne | 13px | 700 | ⬜
Role badge | JetBrains Mono | 7.5px | - | ⬜
Nav items | DM Sans/Archivo | 12px | 500 | ⬜
Section title | Syne | 10px | 700 | ⬜
Metric label | JetBrains Mono | 7.5px | - | ⬜
Metric value | Syne | 21px | 800 | ⬜
Topbar title | Syne | 14px | 700 | ⬜
Table header | JetBrains Mono | 7.5px | - | ⬜
Table cell | DM Sans/Archivo | 11.5px | - | ⬜
Badge text | JetBrains Mono | 8.5px | 600 | ⬜
Live time | JetBrains Mono | 13px | 600 | ⬜

## Spacing Verification

Use browser dev tools to verify exact spacing:

Element | Expected | Actual | Match
--- | --- | --- | ---
Content padding | `18px 22px 30px` | | ⬜
Card padding | `13px` | | ⬜
Panel header padding | `12px 15px 11px` | | ⬜
Navigation item gap | `8px` | | ⬜
Metric strip gap | `9px` | | ⬜
Grid gap | `12px` | | ⬜

## Responsive Verification

### At 1080px breakpoint:
- [ ] Sidebar moves to top (static positioning)
- [ ] Content area full width
- [ ] Grid columns stack to single
- [ ] Topbar spans full width
- [ ] No layout breaks

### At 375px breakpoint:
- [ ] Sidebar hidden, hamburger visible
- [ ] All cards full width
- [ ] Text readable (no overflow)
- [ ] Touch targets > 44px
- [ ] No horizontal scroll

## Icon Verification

Legacy Icon | Lucide Icon | Match
--- | --- | ---
fa-chart-line | LineChart | ⬜
fa-users | Users | ⬜
fa-store | Store | ⬜
fa-briefcase | Briefcase | ⬜
fa-comments | MessageSquare | ⬜
fa-bell | Bell | ⬜
fa-cog | Settings | ⬜
fa-credit-card | CreditCard | ⬜
fa-check-circle | CheckCircle | ⬜
fa-exclamation-circle | AlertCircle | ⬜
fa-plus | Plus | ⬜
fa-search | Search | ⬜
fa-edit | Edit | ⬜
fa-trash | Trash2 | ⬜
fa-eye | Eye | ⬜
fa-eye-slash | EyeOff | ⬜
fa-lock | Lock | ⬜
fa-user | User | ⬜
fa-envelope | Mail | ⬜
fa-phone | Phone | ⬜
fa-calendar | Calendar | ⬜
fa-clock | Clock | ⬜
fa-download | Download | ⬜
fa-upload | Upload | ⬜
fa-chevron-down | ChevronDown | ⬜
fa-chevron-right | ChevronRight | ⬜
fa-bars | Menu | ⬜
fa-times | X | ⬜
fa-star | Star | ⬜
fa-heart | Heart | ⬜
fa-arrow-left | ArrowLeft | ⬜
fa-arrow-right | ArrowRight | ⬜
fa-external-link | ExternalLink | ⬜
fa-filter | Filter | ⬜
fa-sort | SortAsc | ⬜

## Notes

Add any discrepancies or notes here:

- 
- 
- 

## Sign-off

- [ ] Desktop (1440px) verified
- [ ] Mobile (375px) verified
- [ ] All components match
- [ ] Ready for production

**Verified by:** _________________ **Date:** _________________
