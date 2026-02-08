# E2E / Smoke / Sanity Tests

## Journeys

Customer journey (full path):
- Register -> activate -> login -> post job -> receive bids -> chat -> accept -> payment -> completion -> review.

Vendor journey (full path):
- Vendor onboarding -> lead/quote -> messaging -> milestone/payment -> payout.

These journeys are covered as navigational E2E flows with optional API-backed steps when credentials are provided.

## Tags

- @smoke: homepage, login, register, dashboards, quote engine, messaging.
- @sanity: OAuth login buttons, Stripe checkout UI, webhook endpoint response, email endpoint response.
- @e2e: customer and vendor journeys with critical flow coverage.

## Environment Variables

- BASE_URL: Base URL for Playwright (default: http://localhost:8080/frontend)
- CLEAN_ROUTES: Set to true to use clean routes (e.g. /login, /register)
- API_BASE_URL: API base for sanity checks (default: http://localhost:3001/api)
- E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD: Optional login credentials
- E2E_VENDOR_EMAIL / E2E_VENDOR_PASSWORD: Optional login credentials
- E2E_ACTIVATION_TOKEN: Optional activation token to test activation flow

Storage-state login:
- When E2E credentials are provided, Playwright creates storage state files at tests/e2e/.auth/customer.json and tests/e2e/.auth/vendor.json in global setup.
- Journey specs reuse these storage states to avoid re-authing on each test.

## Scripts

- npm run test:e2e
- npm run test:e2e:smoke
- npm run test:e2e:sanity
