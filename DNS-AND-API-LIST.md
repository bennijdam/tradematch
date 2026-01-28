# TradeMatch DNS + API Inventory (January 28, 2026)

## Production base URLs
- Frontend (Vercel): https://www.tradematch.uk
- Backend (Render): https://api.tradematch.uk

## Cloudflare DNS records to create

### Required (frontend on Vercel)
| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | www | cname.vercel-dns.com | DNS only |
| A | @ | 76.76.21.21 | DNS only |

### Optional (custom API subdomain)
Custom API domain is now in use: https://api.tradematch.uk

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | api | tradematch.onrender.com | DNS only |

## API endpoints currently mounted in production

Base URL: https://api.tradematch.uk

### Core (defined in backend/server-production.js)
- GET /
- GET /api/health
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/verify

### OAuth (mounted at /auth)
From backend/routes/google-auth.js
- GET /auth/google
- GET /auth/google/callback
- GET /auth/google/status

From backend/routes/microsoft-auth.js
- GET /auth/microsoft
- GET /auth/microsoft/callback
- GET /auth/microsoft/status

### Email (mounted at /api/email)
From backend/email-resend.js
- POST /api/email/welcome
- POST /api/email/activation
- POST /api/email/new-quote-notification
- POST /api/email/new-bid-notification
- POST /api/email/lead-preview-notification
- POST /api/email/payment-confirmation
- POST /api/email/review-reminder
- POST /api/email/bid-accepted
- POST /api/email/quote-submitted
- POST /api/email/send
- GET /api/email/preferences/:userId
- PUT /api/email/preferences/:userId
- PATCH /api/email/preferences/:userId/toggle

### Connection Layer (mounted at /api/connection)
From backend/routes/connection-layer.js
- POST /api/connection/jobs
- PATCH /api/connection/jobs/:jobId/publish
- GET /api/connection/leads
- POST /api/connection/leads/:leadId/accept
- GET /api/connection/conversations/:conversationId/messages
- POST /api/connection/conversations/:conversationId/messages

### Messaging (mounted at /api/messaging)
From backend/routes/messaging.js
- GET /api/messaging/conversations
- POST /api/messaging/conversations
- GET /api/messaging/conversations/:conversationId
- GET /api/messaging/conversations/:conversationId/messages
- POST /api/messaging/conversations/:conversationId/messages
- PUT /api/messaging/messages/:messageId
- DELETE /api/messaging/messages/:messageId
- POST /api/messaging/messages/:messageId/quote-action
- POST /api/messaging/conversations/:conversationId/typing
- GET /api/messaging/conversations/:conversationId/typing
- GET /api/messaging/notifications
- POST /api/messaging/notifications/read
- GET /api/messaging/admin/conversations
- POST /api/messaging/admin/conversations/:conversationId/lock
- POST /api/messaging/admin/conversations/:conversationId/join
- POST /api/messaging/admin/messages/:messageId/flag
- GET /api/messaging/admin/export
- POST /api/messaging/admin/gdpr/anonymize/:userId
- GET /api/messaging/finance/conversations

### Quotes (mounted at /api/quotes)
From backend/routes/quotes.js
- POST /api/quotes/public
- POST /api/quotes
- GET /api/quotes
- GET /api/quotes/customer/:customerId
- GET /api/quotes/:id
- PUT /api/quotes/:id
- DELETE /api/quotes/:id

### Bids (mounted at /api/bids)
From backend/routes/bids.js
- POST /api/bids
- GET /api/bids/my-bids

### Customer (mounted at /api/customer)
From backend/routes/customer.js
- GET /api/customer/dashboard
- GET /api/customer/quotes
- GET /api/customer/quotes/:quoteId
- GET /api/customer/payments
- GET /api/customer/reviews
- PUT /api/customer/profile
- POST /api/customer/accept-bid

### Payments (mounted at /api/payments)
From backend/routes/payments.js
- POST /api/payments/create-intent
- POST /api/payments/confirm
- POST /api/payments/release-escrow
- GET /api/payments/history
- POST /api/payments/milestones
- GET /api/payments/milestones/:quoteId
- PUT /api/payments/milestones/:milestoneId

### Milestones (mounted at /api/milestones)
From backend/routes/milestones.js
- GET /api/milestones/quote/:quoteId
- POST /api/milestones/create
- POST /api/milestones/update-status

### Admin (mounted at /api/admin)
From backend/routes/admin.js
- GET /api/admin/stats
- GET /api/admin/activity
- GET /api/admin/charts
- GET /api/admin/users
- GET /api/admin/users/:userId
- PATCH /api/admin/users/:userId/status
- GET /api/admin/vendors/pending
- POST /api/admin/vendors/:vendorId/approve
- POST /api/admin/vendors/:vendorId/reject
- GET /api/admin/reviews/pending
- PATCH /api/admin/reviews/:reviewId/moderate
- GET /api/admin/bids
- GET /api/admin/audit
- GET /api/admin/admins
- POST /api/admin/admins
- DELETE /api/admin/admins/:adminId
- POST /api/admin/change-password
