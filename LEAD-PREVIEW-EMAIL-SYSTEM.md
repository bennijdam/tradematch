# Lead Preview Email System - Implementation Complete ✅

## Overview
Implemented ethical "Hidden Lead Preview + Accept" email notification system that sends preview emails to matched vendors instead of auto-charging them.

## Business Model
- ✅ **Preview Mode**: Vendors receive limited info (area, category, budget - NO customer contact)
- ✅ **Vendor Control**: Accept/Decline buttons in email
- ✅ **Fair Pricing**: Payment charged ONLY after acceptance
- ✅ **Transparency**: Lead price, quality score, and match details shown upfront
- ✅ **24-Hour Expiration**: Vendors have 24h to accept before lead expires
- ✅ **Limited Distribution**: Max 5 vendors per lead (vs MyBuilder unlimited)

---

## Files Modified

### 1. **backend/routes/email.js** (Added 178 lines)

#### New Email Template: `leadPreview()`
Professional email template with:
- **Hidden Customer Details**: Shows postcode sector (e.g., "SW1A 1**"), not full address
- **Preview Information**:
  - 📍 Area (postcode sector)
  - 🔧 Service category
  - 💰 Budget range
  - ⏱️ Timeframe
  - ⭐ Quality score + tier badge (Premium/Standard/Basic)
- **Lead Pricing**: Transparent display of £X.XX lead cost
- **Privacy Notice**: "Customer contact details hidden until you accept"
- **24-Hour Countdown**: Visual expiration timer
- **Action Buttons**:
  - ✅ Green "Accept Lead & Pay" button (links to vendor dashboard with action=accept)
  - ❌ Red "Decline (No Charge)" button (links to vendor dashboard with action=decline)
- **What Happens Next** section explaining accept/decline/expire outcomes
- **Pro Tip Box**: Encourages early response for better conversion

