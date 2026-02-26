# AGENTS.md - TradeMatch Development Guidelines

## Build & Test Commands

### Backend (apps/api/)
```bash
# Development
cd apps/api && npm run dev              # Start dev server with nodemon

# Testing
npm test                                  # Run all Jest tests
npm test -- <pattern>                     # Run single test file (e.g., "npm test -- auth")
npm test -- --testNamePattern="pattern"   # Run specific test by name
npm run smoke:auth                        # Auth smoke tests
npm run smoke:suite                       # Full smoke test suite
npm run e2e:booking                       # Booking flow E2E test

# Production
npm start                                 # Production server
npm run start:local                       # Local production-like server
```

### Frontend (Root)
```bash
# Development
npm run dev                               # Static server on port 8080
node server.js                            # Alternative local server on port 8000

# SEO/Build
npm run seo:generate:main                 # Generate main SEO pages
npm run seo:generate:locations            # Generate location pages
npm run seo:generate:all                  # Generate all SEO pages

# Testing
npm run test:smoke                        # Basic smoke tests
npm run test:security                     # Security check
npm run test:ui-smoke                    # UI smoke tests
npm run test:e2e                         # All Playwright E2E tests
npm run test:e2e:smoke                   # Smoke tests only (@smoke)
npm run test:e2e:sanity                  # Sanity tests only (@sanity)
npm run test:e2e:journeys                # Journey tests only (@e2e)
```

### Playwright E2E Tests
```bash
# Run specific test file
npx playwright test tests/e2e/smoke.spec.js
npx playwright test tests/e2e/sanity.spec.js
npx playwright test tests/e2e/customer-journey.spec.js
npx playwright test tests/e2e/vendor-journey.spec.js

# Run with specific tag
npx playwright test --grep "@smoke"
npx playwright test --grep "@sanity"
npx playwright test --grep "@e2e"

# Debug mode
npx playwright test --headed --slow-mo=250
```

## Code Style Guidelines

### JavaScript/Node.js Style
- Use **single quotes** for strings
- Use **camelCase** for variables and functions
- Use **PascalCase** for classes
- Use **UPPER_SNAKE_CASE** for constants
- Semicolons: **required**
- Indentation: **2 spaces**
- Max line length: **100 characters**

### Imports & Requires
```javascript
// Built-in modules first
const path = require('path');
const crypto = require('crypto');

// Third-party modules
const express = require('express');
const jwt = require('jsonwebtoken');

// Local modules (relative paths)
const { authenticate } = require('../middleware/auth');
const pool = require('../database/postgres-connection');

// Destructuring preferred when importing multiple items
const { apiLimiter, emailLimiter } = require('./middleware/rate-limit');
```

### Naming Conventions
- **Files**: kebab-case (e.g., `rate-limit.js`, `admin-finance.js`)
- **Routes**: kebab-case (e.g., `vendor-credits.js`)
- **Middleware**: camelCase function names (e.g., `authenticate`, `requireAdmin`)
- **Database tables**: snake_case (e.g., `vendor_credits`, `user_profiles`)
- **Environment variables**: UPPER_SNAKE_CASE (e.g., `JWT_SECRET`, `DATABASE_URL`)

### Error Handling Pattern
```javascript
// Always use try/catch for async operations
try {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  res.json(result.rows[0]);
} catch (error) {
  console.error('Error fetching user:', error);
  res.status(500).json({ 
    error: 'Failed to fetch user', 
    code: 'DB_ERROR' 
  });
}

// Use standardized error codes
// Common codes: NO_TOKEN, INVALID_TOKEN_FORMAT, DB_ERROR, VALIDATION_ERROR
```

### Route Structure
```javascript
const express = require('express');
const router = express.Router();

// Dependencies injection pattern
let pool, eventBroker;
router.setPool = (p) => { pool = p; };
router.setEventBroker = (eb) => { eventBroker = eb; };

// Middleware at route level
router.use(authenticate);

// Route handlers
router.get('/path', async (req, res) => {
  // Implementation
});

module.exports = router;
```

### Database Queries
```javascript
// Use parameterized queries only (never string concatenation)
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1 AND active = $2',
  [email, true]
);

// Use column check pattern for dynamic schemas
const columnsResult = await pool.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name = 'table_name'`
);
```

### Authentication Patterns
```javascript
// JWT payload normalization
function buildUserPayload(decoded) {
  return {
    id: decoded.userId,
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
    vendorId: decoded.vendorId,
    customerId: decoded.customerId
  };
}

// Role-based access control
const ADMIN_ROLES = ['admin', 'super_admin'];
const FINANCE_ROLES = ['admin', 'super_admin', 'finance_admin'];
```

### Response Format
```javascript
// Success responses
res.json({ success: true, data: result });

// Error responses
res.status(400).json({ 
  error: 'Validation failed', 
  code: 'VALIDATION_ERROR',
  details: error.message 
});
```

## Project Structure

- `apps/api/` - Express backend API
  - `routes/` - Route handlers
  - `middleware/` - Express middleware
  - `database/` - Database connection & queries
  - `services/` - Business logic
  - `scripts/` - Utility scripts
- `public/` - Static frontend files
- `tests/e2e/` - Playwright E2E tests
- `scripts/` - Build & automation scripts

## Environment Variables

Key variables in `apps/api/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `SENTRY_DSN` - Error tracking
- `PORT` - Server port (default: 3001)

## Testing Best Practices

- Use tags: `@smoke`, `@sanity`, `@e2e` for test categorization
- E2E tests use `BASE_URL` env var (default: `http://localhost:8080/frontend`)
- Always use `{ waitUntil: 'domcontentloaded' }` in page.goto()
- Prefer `data-testid` attributes for element selection
- Tests should be independent and not rely on execution order

## Security Guidelines

- Use rate limiting on all sensitive endpoints
- Validate all inputs with express-validator
- Hash passwords with bcrypt
- Use helmet for security headers
- CORS configured for specific origins only
- Never commit `.env` files
