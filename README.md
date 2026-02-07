# TradeMatch

TradeMatch is a UK marketplace connecting homeowners with verified tradespeople. This repo contains a static frontend, a Node/Express backend API, and dashboard SPAs for customers, vendors, and super admins.

## Quick Start

### Backend (API)

```
cd backend
npm ci
npm run dev
```

### Frontend (static)

```
cd frontend
npm run start
```

## Key Services

- Frontend: static HTML under frontend/ (public pages in frontend/pages/)
- Backend API: backend/server-production.js (production) and backend/server.js (local/dev)
- Vendor dashboard: frontend/vendor-dashboard/
- User dashboard: frontend/user-dashboard/
- Super admin dashboard: frontend/super-admin-dashboard/

## Docs

- API reference: API-REFERENCE.md
- Route registry: ROUTE-REGISTRY.md
- Smoke testing: SMOKE-TESTING.md

## Environments

- Production frontend: https://www.tradematch.uk
- Production API: https://api.tradematch.uk
- Local frontend: http://localhost:8080 (frontend) or http://localhost:8000 (root server.js)
- Local API: http://localhost:3001

## Notes

- OAuth callbacks are handled by the backend and redirect to /login with a token.
- Clean URLs are defined in vercel.json and server.js.
