-- Lead Acceptance Model Migration
-- Transforms from auto-charge to preview+accept model

-- 1. Add lead states and acceptance tracking to lead_distributions
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS lead_state VARCHAR(20) DEFAULT 'offered';
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP;
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS declined_reason TEXT;
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS payment_charged BOOLEAN DEFAULT FALSE;
ALTER TABLE lead_distributions ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255);

COMMENT ON COLUMN lead_distributions.lead_state IS 'offered, accepted, declined, expired, completed, cancelled';
COMMENT ON COLUMN lead_distributions.payment_charged IS 'TRUE only after vendor accepts and payment succeeds';

-- 2. Create vendor auto-accept rules table
CREATE TABLE IF NOT EXISTS vendor_auto_accept_rules (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT FALSE,
    service_category VARCHAR(100),
    min_match_score INTEGER DEFAULT 70,
    max_lead_price NUMERIC(10,2),
    max_distance_miles INTEGER,
    min_budget INTEGER,
    max_budget INTEGER,
    daily_lead_cap INTEGER DEFAULT 10,
    weekly_lead_cap INTEGER DEFAULT 50,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendor_auto_accept_rules IS 'Opt-in auto-accept rules for power users';
COMMENT ON COLUMN vendor_auto_accept_rules.enabled IS 'Must be explicitly enabled by vendor';

-- 3. Create vendor spend limits table
CREATE TABLE IF NOT EXISTS vendor_spend_limits (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL UNIQUE,
    daily_spend_limit NUMERIC(10,2) DEFAULT 100.00,
    weekly_spend_limit NUMERIC(10,2) DEFAULT 500.00,
    monthly_spend_limit NUMERIC(10,2) DEFAULT 2000.00,
    daily_spent NUMERIC(10,2) DEFAULT 0,
    weekly_spent NUMERIC(10,2) DEFAULT 0,
    monthly_spent NUMERIC(10,2) DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE vendor_spend_limits IS 'Prevent overspending with daily/weekly/monthly caps';

-- 4. Create lead acceptance audit log
CREATE TABLE IF NOT EXISTS lead_acceptance_log (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    lead_state_before VARCHAR(20),
    lead_state_after VARCHAR(20),
    payment_amount NUMERIC(10,2),
    payment_success BOOLEAN,
    payment_error TEXT,
    auto_accepted BOOLEAN DEFAULT FALSE,
    match_score INTEGER,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE lead_acceptance_log IS 'Audit trail for all lead acceptance/decline actions';
COMMENT ON COLUMN lead_acceptance_log.action IS 'accept, decline, expire, auto_accept';

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_dist_state ON lead_distributions(lead_state);
CREATE INDEX IF NOT EXISTS idx_lead_dist_expires ON lead_distributions(expires_at);
CREATE INDEX IF NOT EXISTS idx_auto_rules_vendor ON vendor_auto_accept_rules(vendor_id);
CREATE INDEX IF NOT EXISTS idx_auto_rules_enabled ON vendor_auto_accept_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_spend_limits_vendor ON vendor_spend_limits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_log_quote ON lead_acceptance_log(quote_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_log_vendor ON lead_acceptance_log(vendor_id);

-- 6. Update existing lead_distributions to set expiration (24 hours from distribution)
UPDATE lead_distributions 
SET expires_at = distributed_at + INTERVAL '24 hours',
    lead_state = 'offered'
WHERE expires_at IS NULL AND lead_state IS NULL;

-- Verification queries
-- SELECT COUNT(*) FROM lead_distributions WHERE lead_state = 'offered';
-- SELECT * FROM vendor_auto_accept_rules LIMIT 5;
-- SELECT * FROM vendor_spend_limits LIMIT 5;
-- SELECT * FROM lead_acceptance_log ORDER BY created_at DESC LIMIT 10;
