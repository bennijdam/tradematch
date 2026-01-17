# 🔑 Environment Variables - Complete Reference

## 📊 **Where to Add Variables**

| Variable | Render (Backend) | Vercel (Frontend) |
|----------|------------------|-------------------|
| RESEND_API_KEY | ✅ YES | ❌ NO |
| FRONTEND_URL | ✅ YES | ❌ NO |
| DATABASE_URL | ✅ YES | ❌ NO |
| JWT_SECRET | ✅ YES | ❌ NO |
| NODE_ENV | ✅ YES | ❌ NO |

**Simple Rule:** All environment variables go in **Render only** (backend)

**Why?** Frontend is static HTML/JS - doesn't need server-side variables

---

## 🎯 **Render Environment Variables**

### **Required (Must Have):**

```env
# Database
DATABASE_URL=postgresql://user:password@host/database
# (Already set up with Neon)

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-characters
# (Already set up)

# Email Service (NEW - ADD THIS)
RESEND_API_KEY=re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY

# Frontend URL (NEW - ADD THIS)
FRONTEND_URL=https://your-domain.vercel.app
# Replace with your actual Vercel domain
```

### **Optional (Nice to Have):**

```env
# CORS Origins (if different from *)
CORS_ORIGINS=https://your-domain.vercel.app,https://www.your-domain.com

# Node Environment
NODE_ENV=production

# API Base URL (for frontend to call)
BACKEND_URL=https://your-backend.onrender.com
```

---

## 📝 **How to Add to Render**

### **Step-by-Step:**

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com
   - Sign in to your account

2. **Select Your Backend Service:**
   - Click on your TradeMatch backend service
   - (Should be named something like "tradematch-backend")

3. **Open Environment Tab:**
   - Click "Environment" in the left sidebar
   - You'll see existing variables (DATABASE_URL, JWT_SECRET)

4. **Add New Variables:**
   - Click "Add Environment Variable" button
   - For each variable:
     ```
     Key: RESEND_API_KEY
     Value: re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
     ```
   - Click "Add Environment Variable" again
     ```
     Key: FRONTEND_URL
     Value: https://your-domain.vercel.app
     ```
     *(Replace with your actual domain)*

5. **Save Changes:**
   - Click "Save Changes" button at bottom
   - Render will automatically redeploy your service
   - Wait 2-3 minutes for deployment

6. **Verify:**
   - Check "Logs" tab
   - Should see: `✅ Email routes mounted`
   - No error messages

---

## ✅ **Verification Checklist**

After adding variables, verify:

### **In Render Dashboard:**
- [ ] RESEND_API_KEY present
- [ ] FRONTEND_URL present
- [ ] No typos in variable names
- [ ] No extra spaces in values
- [ ] Service redeployed successfully

### **In Logs:**
- [ ] No "undefined" errors
- [ ] Email routes mounted
- [ ] Server starts without errors

### **Test Email:**
```bash
curl -X POST https://your-backend.onrender.com/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "email": "bennijdam@protonmail.com",
    "name": "Test",
    "userType": "customer"
  }'
```

Expected:
```json
{
  "success": true,
  "message": "Welcome email sent",
  "emailId": "re_..."
}
```

---

## 🔐 **Your Credentials**

### **Resend API Key:**
```
re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
```

**What it does:**
- Authenticates your backend with Resend API
- Allows sending transactional emails
- Free tier: 3,000 emails/month

**Security:**
- ✅ Only store in Render (server-side)
- ❌ Never expose in frontend code
- ❌ Never commit to Git

---

### **Frontend URL:**
```
https://your-domain.vercel.app
```

**What it does:**
- Used in email templates for links
- Points users back to your site
- Used for CORS if needed

**Update to Your Domain:**
1. Find your Vercel domain
2. Go to: vercel.com/dashboard
3. Click your project
4. Copy the domain (e.g., `tradematch.vercel.app`)
5. Use full URL: `https://tradematch.vercel.app`

---

## 🚨 **Common Mistakes**

