# Vendor Dashboard - Quick Start & Testing Guide

## 🚀 Quick Start

### Access the Dashboard
1. Navigate to: `http://localhost:3000/vendor-dashboard-enhanced.html`
2. Login with vendor credentials
3. Dashboard loads with Overview section

### First-Time Setup
1. **Check Wallet Balance**: Top navigation shows current credit balance
2. **Review Overview Stats**: See available leads, active jobs, monthly spend
3. **Visit Lead Inbox**: Click "📬 Lead Inbox" in sidebar
4. **Configure Auto-Accept** (optional): Click "⚙️ Auto-Accept Settings"

---

## 🧪 Testing Checklist

### Test 1: Overview Section ✅
**Steps**:
1. Login as vendor
2. Observe 6 stat cards load
3. Verify Quick Actions buttons are visible

**Expected Results**:
- All stat values load (even if 0)
- Wallet balance displays in top nav
- No console errors

**API Call**:
```
GET /api/vendor/overview
Headers: Authorization: Bearer {token}
```

---

### Test 2: Lead Inbox (Preview Mode) 📬

**Steps**:
1. Create a test quote as customer
2. Ensure quote qualifies (score >= 60)
3. Wait for lead distribution
4. Login as vendor
5. Navigate to Lead Inbox

**Expected Results**:
- Lead card displays with HIDDEN customer details
- Shows: Area (postcode sector), budget, timeframe, match score
- Does NOT show: Customer name, phone, email, full postcode
- Accept & Decline buttons visible
- Expiry countdown shows "23h 59m" format

**Privacy Verification**:
```javascript
// Lead preview should show:
✅ category: "Plumbing"
✅ area: "SW1A 1**"  // Hidden!
✅ budgetRange: "£500"
✅ timeframe: "urgent"
✅ leadPrice: 3.50
✅ matchScore: 82

// Should NOT show:
❌ customerName
❌ customerPhone
❌ customerEmail
❌ fullPostcode
❌ fullDescription
```

---

### Test 3: Accept Lead Flow 💳

**Steps**:
1. From Lead Inbox, click "✅ Accept & Pay £3.50"
2. Modal opens showing payment confirmation
3. Click "Confirm & Pay"
4. Wait for API response

**Expected Results**:
- Modal shows lead price correctly
- After confirmation:
  - Success message appears
  - Wallet balance decreases by lead price
  - Lead card disappears from inbox
  - Lead appears in Active Jobs section
  - Full customer details NOW VISIBLE

**API Call**:
```
POST /api/leads/:quoteId/accept
Headers: Authorization: Bearer {token}
Body: {}

Response:
{
  success: true,
  fullDetails: {
    customerName: "John Smith",  // UNLOCKED!
    customerPhone: "07700900123",  // UNLOCKED!
    customerEmail: "john@example.com",  // UNLOCKED!
    postcode: "SW1A 1AA",  // FULL postcode!
    description: "Full job description..."
  },
  chargedAmount: 3.50,
  transactionId: "txn_abc123"
}
```

**Verification**:
- [ ] Wallet balance updated
- [ ] Lead moved from Inbox to Active Jobs
- [ ] Full customer contact visible
- [ ] Payment transaction logged
- [ ] Email sent to vendor confirming acceptance

---

### Test 4: Decline Lead Flow ❌

**Steps**:
1. From Lead Inbox, click "❌ Decline"
2. Modal opens asking for reason
3. Select "Too far from my area"
4. Click "Decline Lead"

**Expected Results**:
- Reason dropdown shows 6 options
- After confirmation:
  - Success message: "Lead declined (no charge)"
  - Wallet balance UNCHANGED
  - Lead card disappears from inbox
  - Lead NOT in Active Jobs

**API Call**:
```
POST /api/leads/:quoteId/decline
Headers: Authorization: Bearer {token}
Body: { reason: "too_far" }

Response:
{
  success: true,
  message: "Lead declined successfully"
}
```

**Verification**:
- [ ] No charge incurred
- [ ] Decline reason saved to database
- [ ] Lead state updated to 'declined'
- [ ] Lead may be offered to next vendor

---

### Test 5: Active Jobs Section 🔨

**Steps**:
1. Accept a lead (see Test 3)
2. Navigate to "🔨 Active Jobs"
3. Observe job card

**Expected Results**:
- Job card displays with green header
- Customer Contact section shows:
  - ✅ Full name
  - ✅ Full phone
  - ✅ Full email
  - ✅ Full postcode
- Job Details section shows:
  - Budget, timeframe, description
  - Lead fee paid: £3.50
  - Payment transaction reference
- Status update buttons visible
- Internal notes input visible

