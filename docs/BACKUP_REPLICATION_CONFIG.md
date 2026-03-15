# TradeMatch Backup Replication Configuration

## Neon PostgreSQL Backup Configuration

### Automatic Backup Schedule
- **Frequency**: Daily at 2:00 AM UTC
- **Type**: Full database snapshot
- **Retention**: 7 rolling days + 1 monthly
- **Deduplication**: Incremental backups daily

### Point-in-Time Recovery (PITR)
- **Enabled**: Yes
- **Time Window**: 24 hours
- **WAL Archives**: Retain 7 days
- **Recovery Time**: RTO < 30 minutes
- **Recovery Point**: RPO < 24 hours

### Backup Verification
```bash
# List current backups
neon backups list --branch main

# Check last backup status
neon backups show latest

# Create manual snapshot before deployment
neon branches create pre-deploy-$(date +%Y%m%d) --parent main

# Restore point-in-time
neon branches restore --timestamp="2026-03-15 14:30:00 UTC"
```

### Disaster Recovery Testing
- Schedule: Monthly
- Test restore to staging
- Verify data integrity
- Document RTO/RPO

### Configuration
```bash
export NEON_BACKUP_RETENTION="7d"  # Days
export NEON_BACKUP_STORAGE="us-east-1"
export NEON_WAL_ARCHIVE_ENABLED="true"
```

### Monitoring Backup Health
Alerts configured for:
- Backup failures
- Storage capacity >80%  
- Recovery test failures
- Point-in-time recovery gaps
