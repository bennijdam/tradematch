# Enhanced Vendor Dashboard - Complete Implementation Guide

## 🎯 Overview

The Enhanced Vendor Dashboard is a comprehensive control centre for tradespeople on TradeMatch. It provides:

- **Lead quality transparency** - See match scores, pricing, and preview details before committing
- **Cost control** - Auto-accept rules, spend limits, and clear pricing
- **Business analytics** - Conversion rates, response times, and performance tracking
- **Job management** - Full customer details post-acceptance, status tracking, private notes

**Key Differentiator**: Vendors control what they accept. No forced charges, no surprises.

---

## 📂 Files Structure

### Frontend
```
frontend/
  └── vendor-dashboard-enhanced.html (2,000+ lines)
      ├── 8 main sections (Overview, Lead Inbox, Active Jobs, etc.)
      ├── Complete CSS styling
      ├── JavaScript state management
      └── API integration layer
```

### Backend
```
backend/routes/
  └── vendor.js (+500 lines added)
      ├── GET /api/vendor/overview
      ├── GET /api/vendor/leads/accepted
      ├── PATCH /api/vendor/jobs/:quoteId/status
      ├── POST /api/vendor/jobs/:quoteId/notes
      ├── GET /api/vendor/auto-accept-rules
      └── POST /api/vendor/auto-accept-rules
```

---

## 🏗️ Dashboard Sections

### 1. Overview (Home Screen)

**Purpose**: High-level business snapshot for quick decision-making

**Components**:
- **6 Stat Cards**:
  - 📬 Available Leads (action required count)
  - 🔨 Active Jobs (accepted but not completed)
  - 💰 Total Spend (monthly)
  - 📊 Conversion Rate (accepted/offered ratio)
  - ⭐ Average Match Score (lead quality indicator)
  - ⚡ Average Response Time (hours to accept)

- **Quick Actions**:
  - View Available Leads button → navigates to Lead Inbox
  - Manage Active Jobs button → navigates to Active Jobs
  - Top Up Wallet button → navigates to Wallet (coming soon)
  - Update Service Profile button → navigates to Profile settings

**API Contract**:
```javascript
GET /api/vendor/overview
Authorization: Bearer {token}

Response:
{
  offeredLeads: 3,
  activeJobs: 5,
  totalSpendMonth: 45.50,
  conversionRate: 67,  // percentage
  avgMatchScore: 82,
  avgResponseTime: 2,  // hours
  walletBalance: 125.00
}
```

**Business Logic**:
- `offeredLeads`: COUNT where `lead_state = 'offered'` AND `expires_at > NOW()`
- `activeJobs`: COUNT where `lead_state = 'accepted'` AND `job_status NOT IN ('completed', 'lost')`
- `totalSpendMonth`: SUM of `credits_charged` where `payment_charged = TRUE` in current month
- `conversionRate`: (accepted / offered) * 100 for last 30 days
- `avgMatchScore`: AVG of `match_score` for last 30 days
- `avgResponseTime`: AVG hours between `distributed_at` and `accepted_at` (last 30 days)

---

### 2. Lead Inbox (Previews)

**Purpose**: Display incoming lead previews with HIDDEN customer details

**Components**:
- **Lead Preview Cards**:
  - Job category with quality badge (Premium/Standard/Basic)
  - Hidden location (postcode sector only, e.g., "SW1A 1**")
  - Budget range (if provided)
  - Timeframe (urgent/flexible)
  - Match score with visual progress bar
  - Lead price (clear £X.XX display)
  - Distance from vendor's location
  - Expiration countdown (24-hour timer)
  - Privacy notice ("Customer details hidden until acceptance")
  - **Actions**: ✅ Accept & Pay button, ❌ Decline button

**API Contract**:
```javascript
GET /api/leads/offered
Authorization: Bearer {token}

Response: [
  {
    quoteId: 123,
    category: "Plumbing",
    area: "SW1A 1**",  // Hidden sector
    budgetRange: "£500-£1000",
    timeframe: "Within 2 weeks",
    qualityScore: 82,
    qualityTier: "premium",  // premium|standard|basic
    leadPrice: 3.50,
    matchScore: 85,
    distanceMiles: 4.2,
    expiresAt: "2026-01-23T14:30:00Z"
  }
]
```

