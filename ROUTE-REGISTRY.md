# Route Registry

This registry lists canonical clean URLs, legacy HTML routes, and dashboard entry points.

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

## SEO Rewrites (Hosted Pages)

- /services -> S3 services index
- /services/:service -> S3 service page
- /locations -> S3 locations index
- /locations/:location -> S3 location page
- /sitemaps/:path* -> S3 sitemaps
- /seo/:path* -> S3 SEO pages

## Dashboard Entry Points

- Vendor dashboard: /frontend/vendor-dashboard/index.html
- User dashboard: /frontend/user-dashboard/index.html
- Super admin dashboard: /frontend/super-admin-dashboard/index.html

## Legacy HTML (Public)

These are still present and should redirect to clean URLs where possible:

- /pages/auth-login.html
- /pages/auth-register.html
- /pages/auth-select-role.html
- /pages/quote-engine.html
- /pages/vendor-register.html

## Sources

- vercel.json
- server.js
