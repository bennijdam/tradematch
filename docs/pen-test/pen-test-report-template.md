# TradeMatch Pen-Test Report

Date:
Environment:
Tester:

## Scope
- Targets:
- Exclusions:

## Summary
- Total tests:
- Passed:
- Failed:
- Blocked:

## Findings
- ID:
- Title:
- Severity:
- CVSS:
- Affected area:
- Description:
- Evidence:
- Recommended fix:
- Remediation owner:
- Target fix date:

## Risk Matrix
| Severity | Likelihood | Impact | Risk |
| --- | --- | --- | --- |
| Critical |  |  |  |
| High |  |  |  |
| Medium |  |  |  |
| Low |  |  |  |

## Severity Rubric
- Critical: Remote compromise, data exfiltration at scale, or authentication bypass.
- High: Privilege escalation, sensitive data exposure, or significant integrity impact.
- Medium: Limited data exposure, minor privilege issues, or abusive automation.
- Low: Informational issues, minor misconfigurations, or hardening suggestions.

## CVSS Reference
- Calculator: https://www.first.org/cvss/calculator/3.1

## Test Log
| ID | Test | Endpoint | Expected | Actual | Result | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Auth rate limit | /api/auth/login | 429 after 5 |  |  |  |
| 2 | Admin no auth | /api/admin/stats | 401 |  |  |  |
| 3 | Admin non-admin | /api/admin/stats | 403 |  |  |  |
| 4 | Expired JWT | /api/auth/me | 401 |  |  |  |
| 5 | SQLi probe | /api/admin/users/:id/status | 400/404 |  |  |  |
| 6 | Read-only admin write | /api/admin/users/:id/status | 403 |  |  |  |
| 7 | Webhook no signature | /api/webhooks/stripe | 400 |  |  |  |
| 8 | Webhook bad signature | /api/webhooks/stripe | 400 |  |  |  |
| 9 | OAuth mock google | /auth/google | blocked in prod |  |  |  |
| 10 | OAuth mock microsoft | /auth/microsoft | blocked in prod |  |  |  |

## Notes
- 
