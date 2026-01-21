# TradeMatch Production Launch Checklist

## ✅ COMPLETED - Critical Items

### Backend Infrastructure
- [x] **Package.json Configuration**: Main field points to `server.js` ✓
- [x] **Environment Variables**: All required variables added to render.yaml ✓
- [x] **Environment Template**: Created comprehensive .env.example ✓
- [x] **Security Middleware**: Added helmet, strict CORS, rate limiting ✓
- [x] **Structured Logging**: Implemented Winston logger ✓
- [x] **Health Endpoint**: Available at `/api/health` ✓
- [x] **Production Server**: Enhanced server-production.js with all security features ✓

### Database
- [x] **Migration Tool**: node-pg-migrate configured ✓
- [x] **Users Migration**: Created with OAuth support ✓
- [x] **Activation Tokens Migration**: Email verification support ✓
- [x] **Payments Migration**: Stripe integration ready ✓
- [x] **Email Notifications Migration**: Tracking system ready ✓
- [x] **Migration Scripts**: Automated runner created ✓

### Payments & Webhooks
- [x] **Stripe Service**: Complete payment processing ✓
- [x] **Webhook Endpoint**: Signature verification implemented ✓
- [x] **Webhook Handlers**: Payment success, failure, refund ✓
- [x] **Escrow System**: Payment holding and release logic ✓

### CI/CD & DevOps
- [x] **GitHub Actions**: Full CI/CD pipeline created ✓
- [x] **Security Scanning**: Automated secrets detection ✓
- [x] **Deployment Automation**: Render + Vercel integration ✓
- [x] **Testing Pipeline**: Backend + frontend checks ✓

### Documentation
- [x] **Deployment Guide**: Complete DEPLOYMENT.md created ✓
- [x] **Environment Docs**: All variables documented ✓
- [x] **Migration Guide**: Database setup instructions ✓
- [x] **Testing Guide**: API testing examples ✓

## 📋 TO DO - Pre-Launch Tasks

### 1. Database Setup (5-10 minutes)
```bash
cd backend
npm install
export DATABASE_URL="<your-neon-url>"
npm run migrate:up
```

**Verify:**
- [ ] All 4 tables created (users, activation_tokens, payments, email_notifications)
- [ ] pgmigrations table exists
- [ ] Database connection works from Render

### 2. Environment Variables (10-15 minutes)

**Render Dashboard - Add These:**
- [ ] `STRIPE_SECRET_KEY` (from Stripe dashboard)
- [ ] `STRIPE_WEBHOOK_SECRET` (from Stripe webhook setup)
- [ ] `RESEND_API_KEY` (from Resend dashboard)
- [ ] `GOOGLE_CLIENT_ID` (from Google Cloud Console)
- [ ] `GOOGLE_CLIENT_SECRET` (from Google Cloud Console)
- [ ] `MICROSOFT_CLIENT_ID` (from Azure Portal)
- [ ] `MICROSOFT_CLIENT_SECRET` (from Azure Portal)
- [ ] `OPENAI_API_KEY` (optional - for AI features)
- [ ] `CLAUDE_API_KEY` (optional - for AI features)

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- [ ] Add `JWT_SECRET` to Render

### 3. OAuth Configuration (15-20 minutes)

**Google OAuth:**
1. [ ] Go to https://console.cloud.google.com
2. [ ] Create/select project
3. [ ] Enable Google+ API
4. [ ] Create OAuth 2.0 credentials
5. [ ] Add authorized redirect: `https://your-backend.onrender.com/auth/google/callback`
6. [ ] Copy Client ID and Secret to Render

**Microsoft OAuth:**
1. [ ] Go to https://portal.azure.com
2. [ ] Register app in Azure AD
3. [ ] Add redirect URI: `https://your-backend.onrender.com/auth/microsoft/callback`
4. [ ] Copy Client ID and Secret to Render

### 4. Stripe Configuration (10-15 minutes)

1. [ ] Go to https://dashboard.stripe.com
2. [ ] Get API keys (use test keys first, then live)
3. [ ] Set up webhook endpoint: `https://your-backend.onrender.com/api/webhooks/stripe`
4. [ ] Select events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
5. [ ] Copy webhook signing secret to Render
6. [ ] Test webhook with Stripe CLI

### 5. Email Service Setup (5-10 minutes)

**Resend:**
1. [ ] Go to https://resend.com
2. [ ] Add domain: tradematch.uk
3. [ ] Verify DNS records
4. [ ] Get API key
5. [ ] Add to Render as `RESEND_API_KEY`
6. [ ] Test with sample email

### 6. Frontend Updates (10 minutes)

**Update API Endpoints in Frontend:**
- [ ] Search for `localhost:3001` in frontend JS files
- [ ] Replace with `https://your-backend.onrender.com`
- [ ] Update OAuth callback URLs
- [ ] Test all forms

