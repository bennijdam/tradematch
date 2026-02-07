# Lead System Implementation Checklist

## ✅ Completed Components

### Backend Services
- [x] Lead Qualification Service (lead-qualification.service.js)
  - [x] Budget scoring (0-20 points)
  - [x] Detail scoring (0-20 points)
  - [x] Urgency scoring (0-15 points)
  - [x] Customer scoring (0-20 points)
  - [x] Location scoring (0-10 points)
  - [x] Quality tier determination (basic/standard/premium)
  - [x] Save qualification score to database
  - [x] Retrieve qualification score from database

- [x] Lead Pricing Service (lead-pricing.service.js)
  - [x] Base price calculation from budget tiers
  - [x] Category multiplier lookup
  - [x] Location multiplier lookup
  - [x] Quality multiplier calculation (-20% to +30%)
  - [x] Price rounding to nearest £0.50
  - [x] Refund calculation by reason
  - [x] Competitor comparison vs MyBuilder
  - [x] Credit package pricing tiers

- [x] Lead Distribution Service (lead-distribution.service.js)
  - [x] Find candidate vendors by criteria
  - [x] Score vendor match (100 points total)
  - [x] Distance scoring (0-20)
  - [x] Specialty scoring (0-20)
  - [x] Budget match scoring (0-20)
  - [x] Performance scoring (0-20)
  - [x] Fair rotation scoring (0-20)
  - [x] Determine vendor count (3-5 based on quality)
  - [x] Record distribution in database
  - [x] Charge vendor for lead access

- [x] Lead System Integration Service (lead-system-integration.service.js)
  - [x] Orchestrate full lead processing flow
  - [x] Qualify → Price → Distribute pipeline
  - [x] Vendor notification handler
  - [x] Customer notification handler
  - [x] Analytics recording
  - [x] Lead refund handling
  - [x] Dashboard summary generation

### Backend Routes
- [x] Credits Routes (backend/routes/credits.js)
  - [x] GET /api/credits/balance - Get current balance
  - [x] GET /api/credits/packages - List purchase packages
  - [x] POST /api/credits/purchase - Create Stripe payment intent
  - [x] POST /api/credits/purchase/confirm - Confirm payment
  - [x] GET /api/credits/transaction-history - View transactions
  - [x] GET /api/credits/analytics - View usage analytics

- [x] Leads Routes - Partial (backend/routes/leads.js)
  - [x] GET /api/leads/available - Get matched leads with affordability check
  - [x] POST /api/leads/:quoteId/access - Purchase lead access
  - [x] GET /api/leads/purchased - View accessed leads
  - [x] GET /api/leads/analytics - Vendor performance stats

### Database
- [x] Migration created (1737660000000_create-lead-system-tables.js)
  - [x] lead_pricing_rules table definition
  - [x] vendor_credits table definition
  - [x] lead_qualification_scores table definition
  - [x] lead_distributions table definition
  - [x] credit_purchases table definition
  - [x] lead_analytics_daily table definition
  - [x] All required indexes

### Frontend UI
- [x] Vendor Credits Purchase Page (frontend/vendor-credits.html)
  - [x] Package selector with 5 tiers
  - [x] Bulk discount display
  - [x] Current balance sidebar
  - [x] Payment method selection
  - [x] Order summary
  - [x] FAQ section
  - [x] Responsive design

### Configuration
- [x] Server route mounting (backend/server.js)
  - [x] Credits route registered
  - [x] Error handling and logging

---

## ⚠️ IN-PROGRESS Components

### TODO: Apply Database Migration
**Status**: Migration file created, not yet applied to Neon
**Action Required**: 
```bash
cd backend
npm run migrate
# Verify with: SELECT tablename FROM pg_tables WHERE schemaname = 'public'
```

**Verification Checklist**:
- [ ] Migration runs without errors
- [ ] All 6 tables created
- [ ] All columns present with correct types
- [ ] All indexes created
- [ ] Sample data can be inserted
- [ ] Constraints working (UNIQUE, FOREIGN KEY)

---

### TODO: Quote Creation Integration
**File**: `backend/routes/quotes.js`
**Status**: Needs update to POST /api/quotes endpoint

**Required Changes**:
1. Import LeadSystemIntegrationService at top of file
2. In POST /api/quotes create handler:
   ```javascript
   const leadSystem = new LeadSystemIntegrationService(pool, emailService);
   const leadResult = await leadSystem.processNewLead(quote, customer);
   
   // Check if lead processing succeeded
   if (!leadResult.success) {
     console.warn('Lead processing failed:', leadResult.error);
     // Continue anyway, customer quote still created
   }
   
   return {
     ...quoteResponse,
     leadProcessing: {
       qualified: leadResult.qualification.overall,
       pricingTier: leadResult.pricing.finalPrice,
       vendorsNotified: leadResult.distributions.length
     }
   };
   ```

**Verification**:
- [ ] Creating a quote triggers qualification
- [ ] Qualification score is calculated correctly
- [ ] Lead cost is calculated
- [ ] Vendors are matched and notified
- [ ] Distribution records created in database
- [ ] Customer receives confirmation email (if email service enabled)

