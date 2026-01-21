# TradeMatch Platform - Production Deployment Guide

## 🚀 Quick Deployment Checklist

### ✅ Critical (MUST DO)

- [x] Fix backend package.json main field → `server.js`
- [x] Update render.yaml with all environment variables
- [x] Create .env.example with all required variables
- [x] Add database migrations (users, payments, activation_tokens, email_notifications)
- [x] Set up migration tool (node-pg-migrate)
- [x] Health endpoint implemented at `/api/health`
- [x] Add security middleware (helmet, CORS, rate limiting)
- [x] Add structured logging (Winston)
- [x] Create CI/CD pipeline (GitHub Actions)

### 📋 Pre-Deployment Tasks

1. **Environment Variables Setup**
   - Upload all secrets to Render dashboard
   - Verify .env file locally (never commit)
   - Check all required variables are set

2. **Database Preparation**
   - Run migrations on Neon database
   - Verify database connection
   - Test with sample data

3. **Code Review**
   - Ensure no secrets in repository
   - Run security audit
   - Test all critical endpoints

## 🗄️ Database Setup (Neon)

### Step 1: Run Migrations

```bash
cd backend
npm install
export DATABASE_URL="your-neon-connection-string"
npm run migrate:up
```

### Step 2: Verify Tables

```sql
-- Connect to your Neon database and verify
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Should show:
-- users
-- activation_tokens
-- payments
-- email_notifications
-- pgmigrations
```

### Migration Commands

```bash
# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create migration-name

# Run specific migration script
node scripts/run-migrations.js
```

## 🔐 Environment Variables

### Required Variables (Backend - Render)

```bash
# Database (Auto-configured by Render if using Neon integration)
DATABASE_URL=postgresql://user:password@host/database

# Core Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://www.tradematch.uk
JWT_SECRET=<generate-with-crypto>
CORS_ORIGINS=https://www.tradematch.uk,https://tradematch.uk

# OAuth Providers
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=https://your-backend.onrender.com/auth/google/callback

MICROSOFT_CLIENT_ID=<your-microsoft-client-id>
MICROSOFT_CLIENT_SECRET=<your-microsoft-client-secret>
MICROSOFT_CALLBACK_URL=https://your-backend.onrender.com/auth/microsoft/callback

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-webhook-secret>

# Email (Resend)
RESEND_API_KEY=re_<your-key>
EMAIL_FROM=noreply@tradematch.uk

# AI Services (Optional)
OPENAI_API_KEY=sk-<your-openai-key>
CLAUDE_API_KEY=sk-ant-<your-claude-key>
```

### Generating JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🌐 Deployment Steps

### Backend (Render)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production-ready backend with migrations and security"
   git push origin main
   ```

2. **Render Dashboard**
   - Go to https://dashboard.render.com
   - Service will auto-deploy from GitHub
   - Monitor build logs
   - Verify health endpoint: `https://your-app.onrender.com/api/health`

3. **Run Migrations on Render**
   - In Render dashboard, go to Shell
   - Run: `cd backend && npm run migrate:up`
   - Verify tables created

### Frontend (Vercel)

1. **Update Vercel Project**
   - Push latest frontend to GitHub
   - Vercel will auto-deploy
   - Verify at https://www.tradematch.uk

2. **Vercel Environment Variables**
   ```bash
   # Not needed for static frontend, but API URL should be hardcoded
   # in JS files to point to: https://your-backend.onrender.com
   ```

3. **Update Domain DNS**
   - Point www.tradematch.uk to Vercel
   - Configure SSL/TLS

## 🧪 Testing After Deployment

### 1. Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 123.45,
  "timestamp": "2026-01-21T...",
  "environment": "production"
}
```

### 2. Test Registration
```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userType": "customer",
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!",
    "phone": "07700900000",
    "postcode": "SW1A 1AA"
  }'
```

### 3. Test Login
```bash
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### 4. Frontend Tests
- Visit https://www.tradematch.uk
- Check homepage loads
- Test registration form
- Test login form
- Verify OAuth buttons work

## 🔒 Security Checklist

- [x] Helmet security headers enabled
- [x] Strict CORS in production
- [x] Rate limiting on auth endpoints
- [x] JWT tokens with expiry
- [x] Password hashing with bcrypt (12 rounds)
- [x] SQL injection prevention (parameterized queries)
- [x] No secrets in repository
- [x] Environment variables in hosting platform only
- [x] HTTPS enforced
- [x] Database SSL enabled

## 📊 Monitoring

### Health Monitoring
- Set up UptimeRobot or similar for `/api/health`
- Alert on downtime

### Error Tracking (Optional but Recommended)
- Integrate Sentry for error tracking
- Add SENTRY_DSN to environment variables

### Logging
- Logs stored in `backend/logs/`
- Access via Render dashboard shell
- Monitor `error.log` for issues

## 🔧 Maintenance

### Daily
- Monitor health endpoint
- Check error logs

### Weekly
- Review security audit: `npm audit`
- Check for dependency updates
- Review rate limit logs

### Monthly
- Rotate JWT_SECRET (coordinate with users)
- Database backup verification
- Performance review

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# In Render shell
cd backend
node -e "const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});pool.query('SELECT NOW()').then(r=>console.log(r.rows)).catch(e=>console.error(e));"
```

### Migration Issues
```bash
# Check migration status
npm run migrate -- list

# Force specific migration
npm run migrate -- up 1737465600000

# Reset (⚠️ DANGER: drops all data)
npm run migrate -- down 0
npm run migrate:up
```

### CORS Issues
- Verify CORS_ORIGINS matches frontend URL
- Check for trailing slashes
- Ensure credentials: true is set

## 📞 Support

- **Documentation**: See README.md files in each directory
- **Issues**: GitHub Issues
- **API Docs**: https://your-backend.onrender.com/

## 🎉 Success Criteria

- ✅ Backend health check returns 200 OK
- ✅ Database migrations completed
- ✅ Frontend loads without errors
- ✅ Registration works end-to-end
- ✅ Login works end-to-end
- ✅ OAuth flows work
- ✅ All environment variables set
- ✅ No secrets in repository
- ✅ CI/CD pipeline green
- ✅ Domain resolves correctly

## 📝 Post-Deployment

1. **Document API endpoints** for frontend team
2. **Set up monitoring alerts**
3. **Create user documentation**
4. **Plan feature rollout strategy**
5. **Schedule security review**

---

**Last Updated**: January 21, 2026  
**Status**: ✅ Production Ready
