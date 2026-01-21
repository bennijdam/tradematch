# TradeMatch Backend Deployment Guide

## Quick Deploy to Render (5 minutes)

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### 2. Deploy on Render
1. Go to [render.com](https://render.com)
2. Click "New+" → "Web Service"
3. Connect your GitHub repository
4. Select `tradematch-fixed/backend` as root directory
5. Configure:
   - **Name**: `tradematch-api`
   - **Runtime**: `Node 20`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` (to start)

### 3. Add Database
1. In Render dashboard: "New+" → "PostgreSQL"
2. **Name**: `tradematch-db`
3. **Database Name**: `tradematch`
4. **User**: `tradematch_user`
5. **Plan**: `Free` (to start)

### 4. Environment Variables (Required!)
In your web service settings, add these:

**Essential:**
```
NODE_ENV=production
DATABASE_URL=[from database connection string]
CORS_ORIGINS=https://www.tradematch.uk,https://tradematch.uk
JWT_SECRET=[generate random string]
```

**OAuth:**
```
GOOGLE_CLIENT_ID=[your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[your Google OAuth secret]
MICROSOFT_CLIENT_ID=[your Microsoft app ID]
MICROSOFT_CLIENT_SECRET=[your Microsoft app secret]
```

**AI Features:**
```
CLAUDE_API_KEY=[your Anthropic API key]
```

### 5. Test Deployment
```bash
# Test health endpoint
curl https://tradematch-api.onrender.com/api/health

# Should return:
{
  "status": "ok",
  "database": "connected"
}
```

### 6. Update Frontend (if needed)
The frontend already points to `https://tradematch-api.onrender.com` in production mode.

## Troubleshooting

**Backend not responding?**
- Check Render dashboard logs
- Verify DATABASE_URL is set correctly
- Ensure Node.js version matches (20.x)

**OAuth not working?**
- Verify redirect URLs in Google/Microsoft console:
  - `https://tradematch-api.onrender.com/auth/google/callback`
  - `https://tradematch-api.onrender.com/auth/microsoft/callback`

**Database errors?**
- Check database is connected in Render dashboard
- Run migrations if needed

## Status Check Commands
```bash
# Check current status
curl https://tradematch-api.onrender.com/
curl https://tradematch-api.onrender.com/api/health
```

The backend will be live at: `https://tradematch-api.onrender.com`