# TradeMatch Full System Audit TODO (Quick Quote Operational Readiness)

## Scope
This TODO covers missing logic and integration gaps required to make the Quick Quote journey production-ready end-to-end:
- Entry: homepage quick quote (`apps/web/index.html`)
- Main flow: quote form (`apps/web/quote-engine.html`)
- API: quote + lead routes (`apps/api/routes/quotes.js`, `apps/api/routes/leads.js`, `apps/api/server.js`)
- Compliance and policy checks (UK postcode, consent, data handling)
- Workspace dependency policy consistency (PNPM catalog)

---

## 1) Current System Map (Verified)

### Lead entry points (frontend)
- Homepage quick quote form submits to `handleQuickSearch(event)` and redirects to `/quote-engine?...` (no direct API submit from homepage).
- “Join as Pro / Trade Signup” links route to registration pages (link-based entry, no homepage API submit).

### Lead/quote submission (frontend -> backend)
- Quote Engine submits:
  - Authenticated: `POST https://api.tradematch.uk/api/quotes`
  - Guest: `POST https://api.tradematch.uk/api/quotes/public`
- Backend route mounts confirmed in `apps/api/server.js`:
  - `/api/quotes`, `/api/leads`, `/api/postcode`, `/api/email`, etc.

### Persistence + pipeline (backend)
- `POST /api/quotes/public` inserts quote and returns `quote: { id, ... }`.
- `POST /api/quotes` inserts quote and returns `{ quoteId }`.
- Lead pipeline async processing hooks exist in `quotes.js` and lead lifecycle endpoints exist in `leads.js`.

---

## 2) P0 (Blockers) — Fix Immediately

- [x] **Fix API contract mismatch for authenticated quote submit**
  - Problem: frontend expects `data.quote.id`, backend returns `data.quoteId` for auth path.
  - Risk: authenticated quote success modal can fail or show broken quote ID.
  - Target files: `apps/web/quote-engine.html`, `apps/api/routes/quotes.js`
  - Acceptance:
    - Auth and guest submissions both resolve a valid displayed quote ID.
    - Response schema is consistent across both endpoints (prefer `quote.id` in both).

- [x] **Stop duplicate GDPR/cookie DOM blocks and duplicate script execution**
  - Problem: duplicate `gdprNotice`, `acceptCookies`, `cookieSettings`, `socialProofContainer` IDs and duplicated script blocks in homepage.
  - Risk: non-deterministic DOM behavior and compliance UI instability.
  - Target file: `apps/web/index.html`
  - Acceptance:
    - Each consent element ID appears once.
    - Consent script initializes once and behaves deterministically.

- [x] **Use first-party backend postcode endpoint for validation/autocomplete**
  - Problem: homepage autocomplete currently calls `api.postcodes.io` directly from browser.
  - Risk: client-side dependency leakage, inconsistent behavior, harder observability/rate control.
  - Target files: `apps/web/index.html`, `apps/api/routes/postcode.js`
  - Acceptance:
    - Frontend queries `/api/postcode/...` only.
    - Backend validates and normalizes response.

---

## 3) P1 (High Priority) — Operational Hardening

- [x] **Add server-side postcode verification in quote creation routes**
  - Problem: only required-field + regex-level checks; no authoritative postcode existence verification.
  - Target file: `apps/api/routes/quotes.js`
  - Acceptance:
    - `POST /api/quotes` and `/api/quotes/public` reject invalid/non-existent postcodes with clear error code.

- [x] **Standardize error payloads for frontend handling**
  - Problem: mixed error shapes (`error`, `errors[]`, and route-specific structures).
  - Target files: `apps/api/routes/quotes.js`, shared error helpers if present
  - Acceptance:
    - Errors follow one envelope (e.g., `{ error, code, details }`) across quote endpoints.
    - Frontend displays field-level and global errors consistently.

- [x] **Make quote API base URL environment-driven**
  - Problem: hardcoded `https://api.tradematch.uk` in frontend submit calls.
  - Target file: `apps/web/quote-engine.html`
  - Acceptance:
    - Dev/staging/prod API base selectable without code edits.

- [x] **Add idempotency/duplicate submission protection**
  - Problem: repeated clicks/network retries can create duplicate quotes.
  - Target files: `apps/web/quote-engine.html`, `apps/api/routes/quotes.js`
  - Acceptance:
    - Duplicate submissions within short window are safely ignored or merged.

- [x] **Confirm transactional notification wiring for quote creation**
  - Problem: lead pipeline exists, but explicit quote-created notification coverage should be verified and enforced.
  - Target files: `apps/api/routes/quotes.js`, `apps/api/routes/email.js` and/or email service
  - Acceptance:
    - Quote-created customer confirmation and internal/vendor trigger events are logged and testable.

---

## 4) P2 (Medium Priority) — UX/Data Quality/Consistency

- [x] **Normalize GBP formatting to UK locale**
  - Problem: `toLocaleString()` used without explicit `en-GB` in budget displays.
  - Target file: `apps/web/quote-engine.html`
  - Acceptance:
    - All currency formatting uses a single helper with UK locale.

