# Smoke Testing

This repository includes a lightweight smoke test runner for backend authentication and key flows.

## Prerequisites

- Node.js 20
- Backend API running (default: http://localhost:3001)

## Quick Start

Run the default smoke suite (fast):

```
npm run smoke:suite --prefix backend
```

## Environment Variables

Use these to target a specific environment or change which scripts run:

- `API_BASE_URL`: Base URL for the API (default: http://localhost:3001)
- `SMOKE_SUITE`: Comma-separated suite list
- `SMOKE_ONLY`: Run only the named scripts
- `SMOKE_SKIP`: Skip named scripts
- `SMOKE_CONTINUE`: Continue running after failures (`true` or `false`)

Auth-specific vars:

- `SMOKE_USER_EMAIL`: Email for login tests
- `SMOKE_USER_PASSWORD`: Password for login tests
- `SMOKE_CREATE_USER`: Create a new test user each run (`true` or `false`)
- `SMOKE_USER_DOMAIN`: Domain for generated emails (default: example.com)
- `SMOKE_USER_TYPE`: `customer` or `vendor` (default: customer)

## Examples

Run only auth checks:

```
SMOKE_ONLY=auth npm run smoke:suite --prefix backend
```

Run with an existing user:

```
SMOKE_USER_EMAIL="you@example.com" SMOKE_USER_PASSWORD="YourPass123" npm run smoke:suite --prefix backend
```

Create a new user for the run:

```
SMOKE_CREATE_USER=true SMOKE_USER_DOMAIN="yourdomain.com" npm run smoke:suite --prefix backend
```

Run the full set:

```
SMOKE_SUITE=auth,user-quote,contracts,full-production npm run smoke:suite --prefix backend
```

## Notes

- The suite runs scripts in `backend/scripts`.
- Add new smoke scripts and register them in `backend/scripts/smoke-suite.js`.
