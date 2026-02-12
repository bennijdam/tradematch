# TradeMatch Frontend

This frontend is structured with isolated dashboards, a shared layer, and centralized documentation under `docs/`.

## Structure
- `user-dashboard/` - User dashboard SPA
- `vendor-dashboard/` - Vendor dashboard SPA
- `super-admin-dashboard/` - Super Admin SPA
- `shared/` - Cross-dashboard primitives
- `scripts/` - Frontend automation scripts
- `docs/` - Frontend documentation

## Entry Points
- Public: `pages/index.html`
- Auth: `pages/auth-login.html`
- Vendor: `vendor-dashboard/index.html`
- User: `user-dashboard/pages/index.html`
- Super Admin: `super-admin-dashboard/index.html`
