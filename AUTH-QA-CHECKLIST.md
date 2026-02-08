# Auth + OAuth QA Checklist

Use this checklist to validate clean-route login, OAuth callbacks, role selection, and dashboard redirects.

## Environment Setup

- Frontend base URL matches one of: https://www.tradematch.uk, https://tradematch.uk.
- API base URL matches https://api.tradematch.uk.
- OAuth callback URLs configured for Google and Microsoft in the provider consoles.

## Clean Route Coverage

- /login loads the login page without 404.
- /signup loads the register page without 404.
- /select-role loads the role selection page without 404.
- /user-dashboard and /vendor-dashboard load the correct dashboards.

## Local Login Flow

- Enter valid customer credentials on /login.
- Expect redirect to /user-dashboard.
- Enter valid vendor credentials on /login.
- Expect redirect to /vendor-dashboard.
- Verify /login?redirect=/post-job sends to /post-job after login.
- Verify invalid credentials show a clear error and do not redirect.

## OAuth Flow (Google)

- From /login, click Google.
- Confirm popup opens and returns to /login?token=...&source=google.
- Expect token stored in localStorage and redirect based on role:
  - customer -> /user-dashboard
  - vendor/tradesperson -> /vendor-dashboard
  - no role -> /select-role?token=...&source=google
- If role is selected in /select-role, expect redirect to correct dashboard.

## OAuth Flow (Microsoft)

- From /login, click Microsoft.
- Confirm popup opens and returns to /login?token=...&source=microsoft.
- Expect token stored in localStorage and redirect based on role:
  - customer -> /user-dashboard
  - vendor/tradesperson -> /vendor-dashboard
  - no role -> /select-role?token=...&source=microsoft
- If role is selected in /select-role, expect redirect to correct dashboard.

## Role Selection

- From /select-role, choose Customer.
- Expect /api/user/update-role called and success toast.
- Expect redirect to /user-dashboard.
- From /select-role, choose Tradesperson.
- Expect redirect to /vendor-dashboard.
- Verify role persists in localStorage user object.

## Return-To Handling

- /login?redirect=/user-dashboard routes correctly.
- /login?redirect=https://www.tradematch.uk/user-dashboard routes correctly.
- /login?redirect=https://evil.example.com is ignored and falls back to role-based dashboard.
- OAuth returnTo query preserves the origin for callback redirects.

## Logout

- Clear token and user data on logout.
- Expect redirect to /login.

## Regression Checks

- /post-job?service=... continues to preselect service after login.
- /user-dashboard and /vendor-dashboard still enforce auth and redirect to /login when missing token.
