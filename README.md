# TradeMatch

TradeMatch is a UK marketplace connecting homeowners with verified tradespeople. This repo contains a static frontend, a Node/Express backend API, and dashboard SPAs for customers, vendors, and super admins.

## What Lives Here

- Frontend (static HTML): frontend/ (public pages in frontend/pages/)
- Backend API (Node/Express): backend/
- User dashboard: frontend/user-dashboard/
- Vendor dashboard: frontend/vendor-dashboard/
- Super admin dashboard: frontend/super-admin-dashboard/

## Environments

- Production frontend: https://www.tradematch.uk
- Production API: https://api.tradematch.uk
- Local frontend (static dev): http://localhost:8080
- Local frontend (root server.js): http://localhost:8000
- Local API: http://localhost:3001

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