**Privacy Rules**:
- ❌ NO customer name
- ❌ NO customer phone/email
- ❌ NO full postcode
- ❌ NO detailed job description
- ✅ ONLY area, category, budget range, timeframe
- ✅ Lead pricing ALWAYS visible
- ✅ Match score ALWAYS transparent

**Accept/Decline Flow**:

1. **Accept Flow**:
   ```
   User clicks "Accept & Pay £3.50"
   → Modal opens showing payment confirmation
   → User confirms
   → POST /api/leads/:quoteId/accept
   → Backend checks:
      - Vendor has sufficient wallet balance
      - Lead not already accepted by 5 vendors
      - Lead not expired
      - Vendor within spend limits
   → Charge wallet, update state to 'accepted'
   → Return FULL customer details (unlocked)
   → Show success message with customer contact
   → Move lead to Active Jobs section
   ```

2. **Decline Flow**:
   ```
   User clicks "Decline"
   → Modal opens asking for reason (optional)
   → User selects reason or skips
   → POST /api/leads/:quoteId/decline
   → Backend updates state to 'declined', records reason
   → NO CHARGE incurred
   → Lead removed from inbox
   → Lead MAY be offered to backup vendor
   ```

**Expiration Logic**:
- All leads have 24-hour expiration from `distributed_at`
- Countdown timer shows hours:minutes remaining
- Expired leads automatically removed from inbox
- Cron job runs hourly to update `lead_state = 'expired'`

---

### 3. Accepted Leads (Active Jobs)

**Purpose**: Full job management for leads vendor has paid for

**Components**:

Each job card displays:

**Header Section** (Green gradient):
- Job title (category)
- Acceptance date
- Current status badge (Contacted/Quote Sent/In Progress/Completed/Lost)

**Customer Contact Section** (Unlocked):
- ✅ Full customer name
- ✅ Full phone number
- ✅ Full email address
- ✅ Complete postcode
- 🔒 Displayed in highlighted box (emerald background)

**Job Details Section**:
- Full job description (no longer hidden)
- Budget range
- Timeframe
- Lead fee paid (£X.XX)
- Payment transaction reference
- Match score and distance

**Status Update Actions**:
```javascript
// Available status transitions
'contacted'       → Customer contacted by phone/email
'quote_sent'      → Quote/estimate sent to customer
'quote_accepted'  → Customer accepted your quote
'in_progress'     → Work started
'completed'       → Job finished successfully
'lost'            → Job lost (customer chose competitor)
```

**Internal Notes**:
- Private text notes visible only to vendor
- Stored in `vendor_job_notes` table
- Use for: call summaries, site visit notes, material requirements
- NOT visible to customer or platform admin

**API Contracts**:

```javascript
// Get all accepted leads
GET /api/vendor/leads/accepted
Authorization: Bearer {token}

Response: [
  {
    quoteId: 123,
    category: "Plumbing",
    description: "Boiler installation needed in 3-bedroom house...",
    budgetRange: "£1000",
    timeframe: "Within 2 weeks",
    postcode: "SW1A 1AA",  // FULL postcode now visible
    customerName: "John Smith",  // UNLOCKED
    customerEmail: "john@example.com",  // UNLOCKED
    customerPhone: "07700900123",  // UNLOCKED
    acceptedAt: "2026-01-22T10:30:00Z",
    leadPrice: 3.50,
    paymentTransactionId: "txn_abc123",
    status: "contacted",
    matchScore: 85,
    distanceMiles: 4.2
  }
]

// Update job status
PATCH /api/vendor/jobs/:quoteId/status
Authorization: Bearer {token}
Body: { status: "in_progress" }

Response:
{
  success: true,
  message: "Job status updated to: in_progress"
}

// Add private note
POST /api/vendor/jobs/:quoteId/notes
Authorization: Bearer {token}
Body: { note: "Visited site, needs 2 radiators" }

Response:
{
  success: true,
  message: "Note added"
}
```

**Business Rules**:
- Lead fees are NON-REFUNDABLE by default
- Admin can manually issue refunds for fraud/incorrect leads
- Status changes are logged to `lead_acceptance_log`
- Completed/Lost jobs remain visible (historical reference)

---

### 4. Auto-Accept Settings (Advanced Feature)

**Purpose**: Automated lead acceptance for power users (OPTIONAL, OFF by default)

**Warning Display**:
```
⚠️ Important: Automatic Charging
When auto-accept is ON, leads matching your rules will be 
automatically accepted and charged to your wallet. You will 
receive immediate notifications for each auto-accepted lead.
```

**Configuration Options**:

