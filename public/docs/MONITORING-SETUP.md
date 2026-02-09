# TradeMatch Monitoring Setup Guide

## Overview

This guide covers setting up comprehensive monitoring for TradeMatch production infrastructure.

**Last Updated:** January 22, 2026  
**Status:** Production Ready

---

## 1. UptimeRobot (Uptime Monitoring) - FREE ✅

**Purpose:** Monitor backend API availability with automated alerts

### Setup Steps:

1. **Create Account:**
   - Go to https://uptimerobot.com
   - Sign up for free account (50 monitors, 5-minute checks)

2. **Add Monitor:**
   - Click "Add New Monitor"
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** TradeMatch API Health
   - **URL:** `https://tradematch.onrender.com/api/health`
   - **Monitoring Interval:** 5 minutes (free tier)
   - **Monitor Timeout:** 30 seconds
   - Click "Create Monitor"

3. **Configure Alert Contacts:**
   - Go to "My Settings" → "Alert Contacts"
   - Add email: tradematchuk@gmail.com
   - Verify email address
   - **Alert When:** Down & Up

4. **Optional - Add SMS Alerts:**
   - Upgrade to Pro ($7/month) for SMS alerts
   - Add phone number in Alert Contacts

5. **Response Time Monitoring:**
   - UptimeRobot automatically tracks response times
   - View graphs in Monitor dashboard

### Expected Results:
- ✅ Health endpoint should return 200 OK
- ✅ Response time: < 500ms (Render cold start may take 5-10s)
- ✅ Alert via email if down for > 5 minutes

---

## 2. Render Built-in Metrics ✅

**Purpose:** Monitor backend server performance, CPU, memory, requests

### Available Metrics:

1. **Access Metrics Dashboard:**
   - Go to https://dashboard.render.com
   - Select "tradematch" service
   - Click "Metrics" tab

2. **Default Metrics (Free Tier):**
   - **CPU Usage:** % of allocated CPU
   - **Memory Usage:** RAM consumption (MB)
   - **Bandwidth:** Network traffic in/out
   - **Requests:** HTTP request count
   - **Instance Events:** Deploys, restarts, crashes

3. **Set Up Render Notifications:**
   - Go to Account Settings → Notifications
   - Enable email notifications for:
     - Deploy failures
     - Service crashes
     - Health check failures

4. **Health Check Configuration:**
   - Render automatically monitors `/health` if configured
   - Already set up in `render.yaml`:
     ```yaml
     healthCheckPath: /api/health
     ```

### Monitoring Dashboard:
- **URL:** https://dashboard.render.com/web/[your-service-id]
- **Check:** Daily for unusual spikes or errors

---

## 3. Vercel Analytics ✅

**Purpose:** Monitor frontend performance, page views, Web Vitals

### Setup Steps:

1. **Enable Vercel Analytics:**
   - Go to https://vercel.com/dashboard
   - Select "tradematch" project
   - Navigate to "Analytics" tab
   - Click "Enable Analytics" (Free tier: 2,500 events/month)

2. **Available Metrics (Free Tier):**
   - **Page Views:** Traffic to www.tradematch.uk
   - **Top Pages:** Most visited pages
   - **Referrers:** Traffic sources
   - **Unique Visitors:** Daily/weekly counts

3. **Web Vitals (Paid - Optional):**
   - Upgrade to Pro ($20/month) for:
     - Core Web Vitals (LCP, FID, CLS)
     - Real User Monitoring (RUM)
     - Performance insights

4. **Deployment Notifications:**
   - Go to Project Settings → Integrations
   - Connect Slack or email for deploy notifications

### Dashboard Access:
- **URL:** https://vercel.com/[username]/tradematch/analytics
- **Review:** Weekly for traffic trends

---

## 4. Sentry Error Tracking (Optional) 🔧

**Purpose:** Real-time error tracking and debugging

### Setup (Optional):

1. **Create Sentry Account:**
   - Go to https://sentry.io
   - Sign up for free (5,000 events/month)

2. **Create Project:**
   - Platform: Node.js (backend) + JavaScript (frontend)
   - Get DSN (Data Source Name)

3. **Install Sentry SDK:**
   ```bash
   cd backend
   npm install @sentry/node @sentry/profiling-node
   ```

4. **Configure Backend (server-fixed.js):**
   ```javascript
   const Sentry = require("@sentry/node");
   
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV || 'production',
     tracesSampleRate: 0.1,
   });
   
   // Add Sentry error handler BEFORE other error handlers
   app.use(Sentry.Handlers.errorHandler());
   ```

5. **Add SENTRY_DSN to Render:**
   - Copy DSN from Sentry dashboard
   - Add as environment variable in Render

6. **Frontend Integration:**
   ```html
   <script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
   <script>
     Sentry.init({ dsn: 'YOUR_FRONTEND_DSN' });
   </script>
   ```

### Benefits:
- Real-time error alerts
- Stack traces for debugging
- Performance monitoring
- User impact analysis

**Status:** Optional - Defer to post-launch if needed

---

## 5. Database Monitoring (Neon) ✅

**Purpose:** Monitor PostgreSQL performance and query times

### Available in Neon Dashboard:

1. **Access Neon Dashboard:**
   - Go to https://neon.tech
   - Select your project

2. **Built-in Metrics:**
   - **Connection Count:** Active database connections
   - **Query Performance:** Slow query logs
   - **Storage Usage:** Database size
   - **Compute Time:** Billable compute hours