**Design Features**:
- Green gradient header (#16A34A brand color)
- Responsive HTML (mobile-friendly)
- Premium/Standard quality badges with color coding
- Clear pricing display with "charged only after accept" notice
- Trust-building messaging throughout

#### New API Endpoint: `POST /api/email/lead-preview-notification`
```javascript
// Request body:
{
  vendorId: number,
  vendorEmail: string,
  quoteId: number,
  leadPrice: number,
  matchScore: number,
  preview: {
    category: string,
    area: string (hidden sector),
    budgetRange: string,
    timeframe: string,
    qualityScore: number,
    qualityTier: 'premium'|'standard'|'basic'
  }
}

// Response:
{
  success: true,
  message: "Lead preview notification sent",
  emailId: "resend_xyz123",
  vendorName: "John's Plumbing",
  preview: {...}
}
```

**Features**:
- Validates all required fields (vendorId, email, quoteId, leadPrice, preview)
- Fetches vendor name from database
- Sends via Resend API with "leads@tradematch.co.uk" sender
- Logs notification to `lead_acceptance_log` table with action='preview_email_sent'
- Returns emailId for tracking
- Error handling with detailed logging

---

### 2. **backend/services/lead-distribution.service.js** (Added 95 lines)

#### Updated: `recordDistribution()` Method
**Previous Behavior** (Auto-Charge Model):
```javascript
// OLD: Immediate credit deduction
await deductCredits(vendorId, leadCost);
console.log("Lead charged to vendor");
```

**New Behavior** (Preview-Accept Model):
```javascript
// NEW: Offer lead (no charge), send preview email
lead_state = 'offered'
payment_charged = FALSE
expires_at = NOW() + 24 hours

// Generate preview with hidden customer details
const preview = {
  category: quote.category,
  area: hidePostcode(quote.postcode), // "SW1A 1**"
  budgetRange: `£${quote.budget}`,
  timeframe: quote.timeframe,
  qualityScore: vendor.matchScore,
  qualityTier: getQualityTier(matchScore)
};

// Send preview email via HTTP to /api/email/lead-preview-notification
await axios.post('/api/email/lead-preview-notification', {...});
```

**New Helper Methods**:

1. **`hidePostcode(postcode)`**
   - Input: `"SW1A 1AA"`
   - Output: `"SW1A 1**"` (hides unit/building)
   - Purpose: Protect customer privacy until vendor accepts

2. **`getQualityTier(score)`**
   - Score >= 85: `"premium"` (high-value lead)
   - Score >= 70: `"standard"` (normal lead)
   - Score < 70: `"basic"` (lower-quality lead)
   - Purpose: Visual badge in email (Premium = blue, Standard = purple)

**Integration Flow**:
1. `distributeLead()` finds 5 best-matched vendors
2. For each vendor → calls `recordDistribution()`
3. `recordDistribution()` creates database record with `lead_state='offered'`
4. Fetches vendor email from database
5. Generates preview object (hidden customer details)
6. Sends HTTP POST to email service
7. Email service sends Resend notification
8. Logs action to audit trail
9. Returns distribution record

**Error Handling**:
- If email fails → logs warning but continues (lead still offered)
- Distribution not blocked by email failures
- Vendor can still see lead in dashboard even if email fails

**Dependencies Added**:
```javascript
const axios = require('axios'); // For HTTP requests to email service
```

---

## Database Integration

### lead_acceptance_log Table
New entries created for email tracking:
```sql
INSERT INTO lead_acceptance_log 
(quote_id, vendor_id, action, details)
VALUES (
  123, 
  456, 
  'preview_email_sent',
  '{"emailId": "resend_abc123", "leadPrice": 3.50, "sentTo": "vendor@example.com"}'
);
```

### lead_distributions Table
Preview mode entries:
```sql
-- When lead is offered (NOT charged yet)
lead_state = 'offered'
payment_charged = FALSE
expires_at = NOW() + INTERVAL '24 hours'
distributed_at = NOW()
credits_charged = 0 (not charged until accepted)
```

---

## Email Flow Diagram

```
Quote Created
    ↓
Lead Qualification (min score 60/100)
    ↓
Lead Pricing (£1.50 - £12.00)
    ↓
Smart Vendor Matching (distance + specialty + performance)
    ↓
Select Top 5 Vendors
    ↓
FOR EACH VENDOR:
    ├─ Insert into lead_distributions (state='offered')
    ├─ Generate preview (hide customer contact)
    ├─ Send POST /api/email/lead-preview-notification
    │   ├─ Fetch vendor name from DB
    │   ├─ Generate email template
    │   ├─ Send via Resend API
    │   └─ Log to lead_acceptance_log
    └─ Vendor receives email with Accept/Decline buttons
    
VENDOR OPTIONS:
    ├─ ✅ ACCEPT → Charge credits → Unlock full details
    ├─ ❌ DECLINE → No charge → Lead offered to backup vendor
    └─ ⏰ EXPIRE (24h) → No charge → Lead auto-expired
```

---

## Environment Variables Required

Add to `.env`:
```env
# Backend URL for internal service-to-service calls
BACKEND_URL=http://localhost:5000

# Frontend URL for email button links
FRONTEND_URL=http://localhost:3000

# Resend API Key (already exists)
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

---

## Testing Checklist

### 1. Email Template Test
```bash
# Test email sending directly
curl -X POST http://localhost:5000/api/email/lead-preview-notification \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": 123,
    "vendorEmail": "test@example.com",
    "quoteId": 456,
    "leadPrice": 3.50,
    "matchScore": 82,
    "preview": {
      "category": "Plumbing",
      "area": "SW1A 1**",
      "budgetRange": "£500-£1000",
      "timeframe": "Within 2 weeks",
      "qualityScore": 82,
      "qualityTier": "premium"
    }
  }'