**Global Toggle**:
- ON/OFF switch at top
- When OFF, all rules are ignored
- Confirmation required to enable

**Acceptance Rules**:
1. **Minimum Match Score** (0-100):
   - Only auto-accept leads with score >= this value
   - Example: 70 = accept only well-matched leads

2. **Maximum Lead Fee** (£):
   - Never auto-accept leads costing more than this
   - Example: £10.00 = cap spend per lead

3. **Maximum Distance** (miles):
   - Only accept leads within radius
   - Example: 15 miles from vendor postcode

4. **Job Timeframe**:
   - Options: Any / Urgent only / Within 30 days / Flexible only
   - Filters by customer's required start date

5. **Job Budget Range**:
   - Min/Max customer budget
   - Example: Min £500, Max £5000 = skip tiny jobs and massive projects

**Category-Based Rules**:
- ☑️ Plumbing (auto-accept enabled)
- ☑️ Electrical (auto-accept enabled)
- ☐ Bathroom (auto-accept disabled for this category)
- Allows different rules per trade type

**Spend & Volume Limits**:
- Daily Lead Limit (max leads per day)
- Weekly Lead Limit (max leads per week)
- Daily Spend Cap (£ per day)
- Weekly Spend Cap (£ per week)

**Safety Rules** (Enforced automatically):
- Auto-accept CANNOT bypass:
  - 5-vendor lead cap (platform rule)
  - Wallet balance (insufficient funds = auto-decline)
  - Pricing caps (platform maximums)
  - Vendor availability (if marked unavailable, no auto-accept)

**API Contracts**:

```javascript
// Get current settings
GET /api/vendor/auto-accept-rules
Authorization: Bearer {token}

Response:
{
  enabled: false,
  minMatchScore: 70,
  maxLeadFee: 10.00,
  maxDistance: 15,
  jobTimeframe: "any",
  minJobBudget: 500,
  maxJobBudget: 5000,
  categories: ["plumbing", "electrical"],
  dailyLeadLimit: 5,
  weeklyLeadLimit: 20,
  dailySpendCap: 50.00,
  weeklySpendCap: 200.00
}

// Save settings
POST /api/vendor/auto-accept-rules
Authorization: Bearer {token}
Body: { ...all settings... }

Response:
{
  success: true,
  message: "Auto-accept settings saved"
}
```

**Database Tables**:

```sql
-- Auto-accept rules per vendor
vendor_auto_accept_rules (
  vendor_id INTEGER PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE,
  min_match_score INTEGER,
  max_lead_price DECIMAL(10,2),
  max_distance_miles INTEGER,
  job_timeframe VARCHAR(50),
  min_job_budget INTEGER,
  max_job_budget INTEGER,
  service_categories TEXT[],  -- Array of category names
  daily_lead_limit INTEGER,
  weekly_lead_limit INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Spend limits per vendor
vendor_spend_limits (
  vendor_id INTEGER PRIMARY KEY,
  daily_cap DECIMAL(10,2),
  weekly_cap DECIMAL(10,2),
  monthly_cap DECIMAL(10,2),
  daily_spent DECIMAL(10,2) DEFAULT 0,
  weekly_spent DECIMAL(10,2) DEFAULT 0,
  monthly_spent DECIMAL(10,2) DEFAULT 0,
  last_reset_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Auto-Accept Evaluation Logic** (Backend):
```javascript
// When new lead is distributed:
async function checkAutoAcceptRules(vendorId, lead) {
  // 1. Get vendor's rules
  const rules = await getAutoAcceptRules(vendorId);
  
  if (!rules.enabled) return false;  // Auto-accept OFF
  
  // 2. Check match score
  if (lead.matchScore < rules.minMatchScore) return false;
  
  // 3. Check lead price
  if (lead.leadPrice > rules.maxLeadFee) return false;
  
  // 4. Check distance
  if (lead.distanceMiles > rules.maxDistance) return false;
  
  // 5. Check category
  if (!rules.categories.includes(lead.category)) return false;
  
  // 6. Check budget range
  if (lead.customerBudget < rules.minJobBudget) return false;
  if (lead.customerBudget > rules.maxJobBudget) return false;
  
  // 7. Check daily/weekly limits
  const todaysAccepted = await countTodaysAutoAccepted(vendorId);
  if (todaysAccepted >= rules.dailyLeadLimit) return false;
  
  const todaysSpend = await getTodaysSpend(vendorId);
  if (todaysSpend + lead.leadPrice > rules.dailySpendCap) return false;
  
  // 8. Check wallet balance
  const balance = await getWalletBalance(vendorId);
  if (balance < lead.leadPrice) return false;
  
  // 9. All checks passed - AUTO-ACCEPT
  return true;
}
```

**Notifications**:
- Immediate email when lead auto-accepted
- Email subject: "✅ Lead Auto-Accepted - Action Required"
- Email contains: Full customer details, job info, reminder to contact ASAP

**Admin Controls**:
- Admin can disable auto-accept for specific vendor (abuse prevention)
- Admin can view auto-accept history per vendor
- Admin can see which rules triggered each acceptance

---

### 5. Service Profile (Coming Soon)

**Planned Features**:
- Edit trade categories
- Set service radius (postcode-based coverage)
- Min/max job value preferences
- Availability toggle (Available / Busy / Unavailable)
- Working days and hours
- Upload certifications/insurance docs

---

### 6. Performance & Analytics (Coming Soon)

**Planned Metrics**:
- Leads received vs accepted (chart)
- Spend vs estimated revenue (ROI tracking)
- Conversion rate per job size
- Cost per job won
- Response time trends (faster = better)
- Decline reasons breakdown (pie chart)
- CSV export for all data

---

### 7. Wallet & Billing (Coming Soon)

**Planned Features**:
- Current balance display
- Top-up via Stripe
- Transaction history table
- Weekly/monthly invoices (PDF download)
- Spend limits management
- Refund requests

---

### 8. Notifications (Coming Soon)

**Planned Preferences**:
- Email notifications (ON/OFF per event type)
- Push notifications (browser)
- SMS alerts (optional paid feature)
- Notification frequency (instant / digest)
- Quiet hours (e.g., 10pm - 8am)

---

## 🎨 UI/UX Design Patterns

### Color Scheme
```css
--emerald-500: #10b981  /* Primary actions, success */
--blue-500: #3b82f6     /* Info, premium badges */
--amber-500: #f59e0b    /* Warnings, urgent */
--red-500: #ef4444      /* Decline, errors */
--slate-900: #0f172a    /* Text primary */
--slate-600: #475569    /* Text secondary */
```

### Component Patterns

**Stat Cards**:
- Icon + Value + Label + Trend indicator
- Hover effect (slight shadow)
- Color-coded icons

**Lead Cards**:
- Premium quality = Blue border
- Urgent timeframe = Amber border
- Standard = Gray border
- Match score progress bar (gradient)
- Expiry countdown (amber background)

**Job Cards**:
- Green gradient header
- Sections divided by horizontal lines
- Customer contact in highlighted box
- Action buttons full-width on mobile

**Modals**:
- Centered on screen
- Backdrop blur effect
- Close button (top right)
- Footer with Cancel/Confirm buttons

### Responsive Breakpoints
```css
@media (max-width: 1024px)  /* Tablets */
@media (max-width: 768px)   /* Mobile */
```

**Mobile Optimizations**:
- Sidebar becomes horizontal scrolling nav
- Stats grid becomes single column
- Form rows stack vertically
- Lead actions stack vertically

---

## 🔐 Security & Permissions

### Authentication
- All routes require `authenticateToken` middleware
- Vendor-specific routes require `requireVendor` check
- JWT token stored in localStorage
- Token includes: `userId`, `user_type`, `email`

### Authorization Checks

**Before showing customer details**:
```javascript
// Must check:
1. Vendor has accepted lead (lead_state = 'accepted')
2. Payment has been charged (payment_charged = TRUE)
3. Lead belongs to this vendor (vendor_id = req.user.userId)
```

**Before auto-accepting**:
```javascript
// Must verify:
1. Vendor has auto-accept enabled
2. Wallet balance sufficient
3. All rules criteria met
4. Lead not already at 5-vendor cap
5. Vendor not marked unavailable
```

### Data Privacy

**Lead Preview Stage**:
- Store only: category, area (sector), budget range, timeframe
- Never expose: customer name, phone, email, full postcode, description

**Post-Acceptance Stage**:
- Unlock all fields in database query
- Log access to `lead_acceptance_log`
- Customer details visible only to accepted vendors

### Audit Trail

Every action logged:
```sql
lead_acceptance_log (
  id,
  quote_id,
  vendor_id,
  action,  -- 'preview_email_sent', 'lead_accepted', 'lead_declined', 'job_status_updated', etc.
  details, -- JSON with metadata
  created_at
);
```

---

## 📊 Database Schema

### New Columns in `lead_distributions`
```sql
-- Added in migration 1737670000000
job_status VARCHAR(50),  -- 'contacted', 'quote_sent', 'in_progress', 'completed', 'lost'
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### New Table: `vendor_job_notes`
```sql
CREATE TABLE vendor_job_notes (
  id SERIAL PRIMARY KEY,
  quote_id INTEGER NOT NULL REFERENCES quotes(id),
  vendor_id INTEGER NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_job_notes_vendor ON vendor_job_notes(vendor_id);
CREATE INDEX idx_vendor_job_notes_quote ON vendor_job_notes(quote_id);
```