---

### TODO: Email Notifications for Lead Posting
**File**: `backend/email-resend.js`
**Status**: Needs new endpoints for lead-specific notifications

**Required Endpoints**:
1. `POST /api/email/new-lead-notification` - Notify vendor of new lead
   - Template includes: title, description, budget, urgency, customer name, lead quality tier
   - Button: "View Lead" with cost and match score

2. `POST /api/email/lead-confirmation` - Confirm to customer their lead is posted
   - Template includes: # vendors notified, timeline, link to tracking
   - Button: "View Responses"

**Verification**:
- [ ] Vendor receives email when lead posted
- [ ] Email shows lead title, budget, urgency
- [ ] Email shows quality tier and cost
- [ ] Customer receives confirmation
- [ ] Emails respect consent settings

---

### TODO: Vendor Dashboard Lead Management
**File**: `frontend/vendor-dashboard.html` (or create `frontend/leads-dashboard.html`)
**Status**: Needs significant updates

**Required Features**:
1. **Leads Tab / Section**
   - List available leads (not yet accessed)
   - Show: Title, Service, Budget, Quality Tier, Estimated Cost, Match Score
   - Button: "View Full Details" (shows cost and requires credit check)
   - Pagination and filters (by service, budget, quality)

2. **Purchased Leads Tab**
   - List leads vendor has accessed
   - Show: Customer name, service, bid status, bid amount
   - View full lead details (customer contact, requirements, photos)
   - Submit bid button
   - Contact customer form

3. **Analytics Section**
   - Available leads count today
   - This month: leads accessed, bids submitted, jobs won, ROI
   - Conversion funnel: available → viewed → bid submitted → job won
   - Monthly trend chart (leads, bids, wins)
   - Top performing service types

4. **Credits Section**
   - Current balance with large display
   - Quick buy button (5-minute purchase flow)
   - Transaction history (last 10)
   - ROI calculator (estimate earnings per lead)

**Verification**:
- [ ] Leads load from /api/leads/available
- [ ] Cost shown before vendor can access
- [ ] Credit check happens before access granted
- [ ] Vendor can submit bid after accessing lead
- [ ] Analytics calculated correctly
- [ ] Purchase credits button works

---

### TODO: Admin Lead Management Interface
**Files Needed**: 
- `backend/routes/admin-leads.js`
- `frontend/admin-leads-dashboard.html`

**Status**: Not started

**Required Features**:
1. **Lead Distributions View**
   - All leads in system with distribution details
   - Vendor responses and bid status
   - Quality scores and pricing
   - Filter by date range, service type, quality tier

2. **Pricing Rules Management**
   - View current pricing rules
   - Edit category multipliers
   - Edit location multipliers
   - Edit quality adjustments
   - Test pricing calculator

3. **Refund Requests**
   - View all refund requests
   - Approve/reject with notes
   - Track refund amounts and reasons

4. **Platform Analytics**
   - Total leads processed
   - Vendor utilization
   - Average quality score
   - Revenue from credits
   - Customer satisfaction

**Verification**:
- [ ] Admin can view all leads
- [ ] Pricing rules can be modified
- [ ] Refunds can be processed
- [ ] Analytics dashboard functional

---

### TODO: Stripe Webhook Integration
**File**: `backend/server.js` (or new `backend/webhooks/stripe.js`)
**Status**: Not started

**Required**:
1. Webhook endpoint at POST /webhooks/stripe
2. Verify Stripe signature
3. Handle `payment_intent.succeeded` event
4. Confirm credit purchase for matching payment intent
5. Idempotency key handling
6. Error logging and retry logic

**Verification**:
- [ ] Webhook endpoint registered
- [ ] Stripe test payment completes successfully
- [ ] Credits added to account
- [ ] Email confirmation sent
- [ ] Transaction recorded correctly

---

## ❌ NOT STARTED Components

### TODO: Advanced Lead Features (Optional, Phase 2)
1. Lead re-distribution if first vendor batch doesn't bid
2. Dynamic pricing adjustment based on demand
3. Vendor rating boost for premium leads
4. Lead performance feedback loop
5. Machine learning for better matching
6. A/B testing for pricing optimization

---

## Testing Plan

### Unit Tests
- [ ] Quality scoring calculations (edge cases)
- [ ] Pricing calculations (min/max bounds)
- [ ] Vendor matching algorithm (tie-breaking)
- [ ] Credit deduction atomicity
- [ ] Refund calculations

### Integration Tests
- [ ] Quote creation → full lead processing pipeline
- [ ] Credit purchase → balance update
- [ ] Lead access → cost deduction → balance decrease
- [ ] Email notifications sent correctly
- [ ] Analytics aggregated correctly

### End-to-End Tests
- [ ] Customer creates quote
- [ ] Lead distributed to vendors
- [ ] Vendors receive notifications
- [ ] Vendor buys credits
- [ ] Vendor accesses lead
- [ ] Vendor submits bid
- [ ] Customer selects winning bid
- [ ] Job completed, analytics updated

### Load Testing
- [ ] Vendor dashboard loads with 1000+ leads
- [ ] Analytics query performance (large datasets)
- [ ] Credit purchase under heavy traffic
- [ ] Concurrent lead distributions

