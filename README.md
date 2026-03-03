# TradeMatch

TradeMatch is a UK marketplace connecting homeowners with verified tradespeople. This repo contains a static frontend, a Node/Express backend API, and dashboard SPAs for customers, vendors, and super admins.

## What Lives Here

- Frontend (static HTML): public/ (public pages in public/pages/)
- Backend API (Node/Express): apps/api/
- User dashboard: public/user-dashboard/
- Vendor dashboard: public/vendor-dashboard/
- Super admin dashboard: public/super-admin-dashboard/

## Next.js Dashboard Core

TradeMatch now includes a component-based Next.js dashboard core in `apps/web-next` for both customer and vendor experiences.

- Customer route group: `/customer/*` (for example, `/customer/dashboard` and `/customer/jobs/[id]`)
- Vendor route group: `/vendor/*` (for example, `/vendor/dashboard`, `/vendor/active-jobs`, `/vendor/leads`)
- Cross-role bridge: `DashboardBridge` toggles between customer and vendor dashboard views
- Session bridge: `apps/web-next/proxy.ts` handles synthetic-session routing for E2E and legacy URL redirects
- Shared contracts: dashboard state types are centralized in `packages/types`

This architecture is validated by the Playwright suite (`pnpm run test:e2e`) and built with `npm --prefix apps/web-next run build`.

## Environments

- Production frontend: https://www.tradematch.uk
- Production API: https://api.tradematch.uk
- Local frontend (root server.js): http://localhost:8000
- Local API: http://localhost:3001

## Node Version

Use Node 20 for this repository.

```bash
nvm use
```

If Node 20 is not installed yet:

```bash
nvm install 20
nvm use
```

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
- Environment security runbook: SECURITY-ENV.md

## Notes

- OAuth callbacks are handled by the backend and redirect to /login with a token.
- Clean URLs are defined in vercel.json and server.js.
- The not-found page can be tested directly at /404.
- The landing page redirects based on the `user_role` cookie (`vendor`, `user`, `admin`).

## Cloud Dev Environments

### Google Project IDX

- Config file is included at `.idx/dev.nix`.
- In IDX, import this repo and open the workspace.
- The environment installs Node + Python and runs `npm install` on first create.
- Use the built-in preview named `frontend` (runs `npm start` on port 8080).

### GitHub Codespaces

- Config file is included at `.devcontainer/devcontainer.json`.
- In GitHub, open the repo and choose **Code → Codespaces → Create codespace on main**.
- First boot runs dependency install (`npm install` and `apps/api` install if present).
- One-command startup for both services: `npm run dev:codespaces`
- Individual commands (optional):
	- `npm start` for frontend (port 8080)
	- `cd apps/api && npm run dev` for API (port 3001)
