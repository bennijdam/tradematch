# TradeMatch

TradeMatch is a UK marketplace connecting homeowners with verified tradespeople. This repo contains a static frontend, a Node/Express backend API, and dashboard SPAs for customers, vendors, and super admins.

## What Lives Here

- Frontend (static HTML): public/ (public pages in public/pages/)
- Backend API (Node/Express): apps/api/
- User dashboard: public/user-dashboard/
- Vendor dashboard: public/vendor-dashboard/
- Super admin dashboard: public/super-admin-dashboard/

## Environments

- Production frontend: https://www.tradematch.uk
- Production API: https://api.tradematch.uk
- Local frontend (root server.js): http://localhost:8000
- Local API: http://localhost:3001

## Quick Start

### Backend (API)

```
cd apps/api
npm ci
npm run dev
```

### Frontend (static)

```
cd public
npm run start
```

### Local Static Server (root)

```
node server.js
```

## Documentation

- Documentation index: DOCUMENTATION-INDEX.md
- API reference: API-REFERENCE.md
- Route registry: ROUTE-REGISTRY.md
- Smoke testing: SMOKE-TESTING.md

## Notes

- OAuth callbacks are handled by the backend and redirect to /login with a token.
- Clean URLs are defined in vercel.json and server.js.
- The not-found page can be tested directly at /404.
