# API Reference (Overview)

This is a high-level overview of backend endpoints. For full implementation, see backend/routes and backend/server-production.js.

## Base URL

- Production: https://api.tradematch.uk
- Local: http://localhost:3001

## Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/auth/verify

OAuth

- GET /auth/google
- GET /auth/google/callback
- GET /auth/microsoft
- GET /auth/microsoft/callback

## Core

- /api/quotes
- /api/bids
- /api/customer
- /api/vendor
- /api/messaging
- /api/reviews
- /api/contracts
- /api/disputes
- /api/milestones
- /api/uploads

## Payments

- /api/payments
- /api/billing
- /api/credits
- /api/vendor-credits

## Admin

- /api/admin
- /api/admin/finance

## Webhooks

- /api/webhooks/stripe

## Health

- GET /api/health

## Notes

- Most routes require a Bearer token in the Authorization header.
- Rate limiting is enabled for auth endpoints.
