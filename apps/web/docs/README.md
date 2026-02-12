# đźŹ—ď¸Ź TradeMatch UK - Production Platform

> **Status**: âś… Production Ready  
> **Version**: 3.1.0  
> **Last Updated**: January 21, 2026

TradeMatch is a comprehensive platform connecting customers with trusted tradespeople across the UK.

## đźš€ Quick Start

### Prerequisites
- Node.js 20.x
- PostgreSQL database (Neon recommended)
- npm or yarn

### Local Development

```bash
# 1. Clone and install
git clone <repository-url>
cd tradematch-fixed

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your local credentials

# 3. Run migrations
npm run migrate:up

# 4. Start backend
npm run dev

# 5. Start frontend (in a new terminal)
cd ../frontend
# Open index.html in browser or use Live Server
```

### Production Deployment

```powershell
# Run automated deployment preparation
.\deploy.ps1
```

Then follow the steps in [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)

## đź“ Project Structure

```
tradematch-fixed/
â”śâ”€â”€ apps/api/                 # Node.js Express API
â”‚   â”śâ”€â”€ config/             # Configuration files
â”‚   â”śâ”€â”€ middleware/         # Express middleware
â”‚   â”śâ”€â”€ migrations/         # Database migrations â­ NEW
â”‚   â”śâ”€â”€ routes/             # API routes
â”‚   â”śâ”€â”€ services/           # Business logic
â”‚   â”śâ”€â”€ server.js           # Main server file
â”‚   â””â”€â”€ server-production.js # Enhanced production server â­ NEW
â”śâ”€â”€ public/               # Static HTML/CSS/JS
â”‚   â”śâ”€â”€ components/         # Reusable components
â”‚   â”śâ”€â”€ js/                 # JavaScript files
â”‚   â”śâ”€â”€ pages/              # Individual pages
â”‚   â””â”€â”€ index.html          # Homepage
â”śâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â””â”€â”€ ci-cd.yml       # GitHub Actions CI/CD â­ NEW
â”śâ”€â”€ deploy.ps1              # Deployment automation â­ NEW
â”śâ”€â”€ DEPLOYMENT.md           # Deployment guide â­ NEW
â”śâ”€â”€ PRODUCTION-CHECKLIST.md # Launch checklist â­ NEW
â””â”€â”€ render.yaml             # Render.com config
```

## âś¨ Features

### Authentication
- âś… Email/password registration & login
- âś… Google OAuth integration
- âś… Microsoft OAuth integration
- âś… JWT token authentication
- âś… Password hashing with bcrypt
- â­ Email verification (ready - needs activation)

### Payments
- âś… Stripe payment processing
- âś… Escrow system
- âś… Webhook handling with signature verification
- âś… Refund support
- âś… Payment tracking in database

### Security
- â­ Helmet.js security headers
- â­ Strict CORS configuration
- â­ Rate limiting on sensitive endpoints
- âś… SQL injection prevention
- âś… XSS protection
- â­ Structured logging with Winston

### Infrastructure
- â­ Database migrations with node-pg-migrate
- â­ CI/CD pipeline with GitHub Actions
- âś… Health monitoring endpoint
- â­ Graceful shutdown handling
- âś… Error tracking and logging

### đź”— Connection Layer (NEW â­)
**Complete two-sided marketplace synchronization between Customer & Vendor dashboards**

- âś… **Shared Data Model**: 11 core tables (jobs, leads, conversations, messages, quotes, milestones, escrow, reviews, events, notifications)
- âś… **RBAC & Privacy**: Strict role-based access control, customer details masked until vendor acceptance, vendor pricing hidden from customers
- âś… **Messaging System**: Disabled by default, enabled post-lead-acceptance, immutable history, auto-read tracking
- âś… **Event System**: 20 event types, immutable audit trail, idempotency keys prevent duplicates
- âś… **State Machines**: Job (draftâ†’liveâ†’in_progressâ†’completed), Lead (offeredâ†’acceptedâ†’quote_sent), Quote (pendingâ†’accepted), Milestone (pendingâ†’approvedâ†’paid)
- âś… **Transactional Safety**: ACID transactions, concurrent locking, graceful rollback
- âś… **API Endpoints**: 6 core endpoints (job creation/publish, lead viewing/acceptance, messaging)

**Documentation**:
- [CONNECTION-LAYER-COMPLETE.md](CONNECTION-LAYER-COMPLETE.md) - Complete overview & status
- [CONNECTION-LAYER-ARCHITECTURE.md](CONNECTION-LAYER-ARCHITECTURE.md) - System design & data flow
- [CONNECTION-LAYER-INTEGRATION.md](CONNECTION-LAYER-INTEGRATION.md) - Developer integration guide
- [CONNECTION-LAYER-TESTING.md](CONNECTION-LAYER-TESTING.md) - Test scenarios & benchmarks

