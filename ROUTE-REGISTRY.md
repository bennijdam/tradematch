# Route Registry

This registry lists canonical clean URLs, legacy HTML routes, dashboard entry points, and API surface areas. It aligns with the deployed origins and local dev servers.

Maintenance: update this file whenever vercel.json, server.js, or backend/server.js change route mappings.

## Origins

- Production frontend: https://www.tradematch.uk
- Production API: https://api.tradematch.uk
- Local frontend (static dev): http://localhost:8080
- Local frontend (root server.js): http://localhost:8000
- Local API: http://localhost:3001

## Canonical Clean URLs (Public)

- / -> /index.html
- /login -> /pages/auth-login.html
- /signup -> /pages/auth-register.html
- /select-role -> /pages/auth-select-role.html
- /activate -> /pages/activate.html
- /about -> /pages/about.html
- /contact -> /pages/contact.html
- /help -> /pages/help.html
- /how-it-works -> /pages/how-it-works.html
- /find-tradespeople -> /pages/find-tradespeople.html
- /terms -> /pages/terms.html
- /privacy -> /pages/privacy.html
- /cookies -> /pages/cookies.html
- /blog -> /pages/blog.html
- /post-job -> /pages/quote-engine.html
- /trade-signup -> /pages/vendor-register.html

## Dashboard Entry Points (Clean)

- /user-dashboard -> /user-dashboard/index.html
- /vendor-dashboard -> /vendor-dashboard/index.html
- /super-admin -> /super-admin-dashboard/index.html

## Dashboard Subpages (Clean)

User dashboard

- /user-dashboard/dashboard
- /user-dashboard/my-jobs
- /user-dashboard/job-details
- /user-dashboard/job-quotes
- /user-dashboard/quotes
- /user-dashboard/messages
- /user-dashboard/notifications
- /user-dashboard/profile
- /user-dashboard/settings
- /user-dashboard/reviews
- /user-dashboard/saved-trades
- /user-dashboard/your-quotes
- /user-dashboard/post-job
- /user-dashboard/billing
- /user-dashboard/billing-addons
- /user-dashboard/edit-job-modal

Vendor dashboard

- /vendor-dashboard/vendor-dashboard-enhanced
- /vendor-dashboard/vendor-dashboard-with-modals
- /vendor-dashboard/vendor-new-jobs
- /vendor-dashboard/vendor-active-quotes
- /vendor-dashboard/vendor-archived-jobs
- /vendor-dashboard/vendor-new-leads
- /vendor-dashboard/vendor-messages
- /vendor-dashboard/vendor-profile
- /vendor-dashboard/vendor-settings
- /vendor-dashboard/vendor-coverage
- /vendor-dashboard/vendor-billing
- /vendor-dashboard/vendor-analytics
- /vendor-dashboard/vendor-impressions
- /vendor-dashboard/vendor-heatmaps
- /vendor-dashboard/vendor-badges
- /vendor-dashboard/vendor-timeline

Super admin dashboard

- /super-admin -> /super-admin-dashboard/index.html
- /frontend/super-admin-dashboard/index.html (legacy static mount)

## Legacy HTML (Public)

These remain accessible and should redirect to clean URLs where possible:

- /pages/auth-login.html
- /pages/auth-register.html
- /pages/auth-select-role.html
- /pages/quote-engine.html
- /pages/vendor-register.html

## SEO Rewrites (Hosted Pages)

- /services -> S3 services index
- /services/:service -> S3 service page
- /locations -> S3 locations index
- /locations/:location -> S3 location page
- /sitemaps/:path* -> S3 sitemaps
- /seo/:path* -> S3 SEO pages

## API Surface (Mounted Prefixes)

For the full endpoint map, see API-REFERENCE.md.

Core

- /api/health
- /api/auth
- /api/user
- /api/uploads
- /api/email
- /api/quotes
- /api/bids
- /api/customer
- /api/vendor
- /api/vendor-credits
- /api/leads
- /api/messaging
- /api/reviews
- /api/contracts
- /api/disputes
- /api/payments
- /api/milestones
- /api/credits
- /api/billing
- /api/analytics
- /api/ai
- /api/contact
- /api/webhooks/stripe

OAuth (no /api prefix)

- /auth/google
- /auth/google/callback
- /auth/microsoft
- /auth/microsoft/callback

Admin

- /api/admin
- /api/admin/finance

## Sources

- vercel.json
- frontend/vercel.json
- server.js
- backend/server.js
