# API Endpoint Checklist

This checklist is derived from backend/routes/*.js and the mounts in backend/server.js and backend/server-production.js. Use it to verify auth, validation, error handling, and rate limiting coverage per endpoint.

Legend:
- Auth: JWT or role guards present
- Validation: request validation and required fields enforced
- Errors: consistent errors and status codes
- Rate limit: limiter applied (authLimiter, quoteLimiter, paymentLimiter, emailLimiter, uploadLimiter, or general API limiter)

## Auth and OAuth (backend/routes/auth.js, google-auth.js, microsoft-auth.js, oauth-simple.js)

- POST /api/auth/register [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: authLimiter]
- POST /api/auth/login [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: authLimiter]
- GET /api/auth/me [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/auth/verify [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /auth/google [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/google/callback [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/google/status [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/microsoft [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/microsoft/callback [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/microsoft/status [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/google (oauth-simple) [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- GET /auth/microsoft (oauth-simple) [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- POST /auth/google/callback (oauth-simple) [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- POST /auth/microsoft/callback (oauth-simple) [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]

## Health

- GET /api/health [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Connection Layer (backend/routes/connection-layer.js)

- POST /api/connection/jobs [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/connection/jobs/:jobId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/connection/jobs/:jobId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/connection/leads/accept [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/connection/leads/preview/:leadId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/connection/messages [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Quotes (backend/routes/quotes.js)

- POST /api/quotes/public [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: quoteLimiter]
- POST /api/quotes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/quotes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/quotes/customer/:customerId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/quotes/:id [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/quotes/:id [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- DELETE /api/quotes/:id [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Bids (backend/routes/bids.js)

- POST /api/bids [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/bids/my-bids [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Customer (backend/routes/customer.js)

- GET /api/customer/dashboard [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/quotes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/quotes/:quoteId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/bids/archived [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/customer/bids/:bidId/archive [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/customer/bids/:bidId/restore [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/payments [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/reviews [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/customer/saved-trades [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/customer/saved-trades [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- DELETE /api/customer/saved-trades/:id [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/customer/profile [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/customer/accept-bid [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Vendor (backend/routes/vendor.js)

- PATCH /api/vendor/onboarding [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/vendor/stripe/onboarding [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/stripe/status [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/dashboard [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/available-quotes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/my-bids [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/earnings [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/reviews [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/vendor/profile [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/vendor/respond-to-review [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/vendor/update-availability [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/overview [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/leads/accepted [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/vendor/jobs/:quoteId/status [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/vendor/jobs/:quoteId/notes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/vendor/auto-accept-rules [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/vendor/auto-accept-rules [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Leads (backend/routes/leads.js)

- GET /api/leads/offered [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/leads/:quoteId/accept [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/leads/:quoteId/decline [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/leads/:quoteId/preview [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/leads/available [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/leads/:quoteId/access [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/leads/purchased [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/leads/analytics [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Messaging (backend/routes/messaging.js)

- GET /api/messaging/conversations [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/:conversationId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/:conversationId/messages [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/messages [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/preferences [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/:conversationId/job-details [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/:conversationId/accepted-quote [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/files [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/mute [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/archive [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/restore [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/report [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/messaging/messages/:messageId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- DELETE /api/messaging/messages/:messageId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/messages/:messageId/quote-action [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/conversations/:conversationId/typing [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/conversations/:conversationId/typing [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/notifications [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/notifications/unread-count [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/notifications/read [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/notifications/:notificationId/read [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/admin/conversations [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/admin/conversations/:conversationId/lock [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/admin/conversations/:conversationId/join [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/admin/messages/:messageId/flag [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/admin/export [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/messaging/admin/gdpr/anonymize/:userId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/messaging/finance/conversations [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Reviews (backend/routes/reviews.js)

- POST /api/reviews [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/reviews/vendor/:vendorId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/reviews/:reviewId/response [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/reviews/:reviewId/helpful [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Contracts and Disputes (backend/routes/contracts.js, disputes.js)

- GET /api/contracts/admin/contracts [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/contracts/admin/disputes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/payment-events [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/contracts/payment-events [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/contracts/conversation/:conversationId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/contracts/:contractId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/:contractId/accept [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/:contractId/cancel [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/:contractId/disputes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/disputes/:disputeId/evidence [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/disputes/:disputeId/notes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/disputes/:disputeId/resolve [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/contracts/:contractId/milestones [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/:contractId/milestones [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/contracts/milestones/:milestoneId/status [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/milestones/:milestoneId/dispute [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/contracts/automation/run [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/disputes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/disputes/:disputeId/resolve [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Payments and Milestones (backend/routes/payments.js, milestones.js, milestones-status.js)

- POST /api/payments/create-intent [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/payments/confirm [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/payments/release-escrow [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/payments/history [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/payments/milestones [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/payments/milestones/:quoteId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/payments/milestones/:milestoneId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/milestones/quote/:quoteId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/milestones/create [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/milestones/update-status [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/milestones/:milestoneId/status [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Credits and Billing (backend/routes/credits.js, vendor-credits.js, billing.js)

- GET /api/credits/balance [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/credits/packages [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/credits/purchase [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/credits/purchase/confirm [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/credits/transaction-history [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/credits/analytics [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/credits/checkout [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/vendor-credits/balance/:vendorId [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/vendor-credits/packages [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/vendor-credits/purchase [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/vendor-credits/transactions/:vendorId [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- GET /api/vendor-credits/roi-estimate [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/vendor-credits/refund [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]
- POST /api/billing/checkout [Auth: ] [Validation: ] [Errors: ] [Rate limit: paymentLimiter]

## Admin (backend/routes/admin.js, admin-finance.js)

- GET /api/admin/stats [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/activity [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/charts [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/users [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/users/:userId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/users/:userId/jobs [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/users/:userId/messages [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/admin/users/:userId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/vendors [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/vendors/:vendorId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/admin/vendors/:vendorId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/vendors/:vendorId/approve [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/vendors/pending [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/vendors/:vendorId/reject [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/vendors/:vendorId/suspend [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/reviews/pending [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/admin/reviews/:reviewId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/bids [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/jobs [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/leads [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/lead-pricing/tiers [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/admin/lead-pricing/tiers [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/lead-pricing/rules [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PATCH /api/admin/lead-pricing/rules [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/platform/settings [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- PUT /api/admin/platform/settings [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/audit [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/admins [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/admins [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- DELETE /api/admin/admins/:adminId [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/admins/:adminId/reset-password [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reason-codes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/finance/reason-codes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/finance/adjustments [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/finance/notes [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/ledger [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/report [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/transactions [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/transactions/export [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/payments [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/payments/export [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/stripe [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/stripe/payments [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/stripe/subscriptions [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/stripe/refunds [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/admin/finance/reconciliation/export [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/admin/finance/reconciliation/rebuild [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Analytics and AI (backend/routes/analytics.js, ai.js, ai-backend.js)

- GET /api/analytics/dashboard [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/analytics/track [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/analytics/report [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/ai/generate-description [Auth: ] [Validation: ] [Errors: ] [Rate limit: ]
- GET /api/ai/health [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
- POST /api/ai-backend/generate-description [Auth: ] [Validation: ] [Errors: ] [Rate limit: ]
- GET /api/ai-backend/health [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]

## Email and Contact (backend/routes/email.js, email-routes.js, contact.js, email-resend.js)

- POST /api/email/send [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/welcome [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/quote-notification [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/bid-notification [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/payment-confirmation [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/new-quote-notification [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/new-bid-notification [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/review-reminder [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/email/lead-preview-notification [Auth: ] [Validation: ] [Errors: ] [Rate limit: emailLimiter]
- POST /api/contact [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Uploads (backend/routes/uploads.js)

- POST /api/uploads/presign [Auth: ] [Validation: ] [Errors: ] [Rate limit: uploadLimiter]
- GET /api/uploads/signed-url [Auth: ] [Validation: ] [Errors: ] [Rate limit: uploadLimiter]

## User (backend/routes/user.js)

- PUT /api/user/update-role [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Saved Trades (backend/routes/saved-trades.js)

- GET /api/saved-trades [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/saved-trades [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- DELETE /api/saved-trades/:id [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Proposals (backend/routes/proposals.js)

- POST /api/proposals [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- GET /api/proposals/:proposalId/pdf [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/proposals/:proposalId/send [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]
- POST /api/proposals/:proposalId/accept [Auth: ] [Validation: ] [Errors: ] [Rate limit: apiLimiter]

## Webhooks (backend/routes/webhooks.js)

- POST /api/webhooks/stripe [Auth: N/A] [Validation: ] [Errors: ] [Rate limit: ]
