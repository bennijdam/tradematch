# TradeMatch UK — UI/UX Remediation Report

> Generated: February 2026
> Scope: `apps/web/` — 129 HTML pages, ~15 JS modules

---

## 1. What Was Done

### 1.1 Core Infrastructure Added

| Asset | Purpose |
|---|---|
| `shared/ui/confirm-modal.js` | Singleton `CustomConfirm` object exposing `.ask()`, `.prompt()`, `.toast()` — the central replacement for all native browser dialogs |
| `.ask(title, body, label, type)` | Async modal confirmation (replaces `confirm()`) |
| `.prompt(title, body, inputLabel, label, type)` | Async modal with text input (replaces `prompt()`) |
| `.toast(message, type)` | Non-blocking slide-in notification (replaces success/error `alert()`) |

`confirm-modal.js` was added as a `defer` script tag to **every page** that needed it across all batches.

---

### 1.2 Files Patched — Complete List

#### Batch 1–3 (Previous Sessions)
| File | Changes |
|---|---|
| `vendor-active-quotes.html` | `viewJob`, `openChat` → navigation; `editQuote`, `withdrawQuote` → `CustomConfirm.ask()` + fade-out |
| `ask-a-trade.html` | Inline `#questionSuccess` state; card clicks → navigation |
| `find-tradespeople.html` | `filterCards()` client-side filter; "View Profile" / "Get Quote" → real URLs |
| `user-dashboard-settings.html` | `showError()`, `showModalError()` helpers; 13 alerts replaced |

#### Batch 4
| File | Changes |
|---|---|
| `user-dashboard-profile.html` | Password change → redirect; `deleteAccountBtn` → `CustomConfirm.prompt()` |
| `post-a-job.html` | `showStepError()` helper; 7 validation alerts → inline errors |
| `post-job.html` | Success alert → `showToast()` + redirect |
| `proposal-builder.html` | 4 draft/generate alerts → `CustomConfirm.toast()` |
| `register.html` | `showFormError()` helper; validation alerts → inline errors |
| `user-dashboard-reviews.html` | API error → `showToast()` |
| `payment-system.html` | Clipboard + payment errors → `CustomConfirm.toast()` |
| `vendor-register.html` | `showRegisterError()` helper; success → redirect |
| `vendor-service-area.html` | Postcode error → `#postcodeError` inline; bulk import → toast |

#### Batch 5
| File | Changes |
|---|---|
| `dashboard-vendor-settings.html` | `addPostcode()` 2× `window.prompt()` → single `CustomConfirm.prompt()` |
| `index.html` | Search validation → `#searchError` inline |
| `tradematch-website-index.html` | Same as above |
| `cost-calculator.html` | Validation → `#calcError` inline |
| `email-preferences.html` | Auth-guard alert removed (redirect is sufficient) |
| `saved-trades.html` | `notifyToast()` fallback → `CustomConfirm.toast()` |
| `trade-signup.html` | `handleSignup()` prompt+alert → `CustomConfirm.prompt()` + redirect |
| `vendor-signup-page.html` | Same pattern as `trade-signup.html` |
| `reviews.html` | "Learn more" → `<a href="/help-centre">`; report → navigation; reply → toast |
| `quote-engine.html` | `showStepError()` + 9 alerts → toasts/inline errors |
| `quote-engine-withoutai.html` | Same pattern |
| `vendor-dashboard-enhanced.html` | `showDashToast()` helper; 14 alerts → toasts |

#### Batch 6 (new-pages-* duplicates)
| File | Changes |
|---|---|
| `new-pages-ask-a-trade.html` | Inline success state; navigation |
| `new-pages-blog.html` | Newsletter form → inline success message |
| `new-pages-careers.html` | Apply → `mailto:` redirect |
| `new-pages-find-tradespeople.html` | `filterCards()` + `nameToSlug()` + navigation |
| `new-pages-help-centre.html` | Live chat link → `/contact` |
| `new-pages-post-a-job.html` | `showStepError()` + 7 alerts |
| `new-pages-vendor-signup-page.html` | `CustomConfirm.prompt()` + redirect |
| `quote-engine-aiold.html` | `showStepError()` + `showQEToast()` + 10 alerts |

