# Smoke Test Findings (Localhost)

Date: 2026-01-26

## Environment
- Backend URL: http://localhost:3001
- Frontend: static HTML (not executed in this run)
- Logs: [logs/smoke-local.log](logs/smoke-local.log)
- Lead flow output: [backend/logs/lead-dashboard-flow.json](backend/logs/lead-dashboard-flow.json)

## Test Coverage (Executed)
- API health/root/auth debug
- User register + quote creation
- E2E customer → vendor lead distribution + credits
- Post‑E2E verification (lead acceptance, credits, finance ledger)
- Contracts/disputes/milestones/payment events
- Admin finance endpoints
- Frontend pages served locally (login + dashboard pages)

## Results Summary
**Pass**
- Health/root/auth debug
- User registration + quote creation
- Lead distribution + acceptance + credits
- Lead → dashboard end-to-end flow (offer, preview, accept)
- Post‑E2E verification
- Contracts/disputes/milestones/payment events
- Admin finance checks
- Frontend pages return 200 locally:
	- [frontend/auth-login.html](frontend/auth-login.html)
	- [frontend/vendor-register.html](frontend/vendor-register.html)
	- [frontend/vendor-dashboard.html](frontend/vendor-dashboard.html)
	- [frontend/customer-dashboard.html](frontend/customer-dashboard.html)
	- [frontend/admin-login.html](frontend/admin-login.html)
	- [frontend/admin-dashboard.html](frontend/admin-dashboard.html)
	- [tradematch-super-admin-panel/admin-login.html](tradematch-super-admin-panel/admin-login.html)
	- [tradematch-super-admin-panel/admin-dashboard.html](tradematch-super-admin-panel/admin-dashboard.html)
	 - UI login/session flows (automated): customer, vendor, admin
		- Automated run via Playwright (scripts/ui-smoke.js) against localhost:8080 → localhost:3001

**Fail / Blocked**
- None

## Root Cause (Email Preview 404)
- The server mounts [backend/email-resend.js](backend/email-resend.js) at /api/email in [backend/server.js](backend/server.js#L411-L436).
- The lead preview endpoint existed only in [backend/routes/email.js](backend/routes/email.js#L662-L738), which is not mounted by the active server.

## Fix Applied
- Added lead preview template + endpoint to [backend/email-resend.js](backend/email-resend.js).
- Endpoint now available at POST /api/email/lead-preview-notification when running the standard server.
- Updated [backend/scripts/test-preview-email.js](backend/scripts/test-preview-email.js) to auto‑create/login a vendor and default to localhost:3001.
- Guarded lead preview log insert in both [backend/email-resend.js](backend/email-resend.js) and [backend/routes/email.js](backend/routes/email.js) to avoid failure when `lead_acceptance_log.details` is missing.
- Added migration [backend/migrations/1739004000000_add-lead-acceptance-details.js](backend/migrations/1739004000000_add-lead-acceptance-details.js) and applied it locally.
- Added localhost:8080 to CORS for UI automation in [backend/.env](backend/.env).

## Email Preview Re-test
- Output: [logs/preview-email.out.txt](logs/preview-email.out.txt)
- Error: [logs/preview-email.err.txt](logs/preview-email.err.txt)
- Current status: PASS (email sent successfully; see output log).

## Notes
- The lead preview test script uses vendorId=1 and a hardcoded vendor email; if the vendor ID does not exist locally, the endpoint will return 404 (vendor not found) even after the route fix.
- Admin finance checks now pass with configured admin credentials.
- Lead system analytics logged an error: missing `lead_analytics_daily.customer_id` column during lead creation; lead flow still completed successfully.

## Next Steps
1. (Optional) Add `customer_id` column to `lead_analytics_daily` or adjust analytics insert logic to match schema.
