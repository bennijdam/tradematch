# API Reference

This file provides a canonical endpoint map. For implementation details, see backend/routes and backend/server-production.js.

## Base URLs

- Production API: https://api.tradematch.uk
- Local API: http://localhost:3001

All API routes are prefixed with /api unless otherwise noted.

## Source of Truth (Mount Points)

Primary mounts live in backend/server.js (local/dev) and backend/server-production.js (production). Router implementations are in backend/routes/.

- /api/auth -> backend/routes/auth.js
- /api/user -> backend/routes/user.js
- /api/uploads -> backend/routes/uploads.js
- /api/email -> backend/email-resend.js
- /api/quotes -> backend/routes/quotes.js
- /api/bids -> backend/routes/bids.js
- /api/customer -> backend/routes/customer.js
- /api/saved-trades -> backend/routes/saved-trades.js
- /api/vendor -> backend/routes/vendor.js
- /api/vendor-credits -> backend/routes/vendor-credits.js
- /api/leads -> backend/routes/leads.js
- /api/messaging -> backend/routes/messaging.js
- /api/reviews -> backend/routes/reviews.js
- /api/contracts -> backend/routes/contracts.js
- /api/disputes -> backend/routes/disputes.js
- /api/credits -> backend/routes/credits.js
- /api/billing -> backend/routes/billing.js
- /api/webhooks -> backend/routes/webhooks.js
- /api/admin -> backend/routes/admin.js
- /api/admin/finance -> backend/routes/admin-finance.js
- /api/milestones (status) -> backend/routes/milestones-status.js (server.js)
- /api/milestones -> backend/routes/milestones.js (server-production.js)
- /api/payments -> backend/routes/payments.js (server-production.js)
- /api/connection -> backend/routes/connection-layer.js (server-production.js)

OAuth (no /api prefix)

- /auth/google -> backend/routes/google-auth.js
- /auth/microsoft -> backend/routes/microsoft-auth.js

Additional routers exist (analytics, ai, contact, oauth-simple). Confirm mounts in backend/server-production.js before relying on them.

## Maintenance Policy

- Update this file when adding, removing, or remounting routers in backend/server.js or backend/server-production.js.
- Treat backend/routes/ as the implementation source; keep endpoint lists consistent with those routers.

## Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/verify

OAuth (no /api prefix)

- GET /auth/google
- GET /auth/google/callback
- GET /auth/google/status
- GET /auth/microsoft
- GET /auth/microsoft/callback
- GET /auth/microsoft/status

Legacy OAuth (if enabled)

- GET /auth/google (oauth-simple)
- GET /auth/microsoft (oauth-simple)
- POST /auth/google/callback (oauth-simple)
- POST /auth/microsoft/callback (oauth-simple)

## Health

- GET /api/health

## Connection Layer

Mounted at /api/connection

- POST /api/connection/jobs
- PATCH /api/connection/jobs/:jobId
- GET /api/connection/jobs/:jobId
- POST /api/connection/leads/accept
- GET /api/connection/leads/preview/:leadId
- POST /api/connection/messages

## Quotes

Mounted at /api/quotes

- POST /api/quotes/public
- POST /api/quotes
- GET /api/quotes
- GET /api/quotes/customer/:customerId
- GET /api/quotes/:id
- PUT /api/quotes/:id
- DELETE /api/quotes/:id

## Bids

Mounted at /api/bids

- POST /api/bids
- GET /api/bids/my-bids

## Customer

Mounted at /api/customer

- GET /api/customer/dashboard
- GET /api/customer/quotes
- GET /api/customer/quotes/:quoteId
- GET /api/customer/bids/archived
- POST /api/customer/bids/:bidId/archive
- POST /api/customer/bids/:bidId/restore
- GET /api/customer/payments
- GET /api/customer/reviews
- GET /api/customer/saved-trades
- POST /api/customer/saved-trades
- DELETE /api/customer/saved-trades/:id
- PUT /api/customer/profile
- POST /api/customer/accept-bid

## Vendor

Mounted at /api/vendor

