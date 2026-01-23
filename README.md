# 🏗️ TradeMatch UK - Production Platform

> **Status**: ✅ Production Ready  
> **Version**: 3.1.0  
> **Last Updated**: January 21, 2026

TradeMatch is a comprehensive platform connecting customers with trusted tradespeople across the UK.

## 🚀 Quick Start

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

## 📁 Project Structure

```
tradematch-fixed/
├── backend/                 # Node.js Express API
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── migrations/         # Database migrations ⭐ NEW
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── server.js           # Main server file
│   └── server-production.js # Enhanced production server ⭐ NEW
├── frontend/               # Static HTML/CSS/JS
│   ├── components/         # Reusable components
│   ├── js/                 # JavaScript files
│   ├── pages/              # Individual pages
│   └── index.html          # Homepage
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions CI/CD ⭐ NEW
├── deploy.ps1              # Deployment automation ⭐ NEW
├── DEPLOYMENT.md           # Deployment guide ⭐ NEW
├── PRODUCTION-CHECKLIST.md # Launch checklist ⭐ NEW
└── render.yaml             # Render.com config
```

## ✨ Features

### Authentication
- ✅ Email/password registration & login
- ✅ Google OAuth integration
- ✅ Microsoft OAuth integration
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ⭐ Email verification (ready - needs activation)

### Payments
- ✅ Stripe payment processing
- ✅ Escrow system
- ✅ Webhook handling with signature verification
- ✅ Refund support
- ✅ Payment tracking in database

### Security
- ⭐ Helmet.js security headers
- ⭐ Strict CORS configuration
- ⭐ Rate limiting on sensitive endpoints
- ✅ SQL injection prevention
- ✅ XSS protection
- ⭐ Structured logging with Winston

### Infrastructure
- ⭐ Database migrations with node-pg-migrate
- ⭐ CI/CD pipeline with GitHub Actions
- ✅ Health monitoring endpoint
- ⭐ Graceful shutdown handling
- ✅ Error tracking and logging

### 🔗 Connection Layer (NEW ⭐)
**Complete two-sided marketplace synchronization between Customer & Vendor dashboards**

- ✅ **Shared Data Model**: 11 core tables (jobs, leads, conversations, messages, quotes, milestones, escrow, reviews, events, notifications)
- ✅ **RBAC & Privacy**: Strict role-based access control, customer details masked until vendor acceptance, vendor pricing hidden from customers
- ✅ **Messaging System**: Disabled by default, enabled post-lead-acceptance, immutable history, auto-read tracking
- ✅ **Event System**: 20 event types, immutable audit trail, idempotency keys prevent duplicates
- ✅ **State Machines**: Job (draft→live→in_progress→completed), Lead (offered→accepted→quote_sent), Quote (pending→accepted), Milestone (pending→approved→paid)
- ✅ **Transactional Safety**: ACID transactions, concurrent locking, graceful rollback
- ✅ **API Endpoints**: 6 core endpoints (job creation/publish, lead viewing/acceptance, messaging)

**Documentation**:
- [CONNECTION-LAYER-COMPLETE.md](CONNECTION-LAYER-COMPLETE.md) - Complete overview & status
- [CONNECTION-LAYER-ARCHITECTURE.md](CONNECTION-LAYER-ARCHITECTURE.md) - System design & data flow
- [CONNECTION-LAYER-INTEGRATION.md](CONNECTION-LAYER-INTEGRATION.md) - Developer integration guide
- [CONNECTION-LAYER-TESTING.md](CONNECTION-LAYER-TESTING.md) - Test scenarios & benchmarks

**Code**:
- [backend/database/schema-connection-layer.sql](backend/database/schema-connection-layer.sql) - Database schema (650+ lines)
- [backend/middleware/rbac.js](backend/middleware/rbac.js) - Access control (350+ lines)
- [backend/services/event-broker.service.js](backend/services/event-broker.service.js) - Event system (450+ lines)
- [backend/routes/connection-layer.js](backend/routes/connection-layer.js) - API routes (500+ lines)

## 🗄️ Database Schema

### Tables
1. **users** - User accounts with OAuth support
2. **activation_tokens** - Email verification tokens
3. **payments** - Payment records with escrow status
4. **email_notifications** - Email tracking and delivery status

See [backend/migrations/](backend/migrations/) for full schema.

## 🔧 Configuration

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

See [backend/.env.example](backend/.env.example) for full list.

### Generating JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 API Endpoints

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

## 🧪 Testing

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

## 🔄 Database Migrations

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

## 🚢 Deployment

### Render (Backend)
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Service auto-deploys on push to `main`
4. Run migrations in Shell: `cd backend && npm run migrate:up`

### Vercel (Frontend)
1. Connect GitHub repository
2. Set root directory to `frontend/`
3. Auto-deploys on push to `main`

### Full Deployment Guide
See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions.

## 📈 Monitoring

### Health Monitoring
- Endpoint: `/api/health`
- Returns: Database status, uptime, version
- Recommended: UptimeRobot or similar

### Logging
- Winston structured logging
- Files: `backend/logs/error.log`, `backend/logs/combined.log`
- Console output in development
- JSON format in production

### Error Tracking (Optional)
- Sentry integration ready
- Set `SENTRY_DSN` environment variable

## 🛡️ Security

### Implemented
- ✅ Helmet security headers
- ✅ CORS with whitelist
- ✅ Rate limiting (15 min window)
- ✅ JWT with expiry
- ✅ Password hashing (12 rounds)
- ✅ SQL injection prevention
- ✅ Webhook signature verification
- ✅ No secrets in repository

### Best Practices
- Rotate JWT_SECRET regularly
- Use strong passwords for database
- Enable 2FA on hosting platforms
- Monitor security advisories: `npm audit`
- Keep dependencies updated

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) - Pre-launch checklist
- [backend/.env.example](backend/.env.example) - Environment variables
- [backend/migrations/](backend/migrations/) - Database schema

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes
3. Run tests: `npm test`
4. Commit: `git commit -m "Add new feature"`
5. Push: `git push origin feature/new-feature`
6. Create Pull Request

## 📞 Support

- **Documentation**: See docs above
- **Issues**: GitHub Issues
- **Email**: support@tradematch.uk

## 🎯 Production Checklist

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

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Express.js framework
- PostgreSQL database
- Stripe payment processing
- Render & Vercel hosting
- Open source community

---

**Built with ❤️ for the UK trades community**

**Ready for Production**: ✅  
**CI/CD**: ✅  
**Security Hardened**: ✅  
**Database Migrations**: ✅  
**Monitoring**: ✅