### **Mistake 1: Added to Vercel Instead**
**Problem:** Variables added to Vercel (frontend)
**Fix:** Remove from Vercel, add to Render
**Why:** Frontend doesn't send emails

### **Mistake 2: Wrong Variable Name**
**Problem:** `RESEND_KEY` instead of `RESEND_API_KEY`
**Fix:** Check exact spelling: `RESEND_API_KEY`
**Why:** Code expects exact name

### **Mistake 3: Missing Quotes**
**Problem:** Added quotes around value: `"re_Zgh..."`
**Fix:** No quotes needed: `re_Zgh...`
**Why:** Render adds them automatically

### **Mistake 4: Wrong Frontend URL**
**Problem:** `http://localhost:3000` in production
**Fix:** Use actual Vercel domain
**Why:** Emails will have broken links

### **Mistake 5: Didn't Redeploy**
**Problem:** Added variables but didn't save
**Fix:** Click "Save Changes" button
**Why:** Render needs to restart with new vars

---

## 📧 **Email From Addresses**

Emails will be sent from these addresses:

```javascript
// Welcome emails
from: 'TradeMatch <noreply@tradematch.co.uk>'

// Job notifications
from: 'TradeMatch <jobs@tradematch.co.uk>'

// Bid notifications
from: 'TradeMatch <notifications@tradematch.co.uk>'

// Payments
from: 'TradeMatch <payments@tradematch.co.uk>'

// Reviews
from: 'TradeMatch <reviews@tradematch.co.uk>'
```

**Current Setup:** Using Resend's default domain
**Future:** Can add custom domain for better branding

---

## 🔍 **Troubleshooting**

### **Error: "RESEND_API_KEY is not defined"**

**Check:**
1. Variable added to Render? (Dashboard → Environment)
2. Correct spelling? `RESEND_API_KEY` (exact)
3. Service redeployed? (Save Changes)

**Fix:**
```bash
# In Render Dashboard:
# 1. Environment tab
# 2. Add Environment Variable
# 3. Key: RESEND_API_KEY
# 4. Value: re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
# 5. Save Changes
```

---

### **Error: "Invalid API key"**

**Check:**
1. Correct value? `re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY`
2. No extra spaces? (before or after)
3. No quotes? (shouldn't have `"` or `'`)

**Fix:**
```bash
# Delete variable
# Re-add with exact value:
re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY
```

---

### **Error: "Failed to send email"**

**Check:**
1. Resend package installed? `npm install resend`
2. email.js deployed? (routes/email.js exists)
3. Server restarted? (after npm install)

**Test:**
```bash
# Check Render logs for:
"✅ Email routes mounted"
```

---

## 🎯 **Quick Setup Commands**

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
# Key: RESEND_API_KEY
# Value: re_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY

# Key: FRONTEND_URL
# Value: https://your-domain.vercel.app

# 5. Test
curl -X POST https://your-backend.onrender.com/api/email/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"email":"bennijdam@protonmail.com","name":"Test","userType":"customer"}'
```

---

## ✅ **Final Checklist**

- [ ] Resend package installed (`npm install resend`)
- [ ] email.js deployed to routes/
- [ ] RESEND_API_KEY in Render environment
- [ ] FRONTEND_URL in Render environment
- [ ] Service redeployed after changes
- [ ] Test email sent successfully
- [ ] Email received in inbox
- [ ] HTML formatting looks good
- [ ] Links in email work

**When all checked:** Email system is fully functional! ✅

---

## 📞 **Support**

If you need help:

1. **Check Render logs:**
   - Dashboard → Service → Logs tab
   - Look for error messages

2. **Test with curl:**
   ```bash
   curl -X POST https://your-backend.onrender.com/api/health
   # Should return: {"status":"ok"}
   ```

3. **Check Resend dashboard:**
   - Visit: resend.com/emails
   - See delivery status

4. **Common fixes:**
   - Redeploy service
   - Clear Render cache
   - Re-add environment variables

---

**Summary:**
- 2 variables to add to Render
- 0 variables to add to Vercel
- 3 minutes to set up
- Unlimited emails (3,000/month free)

**Ready!** ✅