#### Batch 7 (shared JS files)
| File | Changes |
|---|---|
| `shared/utils/ai-enhancement.js` | Input highlight for empty; toast for API error |
| `user-dashboard/dashboardApp.js` | `notifyError()` + `acceptQuote` fallback alerts → toast chain |
| `vendor-dashboard/dashboardApp.js` | Toast fallback alert → toast; `sendQuote()` 4× `window.prompt()` → `/proposal-builder?lead=` |
| `vendor-dashboard/modals/vendor-onboarding-wizard.js` | Completion alert → toast; skip `confirm()` → `CustomConfirm.ask()` |
| `vendor-onboarding-wizard.html` + `vendor-onboarding-wizard-source.html` | Added `confirm-modal.js` |

#### Batch 8 (bare `confirm()` sweep)
| File | Changes |
|---|---|
| `saved-trades.html` | `removeTrade()` `confirm()` → `CustomConfirm.ask()` |
| `settings-combined-final.html` | 5× `confirm()` (logout/pause) → `CustomConfirm.ask()` |
| `settings-original-backup.html` | 2× `confirm()` → `CustomConfirm.ask()` |
| `user-dashboard/dashboardApp.js` | `acceptQuote()` + logout `confirm()` → `CustomConfirm.ask()` |
| `vendor-coverage.html` | `removePostcode()` `confirm()` → `CustomConfirm.ask()` |
| `vendor-dashboard-enhanced.html` | `toggleAutoAccept()` + `resetAutoAcceptForm()` `confirm()` → `CustomConfirm.ask()` |
| `your-quotes.html` | `archiveQuote()` `confirm()` → `CustomConfirm.ask()` |
| 8 user-dashboard consumer pages | Added `confirm-modal.js` (`billing-addons`, `billing`, `job-details`, `job-quotes`, `my-jobs`, `notifications`, `quotes`, `user-dashboard-index`) |

---

### 1.3 Patterns Established

| Pattern | Used In |
|---|---|
| `showStepError(message)` — injects `<p class="step-error-msg">` into active `.form-step` | `post-a-job`, `post-a-job-new`, `quote-engine*`, `register` |
| `showModalError(modalId, message)` — injects error inside a modal body | `user-dashboard-settings` |
| `showFormError(stepId, message)` — targets named step element | `register` |
| `showDashToast(message, type)` — delegates to `CustomConfirm.toast` → `showToast` → standalone | `vendor-dashboard-enhanced`, `quote-engine-aiold` |
| `showRegisterError(message)` — injects at top of form | `vendor-register` |
| `notifyToast()` / `notifyError()` fallback chain | All dashboard JS |
| Navigation replacement — `window.location.href` for card/action clicks | All pages with placeholder `onclick="alert()"` |
| Inline success state — hidden `<div id="*Success">` shown on form submit | `ask-a-trade`, `new-pages-ask-a-trade`, `new-pages-blog` |

---

### 1.4 Final Verification Result

```
alert()         — 0 remaining
window.confirm()— 0 remaining
window.prompt() — 0 remaining
bare confirm()  — 0 remaining
bare prompt()   — 0 remaining
```

---

## 2. What Still Needs To Be Done

### 2.1 High Priority — Broken / Dead UI

#### `href="#"` Dead Links (167 instances across 129 files)
Many nav items, footer links, CTA buttons, and sidebar links resolve to `#` with no handler — they silently do nothing or jump the page to the top.

**Action:** Audit all `href="#"` links and either:
- Replace with correct routes (e.g. `/how-it-works`, `/about`)
- Attach a click handler that navigates or opens the relevant section
- Convert to `<button>` elements where they trigger JS actions

Files most affected: `vendor-dashboard.html`, `customer-dashboard.html`, `landing-page.html`, `dashboard-vendor-*`.

