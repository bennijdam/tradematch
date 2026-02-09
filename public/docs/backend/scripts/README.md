# Backend Scripts

## Primary checks

- `smoke-user-quote.js`
  - Registers a customer and creates a quote (API health + basic flow).

- `e2e-customer-vendor-lead.js`
  - Full flow: customer creates quote → vendor accepts lead → credits and acceptance logged.

- `check-post-e2e.js`
  - Verifies acceptance log, distribution state, vendor credits, and finance ledger entries.

- `check-admin-finance.js`
  - Admin/finance API checks. Requires env vars:
    - `ADMIN_EMAIL`
    - `ADMIN_PASSWORD`

## One-off utilities

Archived inspection and schema-repair utilities are stored in `scripts/_archive`.