- [x] **Centralize UK postcode validation regex/helper**
  - Problem: postcode validation logic duplicated across forms.
  - Target files: `apps/web/index.html`, `apps/web/quote-engine.html`, `apps/api/routes/quotes.js`
  - Acceptance:
    - Shared validator pattern used consistently frontend + backend.

- [x] **Add analytics events at key funnel steps**
  - Events: quick quote start, step completion, submit success, submit failure (with reason category).
  - Target files: `apps/web/index.html`, `apps/web/quote-engine.html`, backend logging hooks
  - Acceptance:
    - Funnel drop-off and submit error rates are measurable.

---

## 5) Dependency/Design-System Policy Audit ✅ COMPLETED

- [x] **Define and enforce workspace dependency policy for React/Tailwind (or explicitly document not used)**
  - Current state: PNPM catalog exists for backend/shared infra deps only (`@sentry/node`, `dotenv`, `pg`, `serve`).
  - No React/Tailwind catalog usage detected in package manifests.
  - No `@tradematch/ui` package usage found in current manifests/files searched.
  - Decision: Documented static-HTML architecture decision.
  - Result: **ARCHITECTURE.md** created with explicit decision to NOT use React/Tailwind.
  - Benefits: Better SEO, faster page loads, simpler deployment, smaller bundle size.
  - All P0/P1/P2 items implemented as static HTML without React/Tailwind dependencies.

---

## 6) UK Compliance Checklist (Quick Quote Specific) ✅ COMPLETED

- [x] **Consent persistence remains explicit and auditable**
  - Keep cookie/GDPR consent state single-sourced (no duplicate IDs/scripts).
  - **Status**: Verified - Single-source consent in localStorage, no duplicate IDs.
  - **Evidence**: `UK_COMPLIANCE.md` Section 1

- [x] **Data minimization for guest quotes**
  - Ensure only required contact fields are collected/stored at quote submission stage.
  - **Status**: Verified - Only 4 required fields, all others optional.
  - **Evidence**: `UK_COMPLIANCE.md` Section 2

- [x] **Privacy links and consent UX consistency**
  - Verify `privacy-policy` routes/links are valid in deployed environment.
  - **Status**: Verified - Links to privacy.html and cookies.html on all pages.
  - **Evidence**: `UK_COMPLIANCE.md` Section 3

- [x] **Server-side validation as compliance control**
  - Do not rely solely on client-side postcode/field validation.
  - **Status**: Verified - Server-side postcode verification + express-validator.
  - **Evidence**: `UK_COMPLIANCE.md` Section 4

---

## 7) Suggested Implementation Order (Sprintable)

### Sprint 1 (must-ship)
- P0 items (API contract mismatch, duplicate consent blocks, backend postcode endpoint usage)

### Sprint 2
- P1 items (server-side postcode verification, unified error schema, env-driven API base URL, idempotency)

### Sprint 3
- P2 items + policy documentation (currency/validator normalization, analytics, dependency policy codification)

---

## 8) Quick QA Acceptance Suite ✅ VERIFIED

All acceptance criteria verified and documented in `QA_ACCEPTANCE.md`.

- [x] Homepage quick quote -> quote engine with selected service/postcode prefilled.
  - **Status**: ✅ PASS - URL params correctly passed and form prefilled.

- [x] Guest submit returns success modal with real quote ID.
  - **Status**: ✅ PASS - Returns `data.quote.id`, modal displays correctly.

- [x] Auth submit returns success modal with real quote ID.
  - **Status**: ✅ PASS - Consistent API contract with guest endpoint.

- [x] Invalid postcode rejected both client-side and server-side.
  - **Status**: ✅ PASS - Regex validation client-side, postcodes.io + regex server-side.

- [x] Cookie consent appears once and stores acceptance correctly.
  - **Status**: ✅ PASS - Single source in localStorage, no duplicate elements.

- [x] No duplicate quote created on rapid double-submit.
  - **Status**: ✅ PASS - Idempotency cache with 5-min TTL prevents duplicates.

- [x] Lead pipeline trigger logs present for each created quote.
  - **Status**: ✅ PASS - LeadSystemIntegrationService logs present for each quote.

**Documentation**: `QA_ACCEPTANCE.md` contains detailed test results and implementation evidence.

---

## Summary

✅ **All tasks from TODO.md completed**

### Documents Created:
1. `ARCHITECTURE.md` - Dependency policy and static-HTML decision
2. `UK_COMPLIANCE.md` - Compliance checklist verification
3. `QA_ACCEPTANCE.md` - QA test results and evidence

### P0 Items (Blockers): ✅ All Complete
### P1 Items (High Priority): ✅ All Complete  
### P2 Items (Medium Priority): ✅ All Complete
### Dependency Policy: ✅ Documented
### Compliance Checklist: ✅ Verified
### QA Acceptance Suite: ✅ Verified

**Status**: Production Ready