**API Call**:
```
GET /api/vendor/leads/accepted
Headers: Authorization: Bearer {token}

Response: [
  {
    quoteId: 123,
    category: "Plumbing",
    description: "Boiler installation...",
    budgetRange: "£1000",
    postcode: "SW1A 1AA",  // Full!
    customerName: "John Smith",  // Unlocked!
    customerEmail: "john@example.com",
    customerPhone: "07700900123",
    acceptedAt: "2026-01-22T10:30:00Z",
    leadPrice: 3.50,
    status: "contacted"
  }
]
```

---

### Test 6: Update Job Status 📊

**Steps**:
1. From Active Jobs, click "📞 Contacted" button
2. Wait for status update
3. Refresh page
4. Verify status persisted

**Expected Results**:
- Button shows loading state
- Success message appears
- Job card updates to show "Contacted" badge
- Status persists after page refresh

**API Call**:
```
PATCH /api/vendor/jobs/123/status
Headers: Authorization: Bearer {token}
Body: { status: "contacted" }

Response:
{
  success: true,
  message: "Job status updated to: contacted"
}
```

**Test All Statuses**:
- [ ] Contacted
- [ ] Quote Sent
- [ ] Quote Accepted
- [ ] In Progress
- [ ] Completed
- [ ] Lost

---

### Test 7: Add Job Note 📝

**Steps**:
1. From Active Jobs, type note in input field
2. Example: "Visited site, needs 2 radiators"
3. Click "Add Note"
4. Wait for confirmation

**Expected Results**:
- Input clears after submission
- Success message appears
- Note saved to database (verify in admin panel)

**API Call**:
```
POST /api/vendor/jobs/123/notes
Headers: Authorization: Bearer {token}
Body: { note: "Visited site, needs 2 radiators" }

Response:
{
  success: true,
  message: "Note added"
}
```

---

### Test 8: Auto-Accept Settings ⚙️

**Steps**:
1. Navigate to "⚙️ Auto-Accept Settings"
2. Toggle ON the auto-accept switch
3. Set rules:
   - Min Match Score: 75
   - Max Lead Fee: £8.00
   - Max Distance: 10 miles
   - Select categories: Plumbing, Electrical
   - Daily Lead Limit: 3
   - Daily Spend Cap: £25
4. Click "💾 Save Settings"

**Expected Results**:
- Toggle shows ON state
- Warning box displays (automatic charging notice)
- All form fields populate
- Success message after save
- Settings persist after page refresh

**API Calls**:
```
// Get settings
GET /api/vendor/auto-accept-rules
Headers: Authorization: Bearer {token}

// Save settings
POST /api/vendor/auto-accept-rules
Headers: Authorization: Bearer {token}
Body: {
  enabled: true,
  minMatchScore: 75,
  maxLeadFee: 8.00,
  maxDistance: 10,
  categories: ["plumbing", "electrical"],
  dailyLeadLimit: 3,
  weeklyLeadLimit: 15,
  dailySpendCap: 25.00,
  weeklySpendCap: 100.00
}

Response:
{
  success: true,
  message: "Auto-accept settings saved"
}
```

---

### Test 9: Auto-Accept Functionality (End-to-End) 🤖

**Prerequisites**:
- Vendor has auto-accept enabled
- Rules configured (see Test 8)
- Sufficient wallet balance

**Steps**:
1. Create test quote matching auto-accept rules:
   - Category: "Plumbing" ✅
   - Budget: £600 (within min/max) ✅
   - Match Score: 80 (>= 75) ✅
   - Distance: 5 miles (< 10) ✅
   - Lead Price: £5.00 (< £8.00) ✅
2. Trigger lead distribution
3. Wait for auto-accept logic to run

**Expected Results**:
- Lead automatically accepted WITHOUT manual click
- Wallet charged £5.00
- Email sent: "✅ Lead Auto-Accepted - Action Required"
- Lead appears in Active Jobs (NOT in Inbox)
- Full customer details visible immediately
- Log entry created with action='auto_accepted'

**Verification**:
```sql
-- Check lead_acceptance_log
SELECT * FROM lead_acceptance_log 
WHERE vendor_id = ? 
AND action = 'auto_accepted'
ORDER BY created_at DESC LIMIT 1;

-- Verify details include rule matches
{
  "rules_matched": {
    "matchScore": 80,
    "leadPrice": 5.00,
    "distance": 5,
    "category": "plumbing"
  }
}
```

---

### Test 10: Auto-Accept Safety Limits 🚨

**Test Daily Limit**:
1. Set daily limit: 2 leads
2. Create 3 matching leads
3. Expect: Only 2 auto-accepted, 3rd offered normally