```

**Expected Result**:
- Email sent to `test@example.com`
- Subject: "💼 New Lead Available - Plumbing in SW1A 1**"
- Email contains Accept/Decline buttons
- Preview shows hidden postcode
- Entry added to lead_acceptance_log

### 2. End-to-End Lead Distribution Test
```bash
# Create a test quote
curl -X POST http://localhost:5000/api/quotes/create \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Electrical",
    "postcode": "M1 1AA",
    "budget": "1000",
    "timeframe": "urgent",
    "description": "Rewiring needed",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "07700900123"
  }'
```

**Expected Flow**:
1. Quote created → Lead qualification runs
2. Scores >= 60 → Lead pricing calculates £X.XX
3. Smart matching finds 5 vendors in M1 area with "Electrical" service
4. Each vendor receives:
   - Database record in lead_distributions (state='offered')
   - Preview email to their registered email
   - 24-hour expiration timer starts
5. Vendors see "New Lead Available" in their inbox
6. Accept button links to: `/vendor-dashboard.html?action=accept&lead=456`
7. Decline button links to: `/vendor-dashboard.html?action=decline&lead=456`

### 3. Preview Data Validation
```javascript
// Verify customer details are HIDDEN in preview
const preview = {
  area: "M1 1**", // ✅ Hidden (not "M1 1AA")
  category: "Electrical", // ✅ Visible
  budgetRange: "£1000", // ✅ Visible
  timeframe: "urgent", // ✅ Visible
  qualityScore: 78, // ✅ Visible
  // ❌ NO customerName
  // ❌ NO customerEmail
  // ❌ NO customerPhone
  // ❌ NO full description
};
```

### 4. Email Deliverability Test
- [ ] Email arrives in inbox (not spam)
- [ ] Accept button renders correctly
- [ ] Decline button renders correctly
- [ ] Links point to correct URLs
- [ ] Mobile responsive (test on phone)
- [ ] Images/badges display correctly
- [ ] Green/red button colors show properly

---

## Next Steps (Vendor Dashboard UI)

### Required Frontend Updates

#### 1. Add "Offered Leads" Section to vendor-dashboard.html
```html
<!-- New section above existing bids -->
<section id="offered-leads">
  <h2>💼 Leads Waiting for Your Response</h2>
  <div id="offered-leads-list">
    <!-- Populated via GET /api/leads/offered -->
  </div>
</section>
```

#### 2. JavaScript to Handle Accept/Decline
```javascript
// Check URL params for action=accept or action=decline
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('action') === 'accept') {
  const leadId = urlParams.get('lead');
  await acceptLead(leadId);
}

