# TradeMatch Emergency Rollback Procedures

## ⚠️ WHEN TO ROLLBACK

Rollback when production shows:
- Error rate > 5% for >5 minutes
- Database corruption detected
- Critical payment processing failures
- Compromised security

## 🔄 ROLLBACK STEPS

### 1. Assessment (1 minute)
```bash
# Check error rate
curl -s https://api.tradematch.uk/api/health | jq .error_rate

# Check error logs
cd apps/api && tail -100 logs/error.log | grep -i "error\|fatal" | wc -l
```

### 2. Inform Team (2 minutes)
```bash
# Notify stakeholders
echo "🔴 [$(date)] Production rollback initiated" | slack-notify-team
```

### 3. Database Rollback (5 minutes)
```bash
# If needed, restore from snapshot
neon branches restore main-backup
# OR rollback migrations if schema issue
npm run migrate:rollback
```

### 4. Application Rollback (3 minutes)
```bash
# Switch to previous deployment
git checkout main~1
npm run deploy:render
```

### 5. Verify Rollback (5 minutes)
```bash
# Wait for new deployment
sleep 60
npm run smoke:suite  # Verify core functions
```

### 6. Document Incident (10 minutes)
```bash
echo "Rollback: $(date), Reason: $ERROR, Duration: 16 minutes" >> rollback-log.txt
```

## 📞 EMERGENCY CONTACTS

- **DevOps Lead**: devops@tradematch.uk
- **Database Admin**: +44 20 7946 0958
- **Platform Lead**: Available 24/7 via Slack #production-escalation

**Rollback Target**: <20 minutes total
**Recovery Time Objective (RTO)**: 30 minutes
