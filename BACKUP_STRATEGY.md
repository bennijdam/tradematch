# TradeMatch Database Backup Strategy

## Backup Strategy

### Automatic Backups (Via Neon PostgreSQL)
- **Frequency**: Daily at 2 AM UTC
- **Retention**: 7 days (rolling)
- **Manual Snapshots**: Before major releases
- **Recovery Time Objective (RTO)**: 30 minutes
- **Recovery Point Objective (RPO)**: 24 hours

### Restoration Commands

```bash
# List available backups
neon branches list

# Restore from backup
neon branches restore production-backup-20260315

# Switch app to backup database
export DATABASE_URL="[backup-connection-string]"
npm run start

# Verify data integrity
cd apps/api && node scripts/check-db.js
```

### Disaster Recovery

**Scenario**: Database corruption / accidental deletion

1. **Immediate Response (5 minutes)**
   ```bash
   # Stop API to prevent writes
   pm2 stop tradematch-api
   
   # Notify team
   slack-notify "🚨 Database incident, stopping writes"
   ```

2. **Assessment (10 minutes)**
   ```bash
   # Check last good backup
   neon branches list --latest
   
   # Determine recovery point
   # If < 24 hours: Use automatic backup
   # If > 24 hours: Use manual snapshot
   ```

3. **Restore (15 minutes)**
   ```bash
   # Create new branch from backup
   neon branches create production-recovery --parent=main-backup-latest
   
   # Restore main from backup
   neon branches restore main-backup-latest
   
   # Verify restoration
   psql $DATABASE_URL "SELECT count(*) FROM users"
   ```

4. **Recovery (10 minutes)**
   ```bash
   # Start API with restored DB
   pm2 start tradematch-api
   
   # Run smoke tests
   npm run smoke:suite
   
   # Verify transactions in last hour
   node scripts/verify-recent-transactions.js
   ```

**Total Recovery Time**: 40 minutes (target < 60 minutes)

### Point-in-Time Recovery

For data loss < 24 hours:

```bash
# Get WAL position before data loss
neon pgd create-restore-point --database=neondb

# Restore to point-in-time
neon branches restore --timestamp="2026-03-15 14:30:00"
```

### Verify Backups

```bash
# Monthly restore test (staging)
#!/bin/bash
# restore-test-monthly.sh

# Restore latest backup to staging
date=$(date +%Y%m%d)
neon branches create staging-backup-test-$date --parent=main-backup-latest

# Run tests
cd apps/api && npm run smoke:full

# Report results
if [ $? -eq 0 ]; then
  echo "✅ Backup restoration test passed: $date" >> backup-test.log
else
  echo "❌ Backup restoration test failed: $date" >> backup-test.log
  slack-notify "[CRITICAL] Backup restoration test failed!"
fi
```

## Recovery Testing Schedule
- **Monthly**: Automated restore test on staging
- **Quarterly**: Manual DR drill with DevOps team
- **Annually**: Full disaster recovery simulation

## Documentation
- Restore procedures: This file
- Contact: DevOps team via #production-escalation
- Runbooks: Use [tags]\n\nDONE.md file\nEOF
echo "✅ Backup strategy documented: BACKUP_STRATEGY.md"
ccat BACKUP_STRATEGY.md
