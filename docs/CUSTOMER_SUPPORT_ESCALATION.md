# TradeMatch Customer Support Escalation Runbook

## 🚨 LEVEL 1: Customer Issues (Support Team)

### Common Issues & Immediate Actions

#### 1.1 Customer Cannot Login
**Symptoms**: Login button unresponsive, error "Invalid credentials"
**Immediate Actions**:
- Verify email exists: `SELECT email FROM users WHERE email = ?`
- Check if account is active: `SELECT active FROM users WHERE email = ?`
- Reset password: Guide to reset password flow
- If 2+ failed attempts: Advise to clear cookies/cache

**Escalation**: Escalate to Level 2 if after 3 failed password reset attempts

#### 1.2 Customer Not Receiving Quote Notifications
**Symptoms**: Quote submitted but no vendor notifications
**Immediate Actions**:
- Verify email was sent: Check `email_notifications` table
- Check Resend logs: `SELECT * FROM email_notifications WHERE user_id = ?`
- Verify email address format: Check for typos
- Check spam folder (common issue)

**Escalation**: Escalate to Level 2 if email confirmed sent but not received

#### 1.3 Vendor Cannot Submit Quote
**Symptoms**: "Bid submission failed" error
**Immediate Actions**:
- Check if vendor is verified: `SELECT verified FROM vendors WHERE id = ?`
- Check credit balance: `SELECT balance FROM vendor_credits WHERE vendor_id = ?`
- Verify bid amount > minimum: `SELECT minimum_bid FROM vendor_credits`

**Escalalation**: Escalate to Level 2 if balance sufficient but still failing

## 🚨 LEVEL 2: Technical Issues (DevOps/Senior Engineer)

### Escalation Criteria
- Level 1 cannot resolve after 3 attempts
- Error rates > 5% sustained for 5 minutes
- Payment processing failures
- Database connection errors
- WebSocket connection drops > 10 connections

### Level 2 Response SLA
- **Response Time**: 15 minutes
- **Time to Resolve**: 2 hours
- **Severity Assessment**: Determine if Level 3 needed

### Common Level 2 Issues

#### 2.1 Database Connection Pool Exhaustion
**Symptoms**: `error: no connections available in pool`
**Immediate Actions**:
- Check active connections: `SELECT count(*) FROM pg_stat_activity`
- List slow queries: `SELECT query, calls, mean_exec_time FROM pg_stat_statements WHERE mean_exec_time > 1000 ORDER BY mean_exec_time DESC LIMIT 10`
- Restart API gracefully: `pm2 restart tradematch-api`
- If still failing → Escalate to Level 3

**Time to Resolve**: 30 minutes

#### 2.2 Email Delivery Failures
**Symptoms**: Bounce rate > 10%, customer reports delayed emails
**Immediate Actions**:
- Check Resend API status: curl https://status.resend.com
- Check last 100 emails: `SELECT status, error_message FROM email_notifications WHERE created_at > NOW() - INTERVAL '1 hour'`
- If quota exceeded: Temporarily enable email throttling
- If API down → Escalate to Level 3

**Time to Resolve**: 45 minutes

#### 2.3 Redis Pub/Sub Issues
**Symptoms**: WebSocket messages not delivering, missing real-time updates
**Immediate Actions**:
- Check Redis connectivity: `redis-cli ping`
- Check pub/sub channels: `redis-cli PUBSUB CHANNELS` (should show tradematch:*)
- Check memory usage: `redis-cli INFO memory`
- If memory > 80% → Restart Redis + Clear cache
- If pub/sub channels missing → Restart WebSocket service

**Time to Resolve**: 20 minutes

#### 2.4 Payment Processing Failures
**Symptoms**: Stripe webhook not processing, payments stuck
**Immediate Actions**:
- Check Stripe webhook logs: `SELECT * FROM webhooks WHERE type='stripe' AND created_at > NOW() - INTERVAL '1 hour'`
- Check Stripe API status: status.stripe.com
- Verify webhook endpoint is reachable: `curl -X POST https://api.tradematch.uk/api/webhooks/stripe -d '{"test": true}'`
- If webhook handshake failing → Escalate to Level 3

**Time to Resolve**: 60 minutes

## 🚨 LEVEL 3: Critical Issues (Platform Lead + DevOps Team Lead)

### Escalation Criteria
- Level 2 cannot resolve after 2 hours
- Error rate > 20% sustained
- Database corruption detected
- Security breach/fraud detected
- Payment gateway completely down
- Multiple services failing simultaneously

