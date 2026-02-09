# Server Migration Guide

## Overview

We've created an enhanced production-ready server (`server-production.js`) with all security features, logging, and best practices. This guide explains how to integrate it.

## What's New in server-production.js

### Security Enhancements
- ✅ Helmet.js for security headers
- ✅ Strict CORS configuration (production whitelist)
- ✅ Rate limiting (general + auth-specific)
- ✅ Enhanced error handling
- ✅ Input validation improvements

### Logging & Monitoring
- ✅ Winston structured logging
- ✅ Separate error and combined logs
- ✅ Request/response logging
- ✅ Environment-aware logging (console in dev, file in prod)

### Reliability
- ✅ Graceful shutdown handling
- ✅ Database connection retry logic
- ✅ Better error messages
- ✅ Health check enhancements

## Migration Options

### Option 1: Replace Existing Server (Recommended)

```bash
cd backend
cp server.js server-backup.js
cp server-production.js server.js
```

**Pros:**
- Clean migration
- All new features immediately active
- Easier to maintain

**Cons:**
- Need to backup old server
- Need to test thoroughly

### Option 2: Run Side-by-Side

Keep both servers and switch via environment variable:

**package.json:**
```json
{
  "scripts": {
    "start": "node server.js",
    "start:prod": "node server-production.js",
    "dev": "nodemon server.js"
  }
}
```

**Pros:**
- Can switch back quickly
- Test in production safely

**Cons:**
- More files to maintain
- Potential confusion

### Option 3: Merge Features

Manually add features from server-production.js into your existing server.js:

1. Add helmet:
```javascript
const helmet = require('helmet');
app.use(helmet({...}));
```

2. Add rate limiting:
```javascript
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({...});
app.use('/api/auth', authLimiter);
```

3. Add Winston logging:
```javascript
const logger = require('./config/logger');
logger.info('Server started');
```

## Required Dependencies

Ensure these are in package.json:

```json
{
  "dependencies": {
    "helmet": "^8.0.0",
    "winston": "^3.17.0",
    "express-rate-limit": "^8.2.1"  // Already installed
  }
}
```

Install:
```bash
cd backend
npm install helmet winston
```

## Configuration Changes

### 1. Update render.yaml

Already done! The `render.yaml` now includes:
- All environment variables
- Stripe webhook secret
- Resend API key
- OpenAI API key

### 2. Create logs directory

```bash
cd backend
mkdir -p logs
```

Add to .gitignore:
```
logs/
*.log
```

### 3. Environment Variables

Ensure these are set in Render:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- All secrets (already documented)

## Testing Before Deployment

### 1. Test Locally

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with test values

# Test with production server
node server-production.js

# In another terminal
curl http://localhost:3001/api/health
```

### 2. Test Security Features

```bash
# Test rate limiting (should block after 5 attempts)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# Test CORS (should be blocked in production)
curl -H "Origin: http://evil.com" http://localhost:3001/api/health
```

### 3. Test Logging

```bash
# Check logs are created
ls backend/logs/
# Should see: error.log, combined.log

# View logs
tail -f backend/logs/combined.log
```

## Deployment Steps

### Step 1: Update package.json

```bash
cd backend
npm install helmet winston
```

### Step 2: Decide on Migration Strategy

**Recommended (Option 1):**
```bash
cp server.js server-backup.js
cp server-production.js server.js
```

### Step 3: Commit and Push

```bash
git add .
git commit -m "Add production-ready server with security enhancements"
git push origin main
```

### Step 4: Monitor Deployment

1. Go to https://dashboard.render.com
2. Watch build logs
3. Verify deployment succeeds
4. Check health endpoint

### Step 5: Verify in Production

```bash
# Health check
curl https://your-backend.onrender.com/api/health

# Check logs in Render dashboard
# Should see Winston formatted logs
```

## Webhook Integration

The enhanced server needs webhook routes added. You have two options:

### Option A: Add to server-production.js

Add before the 404 handler:

```javascript
// Import webhook router
const webhookRouter = require('./routes/webhooks');
webhookRouter.setPool(pool);

// Mount webhook router (BEFORE express.json())
app.post('/api/webhooks/stripe', 
  express.raw({ type: 'application/json' }), 
  webhookRouter
);
```

### Option B: Use Separate File

The webhook router is already created in `routes/webhooks.js`. Just import it in server-production.js:

```javascript
// Add near top with other requires
const webhookRouter = require('./routes/webhooks');

// Add before express.json() middleware
app.use('/api/webhooks', webhookRouter);
webhookRouter.setPool(pool);
```

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
cd backend
cp server-backup.js server.js
git add server.js
git commit -m "Rollback to previous server"
git push origin main
```

### Via Git
```bash
git revert HEAD
git push origin main
```

## Monitoring After Migration

### First Hour
- [ ] Check logs every 5 minutes
- [ ] Monitor error rate
- [ ] Test critical endpoints

### First Day
- [ ] Check logs every hour
- [ ] Monitor error patterns
- [ ] Verify security headers
- [ ] Check rate limiting works

### First Week
- [ ] Daily log review
- [ ] Performance monitoring
- [ ] User feedback collection

## Troubleshooting

### "Cannot find module 'helmet'"
```bash
cd backend
npm install helmet winston
```

### "Logs directory not found"
```bash
mkdir -p backend/logs
```

### "Rate limiting too strict"
Edit server-production.js:
```javascript
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Increase from 5
    // ...
});
```

### "CORS blocking legitimate requests"
Check CORS_ORIGINS environment variable:
```bash
# In Render dashboard
CORS_ORIGINS=https://www.tradematch.uk,https://tradematch.uk
```

## Next Steps

After successful migration:

1. **Set up monitoring**
   - Configure UptimeRobot
   - Set up error alerts
   - Enable Render metrics

2. **Configure error tracking**
   - Set up Sentry (optional)
   - Add SENTRY_DSN to environment

3. **Performance optimization**
   - Monitor response times
   - Optimize database queries
   - Add caching if needed

4. **Security hardening**
   - Regular dependency updates
   - Security audit schedule
   - Penetration testing (optional)

## Recommended Timeline

- **Day 1**: Install dependencies, test locally
- **Day 2**: Deploy to staging, run tests
- **Day 3**: Monitor staging, fix issues
- **Day 4**: Deploy to production
- **Day 5-7**: Monitor and optimize

## Support

- See [DEPLOYMENT.md](DEPLOYMENT.md) for full guide
- Check [PRODUCTION-CHECKLIST.md](PRODUCTION-CHECKLIST.md) for tasks
- Review [QUICK-REFERENCE.md](QUICK-REFERENCE.md) for commands

---

**Status**: Ready for Migration  
**Risk Level**: Low (with proper testing)  
**Estimated Time**: 2-4 hours including testing
