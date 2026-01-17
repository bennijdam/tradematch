# 📧 Resend Email Setup Guide

## 🎯 **Why Resend?**

✅ **Built for developers** - Simple API, no complex SMTP setup
✅ **High deliverability** - 99%+ inbox delivery rate
✅ **Free tier generous** - 100 emails/day, 3,000/month
✅ **Better than Gmail** - No app passwords, no 2FA hassle
✅ **Professional** - Send from your own domain
✅ **Reliable** - Built for transactional emails

---

## 🔑 **Environment Variables**

### **What You Have:**
```
RESEND_API_KEY=re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
```

### **Where to Add:**

#### **RENDER (Backend) - YES** ✅
**Required:** Backend sends emails, so it needs the API key

**Steps:**
1. Go to https://dashboard.render.com
2. Select your backend service
3. Click "Environment" tab
4. Click "Add Environment Variable"
5. Add:
   ```
   Key: RESEND_API_KEY
   Value: re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
   ```
6. Also add:
   ```
   Key: FRONTEND_URL
   Value: https://your-domain.vercel.app
   ```
7. Click "Save Changes" (auto-redeploys)

#### **VERCEL (Frontend) - NO** ❌
**Not needed:** Frontend doesn't send emails directly

---

## 📦 **Installation**

### **1. Install Resend Package**
```bash
cd backend
npm install resend
```

### **2. Add to package.json**
Your `backend/package.json` should include:
```json
{
  "dependencies": {
    "resend": "^3.0.0",
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5"
  }
}
```

### **3. Deploy Email Route**
```bash
# Copy new email.js (with Resend)
copy complete-fix\backend\email-resend.js backend\routes\email.js

# Deploy
git add backend/routes/email.js backend/package.json
git commit -m "Add: Resend email integration"
git push origin main
```

---

## 🎨 **Updated Tech Stack**

### **Frontend:**
- HTML5, CSS3, JavaScript
- Glass morphism design
- FontAwesome icons
- Vercel (hosting)

### **Backend:**
- Node.js + Express
- PostgreSQL (Neon)
- JWT authentication
- Express rate limiting
- **Resend (email service)** ← NEW
- Render (hosting)

### **Services:**
- Vercel (frontend hosting)
- Render (backend hosting)
- Neon (PostgreSQL database)
- **Resend (transactional emails)** ← NEW

---

## 📧 **Email Endpoints Available**

### **1. Welcome Email** (POST /api/email/welcome)
```javascript
{
  "email": "user@example.com",
  "name": "John Doe",
  "userType": "customer" // or "vendor"
}
```

**Triggers:**
- After registration (customer or vendor)
- Different templates for each user type

**Features:**
- Branded HTML template
- Call-to-action button
- Links to dashboard
- Help center links

---

### **2. New Quote Notification** (POST /api/email/new-quote-notification)
```javascript
{
  "quoteId": 123,
  "postcode": "SW1A",
  "service": "Extension"
}
```

**Triggers:**
- When customer creates a new quote
- Sent to vendors in same postcode area
- Only vendors who offer that service

**Features:**
- Location-based targeting
- Service-specific filtering
- Multiple recipients
- Job details included

---

### **3. New Bid Notification** (POST /api/email/new-bid-notification)
```javascript
{
  "customerId": 456,
  "quoteId": 123,
  "bidAmount": 5000,
  "vendorName": "ABC Builders"
}
```

**Triggers:**
- When vendor submits a bid
- Sent to quote owner (customer)

**Features:**
- Shows bid amount prominently
- Link to view full proposal
- Vendor name and details
- Action button

---

### **4. Payment Confirmation** (POST /api/email/payment-confirmation)
```javascript
{
  "customerId": 456,
  "amount": 5000,
  "reference": "PAY-123456",
  "vendorName": "ABC Builders"
}
```

**Triggers:**
- After successful payment
- Money held in escrow

**Features:**
- Payment amount highlighted
- Reference number
- Escrow protection info
- Next steps explained

---

### **5. Review Reminder** (POST /api/email/review-reminder)
```javascript
{
  "customerId": 456,
  "vendorName": "ABC Builders",
  "quoteId": 123
}
```

**Triggers:**
- 7 days after job completion
- Only if no review left yet

**Features:**
- Friendly request
- Easy review link
- Explains importance
- One-click action