**Code**:
- [apps/api/database/schema-connection-layer.sql](apps/api/database/schema-connection-layer.sql) - Database schema (650+ lines)
- [apps/api/middleware/rbac.js](apps/api/middleware/rbac.js) - Access control (350+ lines)
- [apps/api/services/event-broker.service.js](apps/api/services/event-broker.service.js) - Event system (450+ lines)
- [apps/api/routes/connection-layer.js](apps/api/routes/connection-layer.js) - API routes (500+ lines)

## đź—„ď¸Ź Database Schema

### Tables
1. **users** - User accounts with OAuth support
2. **activation_tokens** - Email verification tokens
3. **payments** - Payment records with escrow status
4. **email_notifications** - Email tracking and delivery status

See [apps/api/migrations/](apps/api/migrations/) for full schema.

## đź”§ Configuration

### Environment Variables

**Critical (Required):**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)
- `FRONTEND_URL` - Frontend URL for CORS
- `CORS_ORIGINS` - Comma-separated allowed origins

**Optional but Recommended:**
- `STRIPE_SECRET_KEY` - Stripe payments
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `RESEND_API_KEY` - Email service
- `GOOGLE_CLIENT_ID` - Google OAuth
- `GOOGLE_CLIENT_SECRET` - Google OAuth
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth

See [apps/api/.env.example](apps/api/.env.example) for full list.

### Generating JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## đź“Š API Endpoints

### Health & Info
```
GET  /                      - API information
GET  /api/health            - Health check
```

### Authentication
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - Login user
GET  /api/auth/me           - Get current user
GET  /auth/google           - Google OAuth
GET  /auth/microsoft        - Microsoft OAuth
```

### Webhooks
```
POST /api/webhooks/stripe   - Stripe webhook (raw body)
```

## đź§Ş Testing

### Backend Tests
```bash
cd backend
npm test
```

### API Testing
```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Register user
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userType":"customer","fullName":"Test User","email":"test@example.com","password":"SecurePass123!"}'
```

## đź”„ Database Migrations

### Run Migrations
```bash
cd backend
npm run migrate:up
```

### Create New Migration
```bash
npm run migrate:create add-new-table
```

### Rollback Migration
```bash
npm run migrate:down
```

## đźš˘ Deployment

### Render (Backend)
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Service auto-deploys on push to `main`
4. Run migrations in Shell: `cd backend && npm run migrate:up`

### Vercel (Frontend)
1. Connect GitHub repository
2. Set root directory to `public/`
3. Auto-deploys on push to `main`

### Full Deployment Guide
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

## đź“ Monitoring

### Health Monitoring
- Endpoint: `/api/health`
- Returns: Database status, uptime, version
- Recommended: UptimeRobot or similar

### Logging
- Winston structured logging
- Files: `apps/api/logs/error.log`, `apps/api/logs/combined.log`
- Console output in development
- JSON format in production

### Error Tracking (Optional)
- Sentry integration ready
- Set `SENTRY_DSN` environment variable

## đź›ˇď¸Ź Security

### Implemented
- âś… Helmet security headers
- âś… CORS with whitelist
- âś… Rate limiting (15 min window)
- âś… JWT with expiry
- âś… Password hashing (12 rounds)
- âś… SQL injection prevention
- âś… Webhook signature verification
- âś… No secrets in repository

### Best Practices
- Rotate JWT_SECRET regularly
- Use strong passwords for database
- Enable 2FA on hosting platforms
- Monitor security advisories: `npm audit`
- Keep dependencies updated

## đź“š Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - Pre-launch checklist
- [apps/api/.env.example](apps/api/.env.example) - Environment variables
- [apps/api/migrations/](apps/api/migrations/) - Database schema

## đź¤ť Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `git commit -m "Add new feature"`
5. Push: `git push origin feature/new-feature`
6. Create Pull Request

## đź“ž Support

- **Documentation**: See docs above
- **Issues**: GitHub Issues
- **Email**: support@tradematch.uk

## đźŽŻ Production Checklist

Before going live, ensure:
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Health endpoint returns 200
- [ ] OAuth providers configured
- [ ] Stripe webhooks configured
- [ ] Domain DNS configured
- [ ] SSL certificates valid
- [ ] Monitoring active
- [ ] Error tracking configured
- [ ] Backup strategy in place

See [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) for complete list.

## đź“ť License

MIT License - See LICENSE file for details

## đź™Ź Acknowledgments

- Express.js framework
- PostgreSQL database
- Stripe payment processing
- Render & Vercel hosting
- Open source community

---

**Built with âť¤ď¸Ź for the UK trades community**

**Ready for Production**: âś…  
**CI/CD**: âś…  
**Security Hardened**: âś…  
**Database Migrations**: âś…  
**Monitoring**: âś…