---

## 🚀 Deployment Checklist

### Frontend
- [x] Upload `vendor-dashboard-enhanced.html` to hosting
- [ ] Update navigation links to new dashboard
- [ ] Test on mobile devices
- [ ] Verify all sections load correctly

### Backend
- [x] Add new routes to `backend/routes/vendor.js`
- [ ] Run database migrations for new columns
- [ ] Create `vendor_job_notes` table
- [ ] Test all API endpoints
- [ ] Add rate limiting to auto-accept endpoint

### Environment Variables
```env
# Required for dashboard
BACKEND_URL=https://tradematch.onrender.com
FRONTEND_URL=https://tradematch.vercel.app
```

### Testing Plan
1. **Overview Section**: Load stats, verify calculations
2. **Lead Inbox**: Create test lead, verify preview hides customer details
3. **Accept Flow**: Accept lead, verify charge, verify details unlocked
4. **Decline Flow**: Decline lead, verify no charge, verify reason saved
5. **Active Jobs**: Update status, add note, verify persistence
6. **Auto-Accept**: Enable rules, distribute lead, verify auto-acceptance
7. **Mobile**: Test all sections on iPhone/Android

---

## 📈 Success Metrics

### Vendor Satisfaction
- **Target**: 90% vendor retention rate
- **Measure**: Monthly active vendors using dashboard
- **Indicator**: Low decline rates, high auto-accept adoption

### Transparency Score
- **Target**: 100% lead pricing visible before acceptance
- **Measure**: Zero complaints about "surprise charges"
- **Indicator**: High trust scores in vendor surveys

### Cost Control
- **Target**: Vendors stay within set spend limits
- **Measure**: Auto-accept never exceeds daily/weekly caps
- **Indicator**: Positive vendor feedback on budget control

### Conversion Performance
- **Target**: 70%+ acceptance rate on offered leads
- **Measure**: accepted_leads / offered_leads ratio
- **Indicator**: High-quality matching algorithm

---

## 🔄 Future Enhancements

### Phase 2 (Next Release)
- [ ] Service Profile editing
- [ ] Performance analytics charts
- [ ] Wallet top-up via Stripe
- [ ] Notification preferences

### Phase 3 (Long-term)
- [ ] Mobile app (React Native)
- [ ] Real-time lead notifications (WebSockets)
- [ ] AI-powered match score predictions
- [ ] Multi-vendor collaboration (team accounts)

---

## 📞 Support & Documentation

### Vendor Help Articles
- "How to Accept a Lead"
- "Understanding Match Scores"
- "Setting Up Auto-Accept Rules"
- "Managing Your Spend Limits"
- "Updating Job Status"

### Admin Documentation
- API Reference (Postman collection)
- Database schema diagrams
- Auto-accept algorithm explained
- Fraud detection guidelines

---

## ✅ Completion Status

**IMPLEMENTED (January 22, 2026)**:
- ✅ Frontend: vendor-dashboard-enhanced.html (8 sections, 2000+ lines)
- ✅ Backend: 7 new API endpoints in vendor.js
- ✅ Overview statistics calculation
- ✅ Lead inbox with preview cards
- ✅ Accepted leads with full customer details
- ✅ Job status tracking
- ✅ Internal notes system
- ✅ Auto-accept settings UI and backend
- ✅ Responsive mobile design
- ✅ Complete API integration
- ✅ Comprehensive documentation

**PENDING**:
- ⏳ Service Profile editor
- ⏳ Performance analytics charts
- ⏳ Wallet top-up integration
- ⏳ Notification preferences UI

**Status**: 🚀 **READY FOR PRODUCTION TESTING**

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0  
**Documentation**: Complete  
**Code Review**: Pending