---

### **6. General Send** (POST /api/email/send)
```javascript
{
  "to": "user@example.com",
  "subject": "Your Subject",
  "html": "<p>Your HTML content</p>"
}
```

**Use For:**
- Custom notifications
- Admin messages
- Special announcements

---

## 🧪 **Testing Emails**

### **Test 1: Welcome Email (Customer)**
```bash
curl -X POST https://your-backend.onrender.com/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "bennijdam@protonmail.com",
    "name": "Test Customer",
    "userType": "customer"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Welcome email sent",
  "emailId": "re_..."
}
```

**Expected Email:**
- Subject: "🎉 Welcome to TradeMatch!"
- From: TradeMatch <noreply@tradematch.co.uk>
- To: bennijdam@protonmail.com
- HTML formatted with green theme
- Dashboard button included

---

### **Test 2: Welcome Email (Vendor)**
```bash
curl -X POST https://your-backend.onrender.com/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "bennijdam@protonmail.com",
    "name": "ABC Builders Ltd",
    "userType": "vendor"
  }'
```

**Expected Email:**
- Subject: "🚀 Welcome to TradeMatch - Start Winning Jobs!"
- Different content from customer email
- Link to vendor dashboard
- Pro tips included

---

### **Test 3: New Bid Notification**
```bash
curl -X POST https://your-backend.onrender.com/api/email/new-bid-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "quoteId": 1,
    "bidAmount": 5000,
    "vendorName": "ABC Builders"
  }'
```

**Expected Email:**
- Subject: "💰 New Bid Received - £5,000"
- Shows bid amount prominently
- Link to view proposal
- Action button

---

### **Test 4: Quote Notification (Multiple Vendors)**
```bash
curl -X POST https://your-backend.onrender.com/api/email/new-quote-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "quoteId": 1,
    "postcode": "SW1A 1AA",
    "service": "Extension"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notified 5 vendors",
  "emailsSent": [
    {"email": "vendor1@example.com", "id": "re_..."},
    {"email": "vendor2@example.com", "id": "re_..."}
  ]
}
```

**Emails Sent To:**
- All vendors with postcode starting "SW1"
- Who offer "Extension" service
- Each gets personalized email

---

## 🎨 **Email Templates**

### **Design Features:**
- ✅ Responsive HTML (works on all devices)
- ✅ TradeMatch branding (green theme)
- ✅ Professional layout
- ✅ Clear call-to-action buttons
- ✅ Footer with help links
- ✅ Optimized for Gmail, Outlook, Apple Mail

### **Color Scheme:**
- Primary: #16A34A (emerald green)
- Secondary: #15803D (dark green)
- Background: #f9f9f9
- Text: #333333

### **Email Types:**
1. **Welcome (Customer)** - Dashboard link, feature list
2. **Welcome (Vendor)** - Job board link, pro tips
3. **New Bid** - Bid amount, vendor info, review link
4. **Quote Notification** - Job details, location, bid button
5. **Payment** - Amount, reference, escrow info
6. **Review** - Request feedback, review link

---

## ✅ **Verification Checklist**

After deploying:

### **Environment Variables:**
- [ ] RESEND_API_KEY added to Render
- [ ] FRONTEND_URL added to Render
- [ ] Service redeployed

### **Package Installation:**
- [ ] `resend` in package.json
- [ ] npm install completed
- [ ] No module errors in logs

### **Email Route:**
- [ ] email.js deployed
- [ ] Routes mounted (check logs)
- [ ] No syntax errors

### **Email Tests:**
- [ ] Welcome email (customer) sends
- [ ] Welcome email (vendor) sends
- [ ] Bid notification sends
- [ ] Payment confirmation sends
- [ ] HTML formatting looks good
- [ ] Links work correctly

### **Render Logs:**
Should see:
```
✅ Email routes mounted
Email from: TradeMatch <noreply@tradematch.co.uk>
Email sent successfully: re_...
```

---

## 🚨 **Troubleshooting**

### **Issue: "Module 'resend' not found"**

**Fix:**
```bash
cd backend
npm install resend
git add package.json package-lock.json
git push origin main
```

---

### **Issue: "Invalid API key"**

**Check:**
1. RESEND_API_KEY in Render environment
2. Correct value: `re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY`
3. No extra spaces
4. Service redeployed after adding