### Level 3 Response SLA
- **Response Time**: 5 minutes (pager alert)
- **Time to Resolve**: Variable (could be hours)
- **War Room**: #production-escalation Slack channel
- **Rollback Decision**: Platform Lead authorization

### Common Level 3 Issues

#### 3.1 Full Database Restore Required
**Symptoms**: Data corruption, backups needed
**Actions**:
1. Stop API immediately: `pm2 stop tradematch-api`
2. Identify restore point
  - If < 24 hours: Neon point-in-time recovery
  - If > 24 hours: Restore from last snapshot
3. Execute restore: `neon branches restore main-backup-latest`
4. Verify restoration: `node scripts/verify-database-restore.js`
5. Start API: `pm2 start tradematch-api`
6. Run full smoke test: `npm run smoke:full`
7. Notify all users: Broadcast messaging

**Rollback Authorization**: Required from Platform Lead
**Time to Resolve**: 40-60 minutes

#### 3.2 Security Breach
**Symptoms**: Unauthorized access detected, user data compromised, suspicious transactions
**Actions**:
1. **Immediate**: Stop API and lock database
2. **Assessment**: Determine scope of breach
   - Check audit_logs for unauthorized access
   - Check for suspicious transactions
   - Run security audit via `npm run test:security`
3. **Containment**: Revoke compromised credentials, force password resets
4. **Investigation**: Work with security team
5. **Communication**: Prepare user notification per GDPR breach protocols
6. **Post-incident**: Implement additional security measures

**Authorization**: CTO approval for user notification
**Time to Resolve**: 4-24 hours (investigation dependent)

#### 3.3 Total System Failure
**Symptoms**: API completely down, database unreachable, multiple services failing
**Actions**:
1. **Declare incident**: Page on-call engineer
2. **Assessment**: Identify scope of failure
3. **Recovery**: Follow EMERGENCY_ROLLBACK_PROCEDURES.md
4. **Communication**: Status page updates every 15 minutes

**Authorization**: CTO authorization for status page messaging
**Time to Resolve**: 30-90 minutes

## 📞 CONTACT INFORMATION

### Level 1 (Support)
- **Email**: support@tradematch.uk
- **Hours**: Mon-Fri 9am-5pm
- **Response**: 2 hours

### Level 2 (DevOps/Senior Engineer)
- **Email**: devops@tradematch.uk
- **Phone**: +44 20 7946 0958
- **Hours**: 24/7 on-call
- **Response**: 15 minutes

### Level 3 (Platform Lead)
- **Email**: tradematchuk@googlemail.com
- **Phone**: +44 77 1234 5678 (pager)
- **Response**: 5 minutes

## 📝 ESCALATION PROCESS

```
┌─────────────────┐
│ Customer Report │
└────────┬────────┘
         │
         ▼
┌────────────────────┐
│ Level 1 (Support) │ ◄─ SLA: 2 hours
└────────┬───────────┘
         │ 3 failed attempts
         ▼
┌──────────────────────────┐
│ Level 2 (DevOps/Senior) │ ◄─ SLA: 15 minutes
└───────────┬──────────────┘
            │ 2 hours unresolved
            ▼
┌──────────────────────────┐
│ Level 3 (Platform Lead) │ ◄─ Pager: 5 minutes
└──────────────────────────┘
```

**Escalation Criteria**:
- Any issue affecting >10 users
- Any payment processing issue
- Any data loss or corruption concern
- Any security or fraud concern

## 📡 MONITORING & ALERTING

**Level 2+ Escalation Triggers**:
- Error rate > 5% → Slack alert to #production-alerts
- Database CPU > 80% → Slack alert
- Redis memory > 80% → Slack alert
- Payment webhook failures > 3 → Pager alert
- WebSocket connections > 40 → Pager alert

## 📝 DOCUMENTATION TEMPLATES

### Issue Log Template
```markdown
## Issue #[NUMBER]
- **Reported**: YYYY-MM-DD HH:MM UTC
- **Level**: 1 / 2 / 3
- **Status**: Open / In Progress / Resolved
- **Summary**: [Brief description]
- **Actions**: [What was tried]
- **Time to Resolve**: HH:MM
- **Follow-up**: [Any actionable items]
```

### Post-mortem Template
```markdown
## Incident Report #[NUMBER]
- **Date**: YYYY-MM-DD
- **Severity**: High / Medium / Low
- **Duration**: HH:MM
- **Root Cause**: [Detailed analysis]
- **Resolution**: [What was done]
- **Prevention**: [Steps to prevent]
- **Lessons Learned**: [Takeaways]
```
