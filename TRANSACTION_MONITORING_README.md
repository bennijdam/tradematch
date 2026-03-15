# Transaction Monitoring README

## Transaction Monitoring Setup

### Purpose
Monitor first 1000 transactions for patterns in production environment.

### Scripts Created
- `scripts/analyze-transaction-patterns.js` - Pattern analysis script
- `KPIS.md` - KPI definitions and SQL queries

### How to Execute (Production Environment)
```bash
# Set DB password in environment
cd apps/api && export DATABASE_PWD="your-production-password"

# Run pattern analysis
node scripts/analyze-transaction-patterns.js > logs/transaction-patterns-$(date +%Y%m%d).log

# Monitor ongoing (cron daily)
crontab -e
# Add: 0 3 * * * cd /home/user/tradematch-fixed && node scripts/analyze-transaction-patterns.js >> logs/transaction-patterns-$(date +%Y%m%d).log 2>&1
```

### Expected Output
```javascript
📊 Analyzing first 1000 transaction patterns...
PATTERN 1: Quote Submission by Hour
Hour 9: 45 quotes
Hour 10: 52 quotes
Hour 14: 38 quotes
...
PATTERN 2: Quote Conversion by Trade Type
Plumber: 150 submitted, 23 accepted (15.33%)
Electrician: 120 submitted, 15 accepted (12.5%)
...
PATTERN 3: Average Vendor Response Time
Average: 247 seconds (4 minutes 7 seconds)
...
PATTERN 4: Top Performing Postcodes
1. SW1A: 87 quotes, avg score 78
2. EC2A: 72 quotes, avg score 82
...
```

### Monitoring Dashboard
Once sufficient data collected, run:
```bash
node scripts/generate-transaction-dashboard.js logs/transaction-patterns-*.log
```

This will create `reports/transaction-dashboard.html` with visualizations.

### KPI Tracking
Key metrics to track (from KPI_METRICS.md):
1. Quote conversion rate (target: >15%)
2. Vendor acceptance rate (target: >20%)
3. Average response time (target: <5 minutes)
4. Revenue per quote (target: >£150)

### Alerts
Configure alerts when:
- Conversion rate drops below 10% (CRITICAL)
- Acceptance rate drops below 15% (WARNING)
- Response time exceeds 10 minutes (HIGH)

### Expected Timeline
- Day 1-7: Initial pattern baseline
- Day 8-30: Pattern validation
- Day 31+: Trend analysis

**Script Status**: ✅ Created and ready
**Execution**: 📝 Requires production database access
**Database Credentials**: 🔐 Not available in sandbox (secure)
EOF
cat TRANSACTION_MONITORING_README.md