#### 38 `TODO` Comments Left in Production HTML
These represent unimplemented features that will silently fail for users. Key examples:
- Payment flow stubs (`// TODO: POST /api/vendor/pause`)
- Session management (`// TODO: DELETE /api/vendor/sessions/{id}`)
- GDPR data export (`// TODO: POST /api/vendor/export`)

**Action:** Either implement the API calls or show a user-visible "Coming soon" toast rather than silently passing.

#### 32 "In production" / `SAMPLE_DATA` Placeholder References
Several pages (e.g. `vendor-coverage.html`, `dashboard-vendor-heatmaps.html`) use hardcoded `SAMPLE_DATA` arrays instead of live API data. Users see fake numbers.

**Action:** Wire these to the real API endpoints that already exist in `apps/api/`.

---

### 2.2 Medium Priority — UX Completeness

#### Loading States Missing (18 pages with `fetch()` but no spinner/skeleton)
Pages that make API calls show no feedback while waiting. Affected pages include:
`messages.html`, `messaging-system.html`, `blog.html`, `heatmaps.html`, `edit-job-modal.html`, `auth-select-role.html`, `dashboard-vendor-heatmaps.html`.

**Action:** Add a consistent loading skeleton or spinner pattern. A shared `showPageLoader()` / `hidePageLoader()` utility in `shared/ui/` would be the cleanest approach.

#### Empty States Missing (42 pages with `fetch()` but no empty-state handling)
When API returns an empty array the page renders nothing with no explanation. Users don't know if the page is broken or they simply have no data yet.

**Action:** Add empty-state components with context-appropriate messaging and CTAs, e.g.:
- "You haven't posted any jobs yet. [Post your first job →]"
- "No quotes received yet. We'll notify you when tradespeople respond."

#### 141 `console.log` Calls in HTML Files
Debug log statements expose internal data structures (form payloads, auth tokens, API responses) to anyone with DevTools open.

**Action:** Strip all `console.log` from production HTML, or gate behind a `DEBUG` flag.

#### Form Validation — Client-Side Only
Most forms validate client-side but show no server-side error feedback path. If the API returns a validation error (e.g. duplicate email, invalid postcode format from server), the user sees nothing.

**Action:** All `fetch()` form submissions should funnel API error responses through the already-established `showStepError()` / `showFormError()` helpers.

---

### 2.3 Lower Priority — Polish & Consistency

#### Inconsistent Toast/Error Patterns Across Pages
The project now has several slightly different toast helper names:
`showDashToast()`, `showVendorToast()`, `showQEToast()`, `notifyToast()`, `showToast()`, `CustomConfirm.toast()`.

**Action:** Consolidate into a single `showToast(message, type)` call in `shared/ui/` that all pages import — similar to how `confirm-modal.js` is now shared. This would replace all the per-page fallback chains.

#### `new-pages-*` Duplication (9 files)
The `new-pages-*` prefix files are redesigned versions of existing pages, but both versions are live. This creates route ambiguity and maintenance burden.

**Action:** Decide which version to keep for each route and retire the other, or set up proper A/B routing.

#### `*-backup.html` / `*-combined-final.html` Files Served Publicly
`settings-original-backup.html`, `vendor-settings-original-backup.html`, `settings-combined-final.html` are accessible via the web server. These contain older code, duplicate logic, and were not intended to be public.

**Action:** Move these behind a `/dev/` path or remove them from the web root.

#### Password Change UX
`user-dashboard-profile.html` redirects to `/user-dashboard-settings?section=password` for password changes. The settings page should scroll to and auto-open the password modal on arrival of that query param — currently it does not.

**Action:** Add query-param listener in `user-dashboard-settings.html` to auto-open the relevant modal.

#### `sendQuote()` Redirect (vendor-dashboard)
The 4-step `window.prompt()` chain was replaced with a redirect to `/proposal-builder?lead=<id>`. The proposal builder page needs to be wired to read the `?lead=` param and pre-fill the vendor quote form, completing the flow.

---

## 3. Potential UX Enhancements

