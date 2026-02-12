# TradeMatch UK — Customer Dashboard Specification

This document captures the component layout, state management approach, example API endpoints, required data models, and key UX/business rules for the Homeowner (Customer) Dashboard.

## Goals
- Ease of use
- Trust and safety
- Fast hiring
- Clear communication

---

## Component Layout & Structure

- Overview (Home)
  - Stats: Active postings, interested tradespeople per job, new messages/quotes, status indicators, recent completions
  - Shortcuts: Post a job, View messages, Compare quotes
- Jobs (Create & Manage)
  - Create Job form: title, description, trade category, budget range (required), timeframe (required), postcode
  - Job list with statuses: draft, live, in_progress, completed, cancelled
  - Edit/Cancel rules: Editable/cancellable until a lead is accepted; drafts never distributed
- Matches & Responses
  - Per job: list of responding vendors with business name, logo, trade, rating (#reviews), distance, availability, response time
  - Actions: View profile, message, request quote, compare responses
- Messaging
  - In-platform messaging with timestamps, optional read receipts, file attachments (photos/docs)
  - Privacy: Messages unlock after vendor accepts lead or is selected
- Quotes & Hiring
  - Compare quotes UI (side-by-side)
  - Ask follow-ups, accept or decline quotes (with optional feedback)
  - Status transitions: accept → in_progress; completion → awaiting review
- Reviews
  - Post-completion review prompt: star rating, written feedback, recommend yes/no
  - Moderation required; vendor public response supported
- Trust & Safety
  - Show verification badges, insurance status, guarantees, explain matching
  - Actions: Report issue, block vendor, contact support
- Notifications & Preferences
  - Email/push toggles, message/job update alerts, quiet hours (future)
- Data & Privacy Controls
  - Contact visibility, job history export, data deletion request, close account

---

## State Management Approach

- Auth: JWT in `localStorage.token`; user object in `localStorage.user`
- Data: Quotes cached in-memory with embedded bids; lazy-load messages on demand
- Loading/Error: Section-scoped loaders and error banners; retry affordances
- Navigation: Simple tabbed sections; deep links via query params (optional)
- Security: Bearer token on all fetch calls; role checks server-side

---

## Example API Endpoints

- Overview
  - GET `/api/quotes/customer/:customerId` → list quotes with summary
  - GET `/api/bids/quote/:quoteId` → list bids for a quote
- Jobs
  - POST `/api/quotes/public` → create job (draft until confirmed)
  - PUT `/api/quotes/:quoteId` → update job (allowed if no accepted lead)
  - DELETE `/api/quotes/:quoteId` → cancel job (allowed if no accepted lead)
- Matches & Responses
  - GET `/api/bids/quote/:quoteId` → vendor bids with vendor profile summary
  - GET `/api/user/vendor/:vendorId` → vendor profile details (ratings, badges)
- Messaging
  - POST `/api/messages` → send message (unlocked post-acceptance)
  - GET `/api/messages/conversation/:otherId` → messages with vendor
  - GET `/api/messages/conversations` → conversation list
- Quotes & Hiring
  - PATCH `/api/bids/:bidId/accept` → accept quote (moves job to `in_progress`)
  - PATCH `/api/bids/:bidId/reject` → decline with optional feedback
- Reviews
  - POST `/api/reviews` → create review post-completion
  - GET `/api/reviews/customer` → list customer reviews
- Trust & Safety
  - POST `/api/support/report` → report issue
  - POST `/api/vendor/:vendorId/block` → block vendor
- Notifications
  - GET `/api/customer/notifications` | PUT `/api/customer/notifications` → prefs
- Data & Privacy
  - GET `/api/customer/export` → export history
  - POST `/api/customer/delete-request` → data deletion
  - DELETE `/api/customer` → close account

Note: Many of these endpoints already exist in partial form (quotes, bids, messages, reviews). New stubs can proxy to existing handlers or be implemented incrementally.

---

## Required Data Models (Simplified)

- Quote
```
{id, customer_id, service_type, title, description, postcode, budget_min, budget_max, timeframe, status, created_at, updated_at}
```
- Bid
```
{id, quote_id, vendor_id, price, message, estimated_duration, availability, status, created_at}
```
- Vendor (Profile Summary)
```
{id, company_name, logo_url, trade_category, rating, reviews_count, verified, insured, distance_miles, response_time_hours}
```
- Message
```
{id, quote_id, from_user_id, to_user_id, body, attachments[], created_at, read_at}
```
- Review
```
{id, quote_id, vendor_id, customer_id, rating, feedback, recommend, moderated, created_at}
```
- NotificationPrefs
```
{customer_id, email_enabled, push_enabled, message_alerts, job_updates, quiet_hours_start, quiet_hours_end}
```

---

## Key UX & Business Rules

- Budget and timeframe are mandatory to post a job.
- Incomplete/draft jobs are never distributed to vendors until customer confirms live.
- Customer cannot see vendor lead prices; only vendor bids and profiles.
- Vendors cannot see other vendors’ conversations with the customer.
- Messages unlock only after a vendor accepts a lead or is selected; contact details remain hidden until then.
- Accepting a quote transitions job status to `in_progress`; completing a job transitions to `awaiting_review`.
- Reviews are only allowed for completed jobs and are subject to moderation; vendors can post public responses.
- Display verification badges, insurance, and platform guarantees in vendor cards.
- Allow reporting issues and blocking vendors from future contact.
- Provide notification settings and privacy/data controls (export, delete, close account).

---

## Open Tasks / QA Checklist

- Verify server mounts `/api/quotes`, `/api/bids`, `/api/customer`
- Create job → ensure budget/timeframe required; remains draft until confirmed
- Load overview stats → counts match DB
- View matches → vendor details shown; lead price hidden
- Messaging → locked before acceptance; unlocked after
- Accept quote → status becomes `in_progress`; other bids rejected
- Complete job → prompt for review; submit review and verify moderation flag
- Trust & Safety → badges visible; report/block available
- Notifications → update prefs persisted
- Privacy → export and deletion requests stubbed/logged

---

## Notes
- Frontend implemented in `frontend/customer-dashboard.html` with inline docs and comments for UX rules.
- Server production now mounts necessary routers; local server start may rely on `server.js` (dev) vs `server-production.js` (prod).
- Stripe integration already present for payments intents and confirm; webhook testing available via Stripe CLI.