**Fix:**
```bash
# Render Dashboard → Environment
# Delete and re-add RESEND_API_KEY
# Save Changes (redeploys)
```

---

### **Issue: "Email not received"**

**Check:**
1. Spam/junk folder
2. Email address correct
3. Resend dashboard (resend.com/emails)
4. Check delivery status

**Test:**
```bash
# Send test to your email
curl -X POST https://your-backend.onrender.com/api/email/send \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "bennijdam@protonmail.com",
    "subject": "Test Email",
    "html": "<h1>Hello from TradeMatch!</h1>"
  }'
```

---

### **Issue: "From address not verified"**

**Current Setup:**
Using Resend's default sender: `onboarding@resend.dev`

**To Use Custom Domain:**
1. Add domain in Resend dashboard
2. Add DNS records
3. Verify domain
4. Update `from:` in email.js:
   ```javascript
   from: 'TradeMatch <noreply@yourdomain.com>'
   ```

**For Now:** Use default (works fine for testing)

---

## 📊 **Resend Limits**

### **Free Tier:**
- ✅ 100 emails per day
- ✅ 3,000 emails per month
- ✅ All features included
- ✅ No credit card required

### **Paid Tier (if needed later):**
- $20/month for 50,000 emails
- Analytics dashboard
- Custom domains
- Priority support

**For MVP:** Free tier is perfect! ✅

---

## 🎯 **Integration with Registration**

### **Auto-send Welcome Email:**

In `routes/auth.js`, after registration:

```javascript
// After creating user
const { email, name, user_type } = newUser;

// Send welcome email
try {
  await fetch(`${process.env.BACKEND_URL}/api/email/welcome`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ email, name, userType: user_type })
  });
} catch (err) {
  console.error('Failed to send welcome email:', err);
  // Don't fail registration if email fails
}
```

### **Auto-send Bid Notification:**

In `routes/bids.js`, after creating bid:

```javascript
// After bid created
const customerId = quote.user_id;
const vendorName = vendor.company_name || vendor.name;

// Notify customer
try {
  await fetch(`${process.env.BACKEND_URL}/api/email/new-bid-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      customerId, 
      quoteId, 
      bidAmount, 
      vendorName 
    })
  });
} catch (err) {
  console.error('Failed to send bid notification:', err);
}
```

---

## 🚀 **Quick Start Commands**

```bash
# 1. Install Resend
cd backend
npm install resend

# 2. Copy email route
copy complete-fix\backend\email-resend.js routes\email.js

# 3. Deploy
git add .
git commit -m "Add: Resend email integration"
git push origin main

# 4. Add to Render (via Dashboard):
# RESEND_API_KEY = re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
# FRONTEND_URL = https://your-domain.vercel.app

# 5. Test
curl -X POST https://your-backend.onrender.com/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"email":"bennijdam@protonmail.com","name":"Test","userType":"customer"}'

# 6. Check inbox!
```

---

## ✅ **Success Criteria**

When working correctly:

1. **Registration:**
   - User registers
   - Welcome email sent automatically
   - Email received within seconds
   - HTML formatting perfect

2. **Bid Placement:**
   - Vendor submits bid
   - Customer gets email notification
   - Shows bid amount
   - Link to dashboard works

3. **Quote Creation:**
   - Customer creates quote
   - Multiple vendors notified
   - Location-based targeting
   - Service filtering works

4. **Payment:**
   - Payment processed
   - Confirmation email sent
   - Reference number included
   - Escrow info explained

**All emails:**
- ✅ Professional HTML design
- ✅ TradeMatch branding
- ✅ Working links
- ✅ Mobile responsive
- ✅ Inbox delivery (not spam)

---

## 🎉 **Advantages Over Gmail**

| Feature | Gmail SMTP | Resend |
|---------|-----------|---------|
| Setup | Complex (2FA, app password) | Simple (API key) |
| Code | 50+ lines SMTP config | 5 lines |
| Reliability | Rate limits, blocks | 99%+ delivery |
| From Address | Your Gmail | Your domain |
| Daily Limit | 100-500 | 3,000 |
| Deliverability | Good | Excellent |
| Professional | No | Yes |

**Result:** Resend is perfect for TradeMatch! ✨

---

**Ready to deploy!** 🚀
