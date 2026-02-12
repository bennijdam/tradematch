# 🚀 TradeMatch Quick Deployment Reference

## ⚡ Essential Commands

### Backend
```bash
cd backend
npm install                    # Install dependencies
npm run migrate:up            # Run database migrations
npm start                     # Start production server
npm run dev                   # Start development server
```

### Database Migrations
```bash
npm run migrate:up            # Run all pending migrations
npm run migrate:down          # Rollback last migration
npm run migrate:create <name> # Create new migration
node scripts/run-migrations.js # Automated migration runner
```

### Testing
```bash
curl http://localhost:3001/api/health  # Test health endpoint
npm test                               # Run tests (when configured)
```

## 🔑 Essential Environment Variables

```bash
# Core (REQUIRED)
DATABASE_URL=postgresql://user:pass@host/db
JWT_SECRET=<32-char-random-string>
FRONTEND_URL=https://www.tradematch.uk
NODE_ENV=production

# OAuth (Optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx

# Payments (Optional)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email (Optional)
RESEND_API_KEY=re_xxx
```

## 📍 Deployment URLs

- **Backend (Render)**: https://your-app.onrender.com
- **Frontend (Vercel)**: https://www.tradematch.uk
- **Health Check**: https://your-app.onrender.com/api/health

## 🔄 Deployment Process

### 1. Pre-Deploy (Local)
```bash
git pull origin main
cd backend && npm install
npm run migrate:up  # Test migrations locally
npm start           # Test server locally
```

### 2. Deploy to Production
```bash
git add .
git commit -m "Production deployment"
git push origin main
# Render & Vercel auto-deploy
```

### 3. Post-Deploy (Render Shell)
```bash
cd backend
npm run migrate:up  # Run migrations on production DB
```

### 4. Verify
```bash
curl https://your-app.onrender.com/api/health
# Should return: {"status":"ok","database":"connected",...}
```

## 🧪 Quick Tests

### Health Check
```bash
curl https://your-backend.onrender.com/api/health
```

### Register Test User
```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"userType":"customer","fullName":"Test","email":"test@test.com","password":"Test1234!"}'
```

### Login Test
```bash
curl -X POST https://your-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'
```

## 🔐 Security Checklist

- [ ] No .env file in git
- [ ] JWT_SECRET is random and secure
- [ ] CORS_ORIGINS set to production domain only
- [ ] STRIPE_SECRET_KEY uses live keys (not test)
- [ ] All secrets in Render dashboard (not code)
- [ ] Database SSL enabled

## 🐛 Common Issues

### "Database connection failed"
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL  # Should not be empty

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "Migrations failed"
```bash
# Check which migrations ran
npm run migrate -- list

# Re-run specific migration
npm run migrate -- up 1737465600000
```

### "CORS error"
- Check CORS_ORIGINS in Render
- Ensure it matches frontend URL exactly
- No trailing slashes

### "Health check fails"
- Check Render logs
- Verify DATABASE_URL
- Ensure server is running
- Check port is 3001 or PORT env var

## 📊 Monitoring

### Check Logs (Render Dashboard)
1. Go to https://dashboard.render.com
2. Select your service
3. Click "Logs" tab
4. Filter by "Error" or search

### Database Queries
```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check migration status
SELECT * FROM pgmigrations ORDER BY id DESC;

-- Check user count
SELECT COUNT(*) FROM users;

-- Check recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;
```

## 🆘 Emergency Rollback

```bash
# Revert last commit
git revert HEAD
git push origin main

# Render will auto-deploy previous version
# Monitor at: https://dashboard.render.com
```

## 📱 Quick Links

- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **Stripe Dashboard**: https://dashboard.stripe.com
- **GitHub Actions**: https://github.com/your-repo/actions

## 📞 Support Resources

- **Full Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Production Checklist**: [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md)
- **Environment Vars**: [backend/.env.example](backend/.env.example)

---

**Keep this file handy during deployment! 🎯**