These are improvements beyond fixing bugs — they would meaningfully improve the user experience:

### 3.1 Autosave & Progress Persistence
`quote-engine.html` already uses `localStorage` for progress. This pattern should be extended to:
- `post-a-job.html` multi-step form
- `register.html` multi-step registration
- `vendor-register.html`

Users who accidentally close the tab lose all their data.

### 3.2 Optimistic UI for Like/Save/Accept Actions
Actions like "Save Trade", "Accept Quote", "Withdraw Quote" currently wait for the API response before updating the DOM. Adding optimistic UI (update immediately, roll back on error) would make the interface feel much faster.

### 3.3 Real-Time Notifications
The notifications page (`notifications.html`) is static. Integrating WebSocket or SSE from the existing `event-broker.service.js` in the API would allow:
- Live badge counts on the nav bar
- Push notifications for new quotes/messages
- Real-time chat in `messages.html`

### 3.4 Keyboard Navigation & Accessibility
- Modal dialogs (`CustomConfirm.ask()`, etc.) already trap focus correctly.
- Most data tables, card grids, and filter buttons lack `aria-label`, `role`, and keyboard interaction.
- Form errors should use `aria-describedby` to associate the error message with the input.
- Colour contrast on several CTAs (e.g. light green on white) may not meet WCAG AA.

### 3.5 Mobile Responsiveness Gaps
Several dashboard pages (e.g. `vendor-dashboard-enhanced.html`, `heatmaps.html`, `milestone-manager.html`) use fixed-width layouts that break on screens below 768px. A systematic mobile audit is needed.

### 3.6 Skeleton Loading Screens
Replace the current "Please wait." text with CSS skeleton screens for:
- Tradesperson cards on `find-tradespeople.html`
- Quote cards on `job-quotes.html` and `your-quotes.html`
- Dashboard stats on `vendor-dashboard-enhanced.html`

### 3.7 Inline Postcode Autocomplete
The postcode input fields across `post-a-job.html`, `quote-engine.html`, `register.html` validate format after submission. Using the free postcodes.io API for real-time autocomplete/validation would reduce bounce at this step.

### 3.8 Onboarding Flow Polish
`vendor-onboarding-wizard.js` is a 6-step modal with no progress save. If a vendor closes the tab mid-onboarding, they start over. Persisting step + answers to `localStorage` (or the backend) and resuming on next login would improve completion rates significantly.

### 3.9 Error Boundary / Global Error Handler
There is no global `window.onerror` or `unhandledrejection` handler. Silent JS errors go unnoticed. Adding a global handler that at minimum calls `showToast('Something went wrong. Please refresh.', 'error')` would catch unexpected failures.

### 3.10 Confirmation for Destructive Bulk Actions
Some pages allow bulk operations (e.g. bulk postcode import in `vendor-service-area.html`) without confirming the count or showing a preview. Adding a "You're about to add 47 postcodes — confirm?" step before commit would reduce mistakes.

---

## 4. Summary Table

| Category | Status | Count |
|---|---|---|
| `alert()` calls removed | ✅ Complete | ~80+ |
| `confirm()` calls replaced | ✅ Complete | ~25 |
| `prompt()` calls replaced | ✅ Complete | ~12 |
| `confirm-modal.js` deployed | ✅ Complete | 40+ pages |
| Inline form error patterns | ✅ Complete | 10 pages |
| Navigation replacements | ✅ Complete | All pages |
| Dead `href="#"` links | ❌ Not started | 167 |
| TODO stubs wired to API | ❌ Not started | 38 |
| `console.log` cleanup | ❌ Not started | 141 |
| Mock/sample data replaced | ❌ Not started | 32 |
| Loading states added | ❌ Not started | 18 pages |
| Empty states added | ❌ Not started | 42 pages |
| Toast system consolidated | ⚠️ Partial | Multiple helpers |
| Mobile responsiveness audit | ❌ Not started | Many pages |
| Accessibility (ARIA) | ❌ Not started | Sitewide |
| Keyboard navigation | ❌ Not started | Sitewide |
