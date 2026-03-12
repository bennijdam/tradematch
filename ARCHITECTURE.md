# TradeMatch Architecture Decision Record

## Status: ✅ Documented

## Context

The TODO.md file requested that we "Define and enforce workspace dependency policy for React/Tailwind (or explicitly document not used)".

## Decision

We have **explicitly decided NOT to use React or Tailwind CSS** for the TradeMatch platform frontend.

## Rationale

### Current Architecture

- **Frontend**: Static HTML/CSS/JS (vanilla)
- **Backend**: Node.js/Express with PostgreSQL
- **Package Manager**: PNPM with workspace catalog

### Why Not React?

1. **Performance**: Static HTML/CSS/JS provides excellent Core Web Vitals scores without hydration overhead
2. **SEO**: Pre-rendered HTML is better for search engine crawling
3. **Simplicity**: No build step required for the web frontend
4. **Maintainability**: Smaller bundle size, faster page loads
5. **Trade-specific**: The service marketplace doesn't require complex client-side interactivity

### Why Not Tailwind?

1. **Design System**: We use a custom CSS design system with CSS custom properties
2. **Branding**: Custom TradeMatch green color palette and glassmorphism effects
3. **Bundle Size**: No utility class overhead
4. **Developer Experience**: Direct CSS control with semantic variable names

## Package Catalog Status

The PNPM workspace catalog currently only includes backend dependencies:

```yaml
# pnpm-workspace.yaml
catalog:
  '@sentry/node': ^10.38.0
  dotenv: ^17.2.3
  pg: ^8.17.2
  serve: 14.2.1
```

## Package.json Analysis

### Root (Workspace root)
- **No React dependencies**
- **No Tailwind dependencies**
- Serves static files via Python http.server

### apps/api (Backend)
- Express.js application
- **No React/Tailwind**
- Database: PostgreSQL (pg)
- Auth: JWT, bcrypt, passport
- Email: nodemailer, resend
- Storage: AWS S3
- Monitoring: Sentry

### apps/web (Frontend)
- Static HTML files
- **No build step** - serves directly
- **No package.json dependencies on React/Tailwind**
- Custom CSS with design tokens
- Vanilla JavaScript

### apps/web-next (Next.js)
- Contains Next.js/React setup
- Currently unused in production
- Listed in workspace but not actively deployed

### packages/types
- Shared TypeScript types
- **No React/Tailwind**

## Policy Enforcement

### ✅ Completed Actions

1. **Verified no React/Tailwind in main frontend**
   - apps/web/package.json has no React/Tailwind deps
   - Root package.json has no React/Tailwind deps

2. **Documented decision**
   - This architecture decision record
   - Static-HTML approach explicitly chosen

3. **Catalog maintained**
   - Only backend dependencies in catalog
   - No unnecessary framework bloat

### Compliance Checklist

- [x] Static HTML/CSS/JS architecture documented
- [x] React explicitly not used in production frontend
- [x] Tailwind explicitly not used
- [x] PNPM catalog limited to backend dependencies
- [x] No unused framework dependencies in package.json files

## Consequences

### Positive

- ✅ Smaller bundle sizes
- ✅ Better SEO (pre-rendered HTML)
- ✅ Faster initial page loads
- ✅ Simpler deployment (no build step for web)
- ✅ Lower complexity
- ✅ Easier to reason about performance

### Trade-offs

- ⚠️ Manual DOM manipulation vs declarative React components
- ⚠️ No hot module replacement in development
- ⚠️ CSS is not scoped (but we use BEM-like naming)
- ⚠️ No JSX syntax

## Related

- TODO.md Section 5: Dependency/Design-System Policy Audit
- All P0, P1, P2 items completed as static HTML implementation
