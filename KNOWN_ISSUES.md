# TradeMatch Known Issues & Workarounds

**Last Updated**: 2026-03-15  
**Total Issues Tracked**: 0 (production stable)

## ACTIVE ISSUES

### None Currently
Production deployment is stable with no active critical issues.

## RESOLVED ISSUES

### 1. EPIPE Broken Pipe Error ✅ Fixed
- **Issue**: Fatal crash when console output stream closed
- **Symptom**: `Error: EPIPE: broken pipe, write`
- **Root Cause**: Winston console transport didn't handle EPIPE errors
- **Fix Applied**: Added error handler in `apps/api/config/logger.js` (lines 34-58)
- **Test**: Verified with logger test script
- **Status**: ✅ RESOLVED

### 2. Superadmin Email CC ✅ Configured
- **Issue**: VETTING_ADMIN_EMAIL not set in .env
- **Symptom**: `❌ VETTING_ADMIN_EMAIL not set` in verification
- **Fix Applied**: Added `VETTING_ADMIN_EMAIL=tradematchuk@googlemail.com` to .env
- **Test**: Verified with `node scripts/verify-superadmin-cc.js`
- **Status**: ✅ RESOLVED

## POTENTIAL ISSUES TO MONITOR

### Performance Under Load
- **Scenario**: 100+ concurrent quote submissions
- **Risk**: Connection pool exhaustion
- **Mitigation**: Split pools (HTTP:15, WebSocket:30) implemented
- **Monitoring**: Error rate >1% triggers alert
- **Action**: Scale Redis replica if pub/sub latency >500ms

### Email Delivery Bounces
- **Scenario**: Resend API daily limit (1000 emails)
- **Risk**: Bounce rate >5% impacts sender reputation
- **Mitigation**: Upgraded to production tier, monitoring active
- **Monitoring**: Sentry alerts on bounce events
- **Action**: Upgrade to paid Resend plan if approaching limit

### WebSocket Connection Stability
- **Scenario**: Mobile network drops, reconnections
- **Risk**: Socket leak, memory issues
- **Mitigation**: Implemented heartbeat, 30s keepalive
- **Monitoring**: WebSocket pool active connections alert
- **Action**: Restart service if connections >40 [CRITICAL]

## WORKAROUNDS

### Redis Connection Retry
If Redis connection fails:
1. Check REDIS_URL in .env: `grep REDIS_URL .env.local`
2. Restart Redis: `redis-server --daemonize yes`
3. Restart API: `npm run start`

### Database Connection Pool Exhaustion
If `error: no connections available`:
1. Check active connections: `SELECT count(*) FROM pg_stat_activity`
2. If >40: Investigate slow queries
3. Restart API to clear pool: `npm run start`

### Email Delivery Delay
If review reminder emails delayed:
1. Check Resend API status: https://status.resend.com
2. Verify RESEND_API_KEY: `cat .env | grep RESEND`
3. Check queue: `node scripts/check-email-queue.js`

## MONITORING ALERTS

```bash
# Error rate alert (errors > 1%)
node scripts/error-rate-monitor.js

# Daily health check (cron at 2am)
./scripts/health-check-daily.sh

# Redis monitoring
cd apps/api && node -e "require('dotenv').config(); const redis = require('redis'); /*...*/"
```

## REPORTING NEW ISSUES

Template:
```markdown
## [NEW/Issue Title]
- **Severity**: [Critical/High/Medium/Low]
- **Environment**: [Production/Staging/Development]
- **Symptom**: [What user sees]
- **Steps**: [To reproduce]
- **Workaround**: [Temporary fix]
- **Fix ETA**: [Timeline]
```
