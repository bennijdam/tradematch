# TradeMatch KPI Metrics

## Primary KPIs

### 1. Quote Conversion Rate
- **Formula**: (Quotes Accepted / Total Quotes Submitted) × 100
- **Target**: > 15%
- **Measurement**: Daily via analytics_events table

### 2. Vendor Acceptance Rate
- **Formula**: (Bids Accepted by Customers / Total Bids Submitted) × 100
- **Target**: > 20%
- **Measurement**: Daily via bids table

### 3. Average Response Time
- **Customer**: Time from quote submission to first vendor response
- **Target**: < 5 minutes
- **Measurement**: lead_acceptance_log table

### 4. Revenue Per Quote
- **Formula**: AVG(payment_amount_cents) WHERE status='completed'
- **Target**: > £150
- **Measurement**: finance_ledger_entries table

## Supporting Metrics

### 5. API Uptime
- **Target**: 99.9%
- **Monitoring**: Sentry + Health checks

### 6. Error Rate
- **Target**: < 1%
- **Alert**: If > 1% for >5 minutes

### 7. WebSocket Latency
- **Target**: P99 < 500ms
- **Measurement**: Event timestamps in WebSocket logs

## Tracking SQL Queries

```sql
-- Daily quote conversion
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as converted,
  ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM quotes 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);

-- Daily vendor acceptance
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_bids,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
  ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*), 2) as acceptance_rate
FROM bids
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at);
```