3. **Monitoring:**
   - Monitor connection pooling (current pool size: 10 max)
   - Check for connection leaks
   - Review slow queries (> 1s execution time)

4. **Alerts:**
   - Neon sends email alerts for:
     - Storage limits (approaching quota)
     - Compute hour warnings
     - Connection failures

---

## 6. Email Delivery Monitoring (Resend) ✅

**Purpose:** Track email delivery rates and failures

### Resend Dashboard:

1. **Access Dashboard:**
   - Go to https://resend.com/emails
   - View sent emails

2. **Metrics Available:**
   - **Sent:** Total emails sent
   - **Delivered:** Successfully delivered
   - **Opens:** Email open rate (if tracking enabled)
   - **Bounces:** Failed deliveries
   - **Spam Complaints:** User-reported spam

3. **Webhooks (Optional):**
   - Set up webhooks for:
     - `email.delivered`
     - `email.bounced`
     - `email.complained`
   - Endpoint: `https://tradematch.onrender.com/api/webhooks/resend`

4. **Review Schedule:**
   - Check daily for first week
   - Weekly after stabilization

---

## 7. Custom Health Monitoring Script 🔧

**Purpose:** Automated health checks from local machine or CI/CD

### Create Health Check Script:

```powershell
# health-check.ps1
$endpoints = @(
    @{ Name = "Backend Health"; Url = "https://tradematch.onrender.com/api/health" },
    @{ Name = "Frontend"; Url = "https://www.tradematch.uk" }
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($endpoint.Name): OK" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $($endpoint.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ $($endpoint.Name): FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

**Run:** Daily or as needed

---

## 8. Log Aggregation (Optional) 📊

**Purpose:** Centralized log management

### Options:

1. **Render Logs (Built-in):**
   - Access via Render Dashboard → Logs tab
   - Real-time streaming logs
   - Last 7 days retained (free tier)

2. **LogDNA / Mezmo (Paid):**
   - $30/month for 10GB logs
   - Advanced search and filtering

3. **CloudWatch (AWS):**
   - If using AWS services
   - Integrate via log forwarding

**Current Setup:** Using Render built-in logs (sufficient for MVP)

---

## Monitoring Checklist Summary

### Immediate Setup (Free, < 15 minutes):
- [x] UptimeRobot: Health endpoint monitoring
- [x] Render Metrics: Enabled by default
- [x] Vercel Analytics: Enable in dashboard
- [x] Neon Monitoring: Available in dashboard
- [x] Resend Dashboard: Email tracking active

### Optional (Post-Launch):
- [ ] Sentry error tracking ($0 - $26/month)
- [ ] SMS alerts for UptimeRobot ($7/month)
- [ ] Vercel Web Vitals ($20/month)
- [ ] Advanced log aggregation (LogDNA, etc.)

### Daily Monitoring Routine (First Week):
1. Check UptimeRobot status (2 min)
2. Review Render metrics for errors (3 min)
3. Check Vercel analytics for traffic (2 min)
4. Review Resend email delivery (2 min)
5. Scan Render logs for exceptions (3 min)

**Total Time:** ~12 minutes/day

### Weekly Routine (After Stabilization):
1. Review uptime percentage (target: 99.9%)
2. Check performance trends
3. Verify email deliverability
4. Database performance review
5. Security audit (failed login attempts, etc.)

**Total Time:** ~30 minutes/week

---

## Alert Escalation

### Severity Levels:

1. **CRITICAL (Immediate Action):**
   - Backend down > 5 minutes
   - Database connection failures
   - Payment processing errors
   - **Action:** Investigate immediately, check Render logs

2. **HIGH (Action within 1 hour):**
   - Email delivery failures > 10%
   - API response time > 2s
   - Error rate > 5%
   - **Action:** Review logs, identify root cause

3. **MEDIUM (Action within 24 hours):**
   - Increased resource usage (CPU > 80%)
   - Slow queries (> 500ms)
   - **Action:** Optimize queries, scale if needed

4. **LOW (Monitor):**
   - Traffic spikes (expected growth)
   - Minor email bounces
   - **Action:** Note in monitoring log

### Incident Response:
1. Acknowledge alert
2. Check Render logs
3. Verify database connectivity
4. Check related services (Neon, Resend)
5. Apply fix or rollback
6. Document incident

---

## Monitoring URLs Quick Reference

| Service | Dashboard URL | Credentials |
|---------|---------------|-------------|
| **UptimeRobot** | https://uptimerobot.com/dashboard | Create new account |
| **Render** | https://dashboard.render.com | Existing account |
| **Vercel** | https://vercel.com/dashboard | Existing account |
| **Neon** | https://console.neon.tech | Existing account |
| **Resend** | https://resend.com/emails | Existing account |
| **Stripe** | https://dashboard.stripe.com | Existing account |

---

## Success Metrics

### Week 1 Targets:
- ✅ Uptime: > 99% (allowing for initial issues)
- ✅ Response Time: < 1s average
- ✅ Email Delivery: > 95%
- ✅ Error Rate: < 5%

### Month 1 Targets:
- ✅ Uptime: 99.9%
- ✅ Response Time: < 500ms average
- ✅ Email Delivery: > 98%
- ✅ Error Rate: < 1%

---

**Setup Status:** Ready for production monitoring  
**Estimated Setup Time:** 15 minutes (free tier services)  
**Monthly Cost:** $0 (free tier sufficient for MVP)