---

## Deployment Checklist

### Pre-Deployment
- [ ] All migrations applied to Neon database
- [ ] Environment variables set (STRIPE_SECRET_KEY, etc.)
- [ ] Email service configured
- [ ] Database backups created
- [ ] Rollback plan documented

### Deployment
- [ ] Code deployed to staging
- [ ] All tests passing
- [ ] Manual testing of quote → lead → distribution flow
- [ ] Credit purchase tested with Stripe
- [ ] Email notifications verified
- [ ] Code deployed to production

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Verify lead distributions happening
- [ ] Check vendor adoption (new lead access)
- [ ] Monitor Stripe payment success rate
- [ ] Get customer feedback on lead quality

---

## Performance Optimization TODO

### Database Optimization
- [ ] Verify all indexes created
- [ ] Add index on lead_distributions(vendor_id, accessed_at)
- [ ] Consider partitioning lead_distributions by month
- [ ] Cache vendor matching results

### API Optimization
- [ ] Cache available leads list (5-minute TTL)
- [ ] Batch vendor notifications
- [ ] Async lead distribution (background job)
- [ ] Pagination on all list endpoints

### Frontend Optimization
- [ ] Lazy load analytics charts
- [ ] Cache credit balance (1-minute)
- [ ] Debounce lead list filtering
- [ ] Compress lead images

---

## Monitoring & Alerting TODO

### Metrics to Track
- [ ] Leads created per day
- [ ] Average quality score
- [ ] Distribution success rate
- [ ] Vendor access rate (% accessing within 24h)
- [ ] Credit purchase conversion rate
- [ ] Customer satisfaction (email feedback)
- [ ] Vendor feedback on lead quality

### Alerts to Set Up
- [ ] Alert if distribution failure > 5%
- [ ] Alert if vendor credit balance < 3 hours of daily traffic
- [ ] Alert if email notification failure > 2%
- [ ] Alert if Stripe API errors > 5%

---

## Success Metrics (Post-Launch)

### Week 1
- [ ] 50+ quotes posted
- [ ] 40%+ of vendors accessing leads
- [ ] 100% of available leads distributed
- [ ] 0 critical bugs

### Month 1
- [ ] 500+ leads processed
- [ ] 2000+ vendor lead accesses
- [ ] 15%+ average conversion rate (leads → bids)
- [ ] £5,000+ in credits purchased
- [ ] 4.5+ customer satisfaction rating

### Quarter 1
- [ ] TradeMatch position as premium alternative established
- [ ] 30%+ cheaper than MyBuilder on average
- [ ] 20%+ conversion rate (significantly above industry)
- [ ] 50+ active vendor subscribers
- [ ] £50,000+ in credit revenue

---

## Quick Reference: API Endpoints Ready

### Fully Functional
- `POST /api/quotes` - Create quote (needs integration with lead system)
- `GET /api/credits/balance` - Get balance
- `GET /api/credits/packages` - List packages
- `POST /api/credits/purchase` - Initiate purchase
- `GET /api/leads/available` - List available leads
- `POST /api/leads/:quoteId/access` - Access lead

### Partial
- `GET /api/leads/analytics` - Works but may need dashboard

### Needs Implementation
- Quote update flow (triggers re-scoring/re-distribution if details change)
- Lead completion (when job is done, update analytics)
- Refund request submission from vendor
- Support ticket for lead quality issues

---

## File Structure Overview

```
backend/
├── services/
│   ├── lead-qualification.service.js ✅
│   ├── lead-pricing.service.js ✅
│   ├── lead-distribution.service.js ✅
│   └── lead-system-integration.service.js ✅
├── routes/
│   ├── credits.js ✅
│   ├── leads.js ✅ (mostly complete)
│   ├── quotes.js ⚠️ (needs integration)
│   └── admin-leads.js ❌
├── migrations/
│   └── 1737660000000_create-lead-system-tables.js ✅ (not applied)
└── server.js ✅ (routes registered)

frontend/
├── vendor-credits.html ✅
├── vendor-dashboard.html ⚠️ (needs lead tabs)
├── admin-leads-dashboard.html ❌
└── customer-quote-tracking.html ⚠️ (shows distribution)

documentation/
├── LEAD-SYSTEM-STATUS.md ✅
├── LEAD-SYSTEM-IMPLEMENTATION-CHECKLIST.md ✅ (this file)
└── API-EXAMPLES.md (to be created)
```

---

## Next Immediate Steps (In Priority Order)

1. **Apply Migration** - Database schema creation
2. **Integrate with Quote Creation** - Trigger lead processing
3. **Complete Vendor Dashboard** - Show available/purchased leads
4. **Add Email Notifications** - Let vendors know about new leads
5. **Test End-to-End** - Full flow from quote to bid
6. **Deploy and Monitor** - Watch for issues and user adoption

---

## Support Contact
For questions or blockers, check:
- Database schema: LEAD-SYSTEM-STATUS.md
- Service implementations: Individual service files
- API responses: leads.js and credits.js route handlers
- Frontend integration: vendor-credits.html example
