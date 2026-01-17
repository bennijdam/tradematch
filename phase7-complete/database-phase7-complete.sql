-- ============================================
-- TradeMatch Phase 7: Complete Database Schema
-- All 6 Features Combined
-- ============================================

-- Feature 1: Payments & Escrow
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    customer_id VARCHAR(50) REFERENCES users(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    escrow_status VARCHAR(20) DEFAULT 'held',
    metadata JSONB,
    paid_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS escrow_releases (
    id VARCHAR(50) PRIMARY KEY,
    payment_id VARCHAR(50) REFERENCES payments(id),
    milestone_id VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    requested_by VARCHAR(50) REFERENCES users(id),
    approved_by VARCHAR(50) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    released_at TIMESTAMP
);

-- Enhanced payment_milestones
ALTER TABLE payment_milestones 
ADD COLUMN IF NOT EXISTS completion_evidence JSONB,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_payments_quote ON payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Feature 2: Reviews
-- (reviews table already exists from Phase 6)
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS response_text TEXT,
ADD COLUMN IF NOT EXISTS response_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_reviews_featured ON reviews(is_featured);

-- Feature 3: AI Enhancements
CREATE TABLE IF NOT EXISTS ai_enhancements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    enhancement_type VARCHAR(50) NOT NULL,
    input_text TEXT,
    output_text TEXT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    cost DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_enhancements(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_type ON ai_enhancements(enhancement_type);

-- Feature 4: Proposals
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    proposal_number VARCHAR(50) UNIQUE NOT NULL,
    project_title VARCHAR(200) NOT NULL,
    project_description TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    data JSONB NOT NULL,
    pdf_path TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposals_vendor ON proposals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_proposals_quote ON proposals(quote_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Feature 5: Analytics
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50) REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_statistics (
    vendor_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    total_quotes_received INTEGER DEFAULT 0,
    total_bids_submitted INTEGER DEFAULT 0,
    total_jobs_won INTEGER DEFAULT 0,
    total_jobs_completed INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time INTEGER,
    avg_job_value DECIMAL(10,2),
    total_revenue DECIMAL(12,2) DEFAULT 0,
    customer_satisfaction DECIMAL(3,2),
    repeat_customer_rate DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_vendor ON analytics_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

-- Feature 6: Enhanced Vendor Profile
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_features_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_access BOOLEAN DEFAULT true;

-- Sample Data (for testing)
-- INSERT sample payments
INSERT INTO payments (id, quote_id, customer_id, vendor_id, amount, status, escrow_status)
SELECT 
    'pay_sample_' || generate_series,
    'quote_' || generate_series,
    'usr_customer_1',
    'usr_vendor_1',
    1000.00 + (generate_series * 500),
    CASE 
        WHEN generate_series % 3 = 0 THEN 'paid'
        ELSE 'pending'
    END,
    'held'
FROM generate_series(1, 5)
ON CONFLICT (id) DO NOTHING;

-- INSERT sample reviews
INSERT INTO reviews (id, quote_id, customer_id, vendor_id, rating, review_text, quality_rating, communication_rating, value_rating, timeliness_rating, is_verified)
VALUES 
('rev_sample_1', 'quote_1', 'usr_customer_1', 'usr_vendor_1', 5, 'Excellent work! Very professional and completed on time.', 5, 5, 5, 5, true),
('rev_sample_2', 'quote_2', 'usr_customer_2', 'usr_vendor_1', 4, 'Good quality work, minor delays but overall satisfied.', 4, 4, 4, 3, true),
('rev_sample_3', 'quote_3', 'usr_customer_3', 'usr_vendor_1', 5, 'Highly recommend! Great attention to detail.', 5, 5, 4, 5, true)
ON CONFLICT (id) DO NOTHING;

-- INSERT sample analytics events
INSERT INTO analytics_events (id, vendor_id, event_type, event_data)
VALUES
('evt_sample_1', 'usr_vendor_1', 'bid_submitted', '{"quote_id": "quote_1", "amount": 1500}'),
('evt_sample_2', 'usr_vendor_1', 'quote_viewed', '{"quote_id": "quote_2"}'),
('evt_sample_3', 'usr_vendor_1', 'job_completed', '{"quote_id": "quote_1", "revenue": 1500}')
ON CONFLICT (id) DO NOTHING;

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Materialized view for vendor performance (refresh daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS vendor_performance AS
SELECT 
    v.id as vendor_id,
    COUNT(DISTINCT b.quote_id) as total_quotes_viewed,
    COUNT(b.id) as total_bids,
    COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as jobs_won,
    ROUND(
        COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(b.id), 0),
        2
    ) as win_rate,
    COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) as total_revenue,
    ROUND(AVG(r.rating), 2) as avg_rating,
    COUNT(r.id) as total_reviews
FROM vendors v
LEFT JOIN bids b ON v.id = b.vendor_id
LEFT JOIN payments p ON v.id = p.vendor_id
LEFT JOIN reviews r ON v.id = r.vendor_id
GROUP BY v.id;

-- Refresh command (run daily via cron or scheduler)
-- REFRESH MATERIALIZED VIEW vendor_performance;

COMMENT ON TABLE payments IS 'Phase 7: Stripe payment integration with escrow';
COMMENT ON TABLE escrow_releases IS 'Phase 7: Escrow fund release management';
COMMENT ON TABLE proposals IS 'Phase 7: Professional proposal system';
COMMENT ON TABLE analytics_events IS 'Phase 7: Vendor analytics tracking';
COMMENT ON TABLE vendor_statistics IS 'Phase 7: Aggregated vendor performance metrics';
COMMENT ON TABLE ai_enhancements IS 'Phase 7: AI feature usage tracking';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;

