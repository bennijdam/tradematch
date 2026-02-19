# TradeMatch — AI Agent Onboarding (Claude Code / Antigravity)

This repo is a **static HTML frontend** plus a **Node/Express API**. Please do not invent folders or frameworks—verify paths in the tree before editing.

## Tech Stack

- **Frontend:** Static HTML/CSS/JS under `apps/web/` (no React/Next build pipeline)
- **Backend API:** Node.js (Node 20) + Express under `apps/api/`
- **Database:** Postgres (`pg`), connection via `DATABASE_URL`
- **Auth:** JWT + Passport (Google/Microsoft strategies are present in backend deps)
- **Payments & Email:** Stripe, Resend/Nodemailer (backend deps)
- **Storage/Uploads:** AWS S3 presigned uploads (backend deps)
- **Observability:** Sentry (`@sentry/node`)
- **Testing:** Playwright E2E (`tests/e2e/`, `playwright.config.js`), plus backend Jest
- **Deployment/Hosting configs:** Vercel rewrites (`vercel.json`), Render configs (`render.yaml`, `Procfile`)

## Build Commands

### Install

- Root tooling (Playwright + scripts): `npm ci`
- Backend API: `npm --prefix apps/api ci`
- Frontend (optional): `npm --prefix apps/web ci`

### Run (local)

- Frontend static server (recommended): `npm --prefix apps/web run dev`  
  - serves on `http://localhost:8080`
- Backend API (recommended): `npm --prefix apps/api run dev`  
  - default dev port is defined in `apps/api/server.js`
- Codespaces helper (runs both): `npm run dev:codespaces`

### Build

- Frontend: no build step (static files)
- Root “build” (mostly asset optimization): `npm run build`

### Tests

- E2E (Playwright): `npm run test:e2e` (or `npm run test:e2e:smoke`)
- Backend unit tests: `npm --prefix apps/api test`
- Smoke/security scripts: `npm run test:smoke`, `npm run test:security`

## Architecture Rules

- **Frontend source of truth:** `apps/web/` is what Vercel serves (see `vercel.json` rewrites). Do not assume a framework build or a `src/` directory.
- **Local static servers:** Prefer `apps/web` + `python -m http.server` for local frontend work. The root `server.js` is a standalone local server with clean-URL routing and currently serves from a `public/` directory (which is not present in this repo tree).
- **Backend source of truth:** `apps/api/` contains the API server, routes, middleware, services, migrations, and scripts. Keep API changes inside this folder unless a doc/config must be updated.
- **Routes and docs:** When adding/changing endpoints, update the route docs/registry as appropriate:
  - `API-REFERENCE.md`
  - `ROUTE-REGISTRY.md` / `ROUTE-REGISTRY.json`
  - Checklists in `API-ENDPOINT-CHECKLIST.md` / `AUTH-QA-CHECKLIST.md`
- **Environment variables:** Prefer `.env.example` + `SECURITY-ENV.md` as the canonical guidance. Don’t commit secrets.
- **Static file paths:** Vercel routes non-API requests into `apps/web/…`; if you change URL structure, also review `vercel.json` and any clean-URL routing logic.
- **Keep changes scoped:** Don’t introduce new frameworks, bundlers, or directory conventions unless explicitly requested.