**Update Meta Tags:**
- [ ] Add favicon links to all HTML files (use snippet in favicon-snippet.html)
- [ ] Verify sitemap.xml
- [ ] Verify robots.txt
- [ ] Add Google Analytics (if needed)

### 7. Domain & DNS (5 minutes)

- [ ] Point www.tradematch.uk to Vercel
- [ ] Verify SSL certificate
- [ ] Test domain resolution
- [ ] Set up redirect from tradematch.uk → www.tradematch.uk

### 8. Testing Checklist (20-30 minutes)

**Backend API:**
- [ ] Health check: GET `/api/health`
- [ ] Registration: POST `/api/auth/register`
- [ ] Login: POST `/api/auth/login`
- [ ] Get user: GET `/api/auth/me`
- [ ] Google OAuth: GET `/auth/google`
- [ ] Microsoft OAuth: GET `/auth/microsoft`

**Frontend:**
- [ ] Homepage loads
- [ ] Registration form works
- [ ] Login form works
- [ ] OAuth buttons work
- [ ] Navigation works
- [ ] Mobile responsive
- [ ] Cross-browser test (Chrome, Firefox, Safari)

**Payment Flow (if enabled):**
- [ ] Create payment intent
- [ ] Process test payment
- [ ] Webhook receives event
- [ ] Database updated correctly
- [ ] Email sent (if configured)

### 9. Security Verification (15 minutes)

- [ ] No secrets in GitHub repository
- [ ] .env in .gitignore
- [ ] HTTPS enforced on frontend
- [ ] CORS properly configured
- [ ] Rate limiting working
- [ ] Helmet headers present
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled

### 10. Monitoring Setup (10 minutes)

- [ ] Set up UptimeRobot for health endpoint
- [ ] Configure alerts (email/SMS)
- [ ] Set up error tracking (Sentry - optional)
- [ ] Enable Render metrics
- [ ] Configure Vercel analytics

## 🚀 GO LIVE STEPS

### Final Verification (30 minutes before launch)
1. [ ] All environment variables set
2. [ ] Database migrations run
3. [ ] Health endpoint returns 200
4. [ ] Test user can register and login
5. [ ] OAuth flows work
6. [ ] Frontend connects to backend
7. [ ] Payment test succeeds (if enabled)
8. [ ] Monitoring active

### Launch Sequence
1. [ ] **T-10 minutes**: Final database backup
2. [ ] **T-5 minutes**: Clear caches
3. [ ] **T-3 minutes**: Verify all services green
4. [ ] **T-1 minute**: Announce maintenance window (if needed)
5. [ ] **T-0**: Deploy to production
6. [ ] **T+1**: Verify health endpoint
7. [ ] **T+2**: Test critical user flows
8. [ ] **T+5**: Monitor logs for errors
9. [ ] **T+10**: Announce launch complete
10. [ ] **T+60**: Full system verification

### Post-Launch Monitoring (First 24 hours)
- [ ] Check logs every hour
- [ ] Monitor error rates
- [ ] Watch database performance
- [ ] Track user registrations
- [ ] Verify email delivery
- [ ] Check payment processing

## 🆘 Rollback Plan

If critical issues occur:

1. **Immediate Actions:**
   - [ ] Put up maintenance page
   - [ ] Stop new user registrations
   - [ ] Document the issue

2. **Rollback Steps:**
   ```bash
   # Revert to previous deployment
   git revert HEAD
   git push origin main
   ```
   - [ ] Render will auto-deploy previous version
   - [ ] Verify old version works
   - [ ] Restore database if needed

3. **Communication:**
   - [ ] Notify stakeholders
   - [ ] Update status page
   - [ ] Prepare incident report

## 📞 Emergency Contacts

- **Render Support**: https://render.com/support
- **Vercel Support**: https://vercel.com/support
- **Stripe Support**: https://support.stripe.com
- **Neon Support**: https://neon.tech/docs/support

## 📊 Success Metrics

**Day 1:**
- [ ] 0 critical errors
- [ ] < 5% error rate
- [ ] Health check 99.9% uptime
- [ ] At least 1 successful user registration

**Week 1:**
- [ ] Health check 99.9% uptime
- [ ] < 2% error rate
- [ ] All OAuth providers working
- [ ] Payment processing (if enabled)

**Month 1:**
- [ ] 99.9% uptime
- [ ] < 1% error rate
- [ ] Growing user base
- [ ] Positive user feedback

## 🎉 Launch Complete!

When all items are checked:
- [ ] Take screenshots of working app
- [ ] Document any issues encountered
- [ ] Create post-launch report
- [ ] Celebrate! 🎊

---

**Prepared By**: Development Team  
**Last Updated**: January 21, 2026  
**Status**: Ready for Production Launch
