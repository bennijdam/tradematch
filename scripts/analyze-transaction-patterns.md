# Transaction Pattern Analysis

## 1000 Transaction Patterns to Monitor

### Pattern 1: Quote Submission Times
- **Metric**: Transactions per hour
- **Expected**: Peak at 9-11 AM, 2-4 PM weekdays
- **Action**: Scale workers during peak

### Pattern 2: Conversion by Trade Type
- **Metric**: % of quotes that convert to jobs
- **Expected**: Plumbers 15%, Electricians 18%, Builders 12%
- **Action**: Optimize low-performing trades

### Pattern 3: Average Response Times
- **Metric**: Seconds from quote to vendor response
- **Target**: < 300 seconds (5 minutes)
- **Alert**: > 600 seconds triggers investigation

### Pattern 4: Top Performing Postcodes
- **Metric**: Quotes per postcode
- **Expected**: SW1A, EC2A, NW3 leading
- **Action**: Focus marketing on underperforming areas

### Pattern 5: Payment Completion Rate
- **Metric**: % of completed jobs with payment
- **Target**: > 95%
- **Alert**: < 90% investigate payment flow issues

## SQL Queries for Monitoring
```sql
-- Hourly quote volume
SELECT EXTRACT(hour from created_at) as hour, COUNT(*) FROM quotes 
WHERE created_at > NOW() - INTERVAL '30 days' GROUP BY hour;

-- Trade conversion rates
SELECT trade, COUNT(*), SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
FROM quotes GROUP BY trade;

-- Response times
SELECT AVG(EXTRACT(epoch FROM (vendor_response_time - created_at))) FROM leads;

-- Top postcodes
SELECT postcode, COUNT(*) FROM quotes GROUP BY postcode ORDER BY count DESC LIMIT 20;
```

## 1000 Transaction Monitoring Schedule
- **Days 1-30**: Initial 1000 transactions
- **Days 31-60**: Pattern validation
- **Days 61-90**: Seasonal trend analysis