- PATCH /api/vendor/onboarding
- GET /api/vendor/dashboard
- GET /api/vendor/available-quotes
- GET /api/vendor/my-bids
- GET /api/vendor/earnings
- GET /api/vendor/reviews
- PUT /api/vendor/profile
- POST /api/vendor/respond-to-review
- POST /api/vendor/update-availability
- GET /api/vendor/overview
- GET /api/vendor/leads/accepted
- PATCH /api/vendor/jobs/:quoteId/status
- POST /api/vendor/jobs/:quoteId/notes
- GET /api/vendor/auto-accept-rules
- POST /api/vendor/auto-accept-rules

## Leads

Mounted at /api/leads

- GET /api/leads/offered
- POST /api/leads/:quoteId/accept
- POST /api/leads/:quoteId/decline
- GET /api/leads/:quoteId/preview
- GET /api/leads/available
- POST /api/leads/:quoteId/access
- GET /api/leads/purchased
- GET /api/leads/analytics

## Messaging

Mounted at /api/messaging

- GET /api/messaging/conversations
- POST /api/messaging/conversations
- GET /api/messaging/conversations/:conversationId
- GET /api/messaging/conversations/:conversationId/messages
- POST /api/messaging/conversations/:conversationId/messages
- GET /api/messaging/conversations/preferences
- GET /api/messaging/conversations/:conversationId/job-details
- GET /api/messaging/conversations/:conversationId/accepted-quote
- POST /api/messaging/conversations/:conversationId/files
- POST /api/messaging/conversations/:conversationId/mute
- POST /api/messaging/conversations/:conversationId/archive
- POST /api/messaging/conversations/:conversationId/restore
- POST /api/messaging/conversations/:conversationId/report
- PUT /api/messaging/messages/:messageId
- DELETE /api/messaging/messages/:messageId
- POST /api/messaging/messages/:messageId/quote-action
- POST /api/messaging/conversations/:conversationId/typing
- GET /api/messaging/conversations/:conversationId/typing
- GET /api/messaging/notifications
- GET /api/messaging/notifications/unread-count
- POST /api/messaging/notifications/read
- POST /api/messaging/notifications/:notificationId/read

Admin messaging

- GET /api/messaging/admin/conversations
- POST /api/messaging/admin/conversations/:conversationId/lock
- POST /api/messaging/admin/conversations/:conversationId/join
- POST /api/messaging/admin/messages/:messageId/flag
- GET /api/messaging/admin/export
- POST /api/messaging/admin/gdpr/anonymize/:userId

Finance messaging

- GET /api/messaging/finance/conversations

## Reviews

Mounted at /api/reviews

- POST /api/reviews
- GET /api/reviews/vendor/:vendorId
- POST /api/reviews/:reviewId/response
- POST /api/reviews/:reviewId/helpful

## Contracts and Disputes

Mounted at /api/contracts

- GET /api/contracts/admin/contracts
- GET /api/contracts/admin/disputes
- POST /api/contracts/payment-events
- GET /api/contracts/payment-events
- POST /api/contracts
- GET /api/contracts/conversation/:conversationId
- GET /api/contracts/:contractId
- POST /api/contracts/:contractId/accept
- POST /api/contracts/:contractId/cancel
- POST /api/contracts/:contractId/disputes
- POST /api/contracts/disputes/:disputeId/evidence
- POST /api/contracts/disputes/:disputeId/notes
- POST /api/contracts/disputes/:disputeId/resolve
- GET /api/contracts/:contractId/milestones
- POST /api/contracts/:contractId/milestones
- PATCH /api/contracts/milestones/:milestoneId/status
- POST /api/contracts/milestones/:milestoneId/dispute
- POST /api/contracts/automation/run

Mounted at /api/disputes

- POST /api/disputes
- POST /api/disputes/:disputeId/resolve

## Payments and Milestones

Mounted at /api/payments

- POST /api/payments/create-intent
- POST /api/payments/confirm
- POST /api/payments/release-escrow
- GET /api/payments/history
- POST /api/payments/milestones
- GET /api/payments/milestones/:quoteId
- PUT /api/payments/milestones/:milestoneId

Mounted at /api/milestones

- GET /api/milestones/quote/:quoteId
- POST /api/milestones/create
- POST /api/milestones/update-status

Mounted at /api/milestones (status)

- PUT /api/milestones/:milestoneId/status

## Credits and Billing

Mounted at /api/credits