**Test Spend Cap**:
1. Set daily spend: £10
2. Create lead costing £12
3. Expect: NOT auto-accepted (exceeds cap)

**Test Insufficient Balance**:
1. Reduce wallet balance to £1
2. Create lead costing £5
3. Expect: NOT auto-accepted (insufficient funds)

**Test Unavailable Vendor**:
1. Mark vendor as unavailable
2. Create matching lead
3. Expect: NOT auto-accepted (vendor unavailable)

---

## 🐛 Common Issues & Fixes

### Issue 1: "No leads available"
**Cause**: No quotes created OR vendor not in service area
**Fix**: Create test quote with postcode near vendor location

### Issue 2: "Insufficient balance"
**Cause**: Wallet balance too low
**Fix**: Run SQL to add credits:
```sql
UPDATE vendor_credits 
SET balance = balance + 100 
WHERE vendor_id = ?;
```

### Issue 3: Stats showing 0
**Cause**: No historical data
**Fix**: Accept a few test leads to populate stats

### Issue 4: Full customer details not showing
**Cause**: Lead not accepted OR payment not charged
**Fix**: Verify `lead_state = 'accepted'` AND `payment_charged = TRUE`

### Issue 5: Auto-accept not working
**Cause**: Rules too restrictive OR toggle OFF
**Fix**: 
1. Check toggle is ON
2. Lower match score threshold
3. Increase max lead fee
4. Check wallet balance

---

## 📊 Test Data Generator

### Create Test Vendor
```sql
INSERT INTO users (name, email, password, user_type, postcode, phone)
VALUES ('Test Plumber', 'vendor@test.com', 'hashed_password', 'vendor', 'SW1A 1AA', '07700900123');

INSERT INTO vendor_credits (vendor_id, balance)
VALUES (LAST_INSERT_ID(), 100.00);
```

### Create Test Lead (Quote)
```sql
INSERT INTO quotes (user_id, category, service, description, budget, timeframe, postcode)
VALUES (
  1,  -- customer_id
  'Plumbing',
  'Boiler Installation',
  'Need new boiler installed in 3-bedroom house',
  '1000',
  'Within 2 weeks',
  'SW1A 1BB'  -- Near vendor postcode
);
```

### Simulate Lead Distribution
```sql
INSERT INTO lead_distributions (
  quote_id, vendor_id, match_score, distance_miles,
  distribution_order, credits_charged, lead_state,
  expires_at, distributed_at, payment_charged
) VALUES (
  1,  -- quote_id
  2,  -- vendor_id
  85, -- match_score
  4.2, -- distance_miles
  1,  -- distribution_order
  3.50, -- credits_charged
  'offered',
  NOW() + INTERVAL '24 hours',
  NOW(),
  FALSE
);
```

---

## 📝 Testing Checklist Summary

**Critical Path** (Must Test):
- [ ] Overview stats load correctly
- [ ] Lead inbox shows previews with HIDDEN details
- [ ] Accept flow charges wallet and unlocks details
- [ ] Decline flow has NO charge
- [ ] Active jobs show FULL customer contact
- [ ] Job status updates persist
- [ ] Auto-accept settings save correctly

**Extended Testing**:
- [ ] Auto-accept triggers automatically
- [ ] Auto-accept respects daily/weekly limits
- [ ] Auto-accept fails safely (balance/unavailable)
- [ ] Mobile responsive (test on phone)
- [ ] Email notifications sent
- [ ] Internal notes saved

**Edge Cases**:
- [ ] Expired leads removed from inbox
- [ ] Double-click accept doesn't double-charge
- [ ] Concurrent accept by 2 vendors (5-vendor cap)
- [ ] Negative balance handling
- [ ] Very long job descriptions (truncation)

---

## 🎯 Success Criteria

**Dashboard Passes If**:
✅ All sections load without errors
✅ Customer details hidden until acceptance
✅ Payment charged only after manual/auto acceptance
✅ No double-charging
✅ Auto-accept respects all safety limits
✅ Mobile usable on phones
✅ API responses < 500ms
✅ Zero security vulnerabilities (customer data exposure)

---

## 📞 Support

**Questions?** Check:
1. VENDOR-DASHBOARD-COMPLETE.md (full documentation)
2. LEAD-PREVIEW-EMAIL-SYSTEM.md (email integration)
3. backend/routes/vendor.js (API implementation)
4. vendor-dashboard-enhanced.html (frontend code)

**Report Issues**:
- GitHub Issues
- Tag with `vendor-dashboard` label
- Include: Steps to reproduce, expected vs actual result, screenshots

---

**Last Updated**: January 22, 2026  
**Version**: 1.0.0  
**Test Status**: Ready for QA
