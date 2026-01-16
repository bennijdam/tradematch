# 🚀 Render Environment Variables Setup

## Required Environment Variables for TradeMatch Backend

Copy and paste these into your Render dashboard → Environment section:

```
DATABASE_URL=your_neon_database_url_here
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRY=7d
CORS_ORIGINS=https://tradematch.vercel.app,http://localhost:3000
```

## Instructions:

1. **Go to Render Dashboard**
   - Navigate to your TradeMatch backend service
   - Click "Environment" tab

2. **Add Environment Variables**
   - Click "Add Environment Variable"
   - Copy each variable above

3. **Replace Placeholders:**
   - `your_neon_database_url_here` → Your actual Neon database URL
   - `your_super_secret_jwt_key_at_least_32_characters_long` → Generate a secure random string

4. **Save and Redeploy**
   - Click "Save Changes"
   - Render will automatically redeploy with new variables

## Important Notes:

- **DATABASE_URL**: Get from Neon dashboard → Connection Details
- **JWT_SECRET**: Use something like `openssl rand -base64 32` to generate
- **CORS_ORIGINS**: Already configured for your Vercel domain
- **JWT_EXPIRY**: 7 days is good balance between security and UX

## After Setup:

1. Test health endpoint: `https://tradematch.onrender.com/api/health`
2. Test full integration: `https://tradematch.vercel.app/api-test.html`
3. Verify registration and quote submission work