- GET /api/credits/balance
- GET /api/credits/packages
- POST /api/credits/purchase
- POST /api/credits/purchase/confirm
- GET /api/credits/transaction-history
- GET /api/credits/analytics
- POST /api/credits/checkout

Mounted at /api/vendor-credits

- GET /api/vendor-credits/balance/:vendorId
- GET /api/vendor-credits/packages
- POST /api/vendor-credits/purchase
- GET /api/vendor-credits/transactions/:vendorId
- GET /api/vendor-credits/roi-estimate
- POST /api/vendor-credits/refund

Mounted at /api/billing

- POST /api/billing/checkout

## Admin

Mounted at /api/admin

- GET /api/admin/stats
- GET /api/admin/activity
- GET /api/admin/charts
- GET /api/admin/users
- GET /api/admin/users/:userId
- GET /api/admin/users/:userId/jobs
- GET /api/admin/users/:userId/messages
- PATCH /api/admin/users/:userId
- GET /api/admin/vendors
- GET /api/admin/vendors/:vendorId
- PATCH /api/admin/vendors/:vendorId
- POST /api/admin/vendors/:vendorId/approve
- GET /api/admin/vendors/pending
- POST /api/admin/vendors/:vendorId/reject
- POST /api/admin/vendors/:vendorId/suspend
- GET /api/admin/reviews/pending
- PATCH /api/admin/reviews/:reviewId
- GET /api/admin/bids
- GET /api/admin/jobs
- GET /api/admin/leads
- GET /api/admin/lead-pricing/tiers
- PATCH /api/admin/lead-pricing/tiers
- GET /api/admin/lead-pricing/rules
- PATCH /api/admin/lead-pricing/rules
- GET /api/admin/platform/settings
- PUT /api/admin/platform/settings
- GET /api/admin/audit
- GET /api/admin/admins
- POST /api/admin/admins
- DELETE /api/admin/admins/:adminId
- POST /api/admin/admins/:adminId/reset-password

Mounted at /api/admin/finance

- GET /api/admin/finance/reason-codes
- POST /api/admin/finance/reason-codes
- POST /api/admin/finance/adjustments
- POST /api/admin/finance/notes
- GET /api/admin/finance/ledger
- GET /api/admin/finance/reconciliation
- GET /api/admin/finance/reconciliation/report
- GET /api/admin/finance/reconciliation/transactions
- GET /api/admin/finance/reconciliation/transactions/export
- GET /api/admin/finance/reconciliation/payments
- GET /api/admin/finance/reconciliation/payments/export
- GET /api/admin/finance/reconciliation/stripe
- GET /api/admin/finance/stripe/payments
- GET /api/admin/finance/stripe/subscriptions
- GET /api/admin/finance/stripe/refunds
- GET /api/admin/finance/reconciliation/export
- POST /api/admin/finance/reconciliation/rebuild

## Analytics and AI

Mounted at /api/analytics

- GET /api/analytics/dashboard
- POST /api/analytics/track
- GET /api/analytics/report

Mounted at /api/ai

- POST /api/ai/generate-description
- GET /api/ai/health

Legacy AI

- POST /api/ai-backend/generate-description
- GET /api/ai-backend/health

## Email

Mounted at /api/email

- POST /api/email/send
- POST /api/email/welcome
- POST /api/email/quote-notification
- POST /api/email/bid-notification
- POST /api/email/payment-confirmation

Additional email templates (if email.js is mounted)

- POST /api/email/welcome
- POST /api/email/new-quote-notification
- POST /api/email/new-bid-notification
- POST /api/email/payment-confirmation
- POST /api/email/review-reminder
- POST /api/email/lead-preview-notification
- POST /api/email/send

## Uploads

Mounted at /api/uploads

- POST /api/uploads/presign
- GET /api/uploads/signed-url

## User

Mounted at /api/user

- PUT /api/user/update-role

## Saved Trades (Legacy)

Mounted at /api/saved-trades

- GET /api/saved-trades
- POST /api/saved-trades
- DELETE /api/saved-trades/:id

## Contact

Mounted at /api/contact

- POST /api/contact

## Webhooks

Mounted at /api/webhooks

- POST /api/webhooks/stripe

## Notes

- Most routes require a Bearer token in the Authorization header.
- Rate limiting is enabled for auth endpoints.
- Some legacy routers may be disabled in production; confirm mount points in backend/server-production.js.
