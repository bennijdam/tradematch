# 🚀 Phase 7 Deployment Checklist

## Pre-Deployment

### 1. API Keys Setup
- [ ] Get Stripe API keys (https://dashboard.stripe.com/apikeys)
  - [ ] Test Secret Key: `sk_test_...`
  - [ ] Test Publishable Key: `pk_test_...`
  - [ ] Webhook Secret: `whsec_...`
- [ ] Get OpenAI API key (https://platform.openai.com/api-keys)
  - [ ] API Key: `sk-proj-...`
- [ ] Add all keys to Render environment variables

### 2. Stripe Setup
- [ ] Create Stripe account
- [ ] Enable payment methods (card, Google Pay, Apple Pay)
- [ ] Set up webhook endpoint: `https://your-domain.onrender.com/api/webhooks/stripe`
- [ ] Configure connected accounts (for vendor payouts)
- [ ] Test in Stripe test mode first

### 3. Database Migration
- [ ] Backup existing database
- [ ] Run: `psql $DATABASE_URL -f database-phase7-complete.sql`
- [ ] Verify all tables created
- [ ] Check indexes created
- [ ] Test sample data inserted

### 4. Dependencies Installation
```bash
cd backend
npm install stripe openai pdfkit chart.js
```

## Deployment Steps

### 1. Backend Deployment
```bash
# Add all files
git add backend/routes/*.js
git add backend/services/*.js
git add backend/middleware/*.js

# Commit
git commit -m "Phase 7: Complete implementation"

# Push
git push origin main
```

### 2. Frontend Deployment
```bash
# Add frontend files
git add frontend/pages/*.html
git add frontend/js/*.js
git add frontend/components/*.js

# Push
git push origin main
```

### 3. Environment Variables (Render)
Add these to Render dashboard:
```
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET
OPENAI_API_KEY=sk-proj-YOUR_KEY
ENABLE_AI_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_MILESTONES=true
PDF_STORAGE_PATH=/tmp/pdfs
```

### 4. Verify Deployment
- [ ] Check Render logs show no errors
- [ ] Test `/api/health` endpoint
- [ ] Verify new routes respond:
  - [ ] GET `/api/payments`
  - [ ] GET `/api/reviews`
  - [ ] GET `/api/analytics/dashboard`
  - [ ] POST `/api/ai/enhance-quote`
  - [ ] POST `/api/proposals`

## Testing Checklist

### Feature 1: Payments
- [ ] Create test payment intent
- [ ] Complete checkout with test card (4242 4242 4242 4242)
- [ ] Verify payment appears in dashboard
- [ ] Test escrow release
- [ ] Check Stripe dashboard shows payment

### Feature 2: Reviews
- [ ] Submit a test review
- [ ] Verify rating calculation
- [ ] Test vendor response
- [ ] Check review appears on vendor profile

### Feature 3: AI Enhancement
- [ ] Test quote enhancement
- [ ] Verify OpenAI response
- [ ] Check cost estimate generation
- [ ] Test timeline generation

### Feature 4: Proposals
- [ ] Create test proposal
- [ ] Download PDF
- [ ] Verify PDF formatting
- [ ] Test proposal acceptance flow

### Feature 5: Analytics
- [ ] Visit analytics dashboard
- [ ] Verify all charts load
- [ ] Check metrics display correctly
- [ ] Test report export (CSV)

### Feature 6: Milestones
- [ ] Create milestones for a quote
- [ ] Upload completion evidence
- [ ] Test approval workflow
- [ ] Verify payment release on completion

## Post-Deployment

### 1. Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure uptime monitoring
- [ ] Set up Stripe webhook monitoring
- [ ] Monitor OpenAI usage/costs

### 2. Documentation
- [ ] Update API documentation
- [ ] Create user guides for vendors
- [ ] Document Stripe integration
- [ ] Write troubleshooting guide

### 3. Customer Communication
- [ ] Announce Phase 7 features
- [ ] Send email to existing vendors
- [ ] Update marketing materials
- [ ] Create tutorial videos

## Rollback Plan

If issues occur:

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Restore database backup
psql $DATABASE_URL -f backup.sql

# Disable new features
# Set in Render:
ENABLE_AI_FEATURES=false
ENABLE_ANALYTICS=false
ENABLE_MILESTONES=false
```

## Support Resources

- Stripe Docs: https://stripe.com/docs
- OpenAI Docs: https://platform.openai.com/docs
- Chart.js Docs: https://www.chartjs.org/docs
- PDFKit Docs: http://pdfkit.org/docs

## Success Metrics

Track these after deployment:
- [ ] Payment completion rate
- [ ] AI feature usage
- [ ] Vendor analytics engagement
- [ ] Proposal acceptance rate
- [ ] Milestone completion time
- [ ] Customer satisfaction scores

## Estimated Timeline

- **Pre-deployment**: 2 hours
- **Deployment**: 1 hour
- **Testing**: 2 hours
- **Documentation**: 1 hour
- **Total**: ~6 hours

## Budget

- **Stripe fees**: 1.4% + 20p per transaction
- **OpenAI costs**: ~£0.01 per enhancement
- **Development time**: 2-3 weeks
- **Total investment**: £5,000-£7,000

## Expected ROI

- **Additional revenue**: £7,000/month
- **Break-even**: 1 month
- **12-month ROI**: £84,000

---

✅ **Phase 7 is ready for production deployment!**