async function acceptLead(quoteId) {
  const response = await fetch(`/api/leads/${quoteId}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    const data = await response.json();
    // Show success modal with full customer details unlocked
    showLeadDetails(data.fullDetails);
  }
}
```

#### 3. Lead Preview Cards
Display each offered lead as a card with:
- Service category badge
- Area (hidden postcode)
- Budget range
- Timeframe
- Quality score
- Match score
- Lead price
- Expiration countdown (24h timer)
- Accept/Decline buttons

---

## Security Considerations

### ✅ Implemented
- Customer contact details hidden until acceptance
- Postcode obfuscated to sector level
- Vendor must have sufficient credits before accepting
- Atomic transactions (check → charge → unlock)
- Audit trail in lead_acceptance_log
- Email validation (vendor must exist in database)

### ⚠️ TODO
- Add CAPTCHA to prevent automated lead sniping
- Rate limit Accept/Decline endpoints (max 10 per minute)
- Add 2FA for high-value lead acceptance (>£50)
- Implement IP logging for fraud detection

---

## Performance Optimizations

### Current
- Email sending is async (doesn't block distribution)
- Failed emails logged but don't stop lead offering
- Single HTTP call per vendor (batching not needed for 5 vendors)

### Future Improvements
- **Batch Email Sending**: Send all 5 preview emails in one Resend API call
- **Queue System**: Use Bull/Redis for background email sending
- **Caching**: Cache vendor email addresses (reduce DB queries)
- **CDN**: Host email images on CDN for faster loading

---

## Monitoring & Analytics

### Metrics to Track
1. **Email Deliverability**:
   - Sent count
   - Delivered count (via Resend webhooks)
   - Bounced/failed count
   - Open rate
   - Click rate (Accept/Decline buttons)

2. **Vendor Response**:
   - Time to first response (avg)
   - Accept rate per vendor
   - Decline rate + reasons
   - Expiration rate (leads not responded to)

3. **Lead Quality**:
   - Acceptance rate by quality tier (Premium vs Standard)
   - Revenue per lead type
   - Vendor satisfaction scores

### Logging Added
```javascript
console.log(`📧 Preview email sent to ${vendorName} (${vendorEmail})`);
console.log(`📨 Lead ${quoteId} offered to vendor ${vendorId} (£${leadCost}, expires in 24h)`);
console.error(`⚠️ Failed to send preview email to vendor ${vendorId}:`, err.message);
```

---

## Success Criteria ✅

- [x] Email template created with hidden customer details
- [x] Accept/Decline CTAs implemented
- [x] Lead price transparency (show before charging)
- [x] 24-hour expiration notice
- [x] Quality tier badges (Premium/Standard/Basic)
- [x] Professional brand-aligned design
- [x] Mobile-responsive HTML
- [x] Email endpoint with validation
- [x] Integration with lead distribution service
- [x] Audit logging (lead_acceptance_log)
- [x] Error handling (email failures don't block distribution)
- [x] Privacy protection (postcode hiding)

---

## Comparison: Old vs New Model

| Feature | OLD (Auto-Charge) | NEW (Preview-Accept) |
|---------|------------------|---------------------|
| **Vendor Notified** | After charge | Before charge |
| **Customer Details** | Immediately visible | Hidden until accept |
| **Payment Timing** | Auto-deducted | Only after acceptance |
| **Vendor Control** | None (forced charge) | Full (Accept/Decline) |
| **Transparency** | Low (surprise charges) | High (price shown upfront) |
| **Refund Policy** | Required for unwanted leads | Not needed (no auto-charge) |
| **Vendor Trust** | Low (forced purchases) | High (opt-in model) |
| **Ethics Score** | ❌ Predatory | ✅ Fair & transparent |

---

## Deployment Notes

### Pre-Deployment
1. Verify `BACKEND_URL` and `FRONTEND_URL` in production .env
2. Test email sending with real Resend API key
3. Ensure vendor emails are verified in database
4. Create sample test vendors for QA

### Post-Deployment
1. Monitor email logs in Render dashboard
2. Check Resend dashboard for delivery rates
3. Watch for "Failed to send preview email" errors
4. Verify lead_acceptance_log entries are created

### Rollback Plan
If issues occur:
1. Revert lead-distribution.service.js to previous version (remove email sending)
2. Leads will still be offered to vendors (no emails sent)
3. Vendors can still access via dashboard API
4. Fix email issues and redeploy

---

## Documentation Links

- Email Template: [backend/routes/email.js](backend/routes/email.js) (Line 19-185)
- Email Endpoint: [backend/routes/email.js](backend/routes/email.js) (Line 662-738)
- Distribution Service: [backend/services/lead-distribution.service.js](backend/services/lead-distribution.service.js) (Line 320-417)
- Lead Acceptance API: [backend/routes/leads.js](backend/routes/leads.js) (Line 180-350)
- Database Schema: [backend/migrations/1737670000000_update-lead-acceptance-model.sql](backend/migrations/1737670000000_update-lead-acceptance-model.sql)

---

**Status**: ✅ **COMPLETE & READY FOR TESTING**

**Next Task**: Update vendor dashboard UI to display offered leads and handle Accept/Decline actions from email links.
