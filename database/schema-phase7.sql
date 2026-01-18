-- TradeMatch Phase 7 Database Schema
-- Features 1-4: Payments, Reviews, AI & Proposals

-- Payments table
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

-- Escrow releases
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

-- Payment milestones
CREATE TABLE IF NOT EXISTS payment_milestones (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    completion_evidence JSONB,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    customer_id VARCHAR(50) REFERENCES users(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    photos JSONB,
    response_text TEXT,
    response_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_quote ON payments(quote_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_escrow ON payments(escrow_status);

-- Create indexes for milestones
CREATE INDEX IF NOT EXISTS idx_milestones_quote ON payment_milestones(quote_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON payment_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON payment_milestones(due_date);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(is_verified);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_quote ON reviews(quote_id);

-- Create indexes for escrow releases
CREATE INDEX IF NOT EXISTS idx_escrow_releases_payment ON escrow_releases(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_releases_status ON escrow_releases(status);

-- Create indexes for proposals
CREATE INDEX IF NOT EXISTS idx_proposals_quote ON proposals(quote_id);
CREATE INDEX IF NOT EXISTS idx_proposals_vendor ON proposals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);

-- Create indexes for AI enhancements
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_user ON ai_enhancements(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_quote ON ai_enhancements(quote_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_type ON ai_enhancements(enhancement_type);

-- Create indexes for AI usage
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);

-- Analytics tracking table
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(50) PRIMARY KEY,
    vendor_id VARCHAR(50) REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vendor statistics (materialized view updated daily)
CREATE TABLE IF NOT EXISTS vendor_statistics (
    vendor_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    total_quotes_received INTEGER DEFAULT 0,
    total_bids_submitted INTEGER DEFAULT 0,
    total_jobs_won INTEGER DEFAULT 0,
    total_jobs_completed INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time INTEGER, -- in minutes
    avg_job_value DECIMAL(10,2),
    total_revenue DECIMAL(12,2) DEFAULT 0,
    customer_satisfaction DECIMAL(3,2),
    repeat_customer_rate DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_vendor ON analytics_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

-- Create indexes for vendor statistics
CREATE INDEX IF NOT EXISTS idx_vendor_stats_vendor ON vendor_statistics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_updated ON vendor_statistics(last_updated);

-- Add vendor_stripe_account_id column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS vendor_stripe_account_id VARCHAR(100);

-- Add average_rating column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    proposal_number VARCHAR(50) UNIQUE NOT NULL,
    project_title VARCHAR(200) NOT NULL,
    project_description TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    data JSONB,
    pdf_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    sent_at TIMESTAMP,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI enhancements tracking table
CREATE TABLE IF NOT EXISTS ai_enhancements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    quote_id VARCHAR(50) REFERENCES quotes(id),
    original_text TEXT,
    enhanced_text TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.0,
    model VARCHAR(50) DEFAULT 'gpt-4',
    enhancement_type VARCHAR(50), -- 'description', 'timeline', 'cost_estimate', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI usage tracking
CREATE TABLE IF NOT EXISTS ai_usage (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    feature VARCHAR(50) NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.0,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO payments (id, quote_id, customer_id, vendor_id, amount, status, stripe_payment_intent_id, escrow_status) VALUES
('pay_sample_001', 'quote_001', 'user_001', 'user_002', 500.00, 'paid', 'pi_sample_001', 'released'),
('pay_sample_002', 'quote_002', 'user_003', 'user_002', 750.00, 'pending', 'pi_sample_002', 'held')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payment_milestones (id, quote_id, title, description, amount, percentage, due_date, status) VALUES
('mile_001', 'quote_002', 'Initial Deposit', '25% upfront payment', 187.50, 25.0, '2024-02-01', 'paid'),
('mile_002', 'quote_002', 'Work Completion', '50% after work completion', 375.00, 50.0, '2024-02-15', 'pending'),
('mile_003', 'quote_002', 'Final Payment', '25% after inspection', 187.50, 25.0, '2024-02-20', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reviews (id, quote_id, customer_id, vendor_id, rating, review_text, quality_rating, communication_rating, value_rating, timeliness_rating, is_verified) VALUES
('rev_001', 'quote_001', 'user_001', 'user_002', 5, 'Excellent work! Very professional and completed on time.', 5, 5, 5, 5, true),
('rev_002', 'quote_003', 'user_004', 'user_002', 4, 'Good quality work, slight delay but communication was great.', 4, 5, 4, 3, true)
ON CONFLICT (id) DO NOTHING;

-- Update vendor average rating
UPDATE users 
SET average_rating = (
    SELECT ROUND(AVG(rating), 2) 
    FROM reviews 
    WHERE vendor_id = users.id AND is_verified = true
)
WHERE id IN (SELECT vendor_id FROM reviews WHERE is_verified = true);

-- Create view for vendor performance summary
CREATE OR REPLACE VIEW vendor_performance_summary AS
SELECT 
    u.id as vendor_id,
    u.name as vendor_name,
    u.average_rating,
    COUNT(r.id) as total_reviews,
    COUNT(p.id) as total_payments,
    COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END), 0) as total_revenue,
    COALESCE(SUM(CASE WHEN p.escrow_status = 'held' THEN p.amount ELSE 0 END), 0) as held_in_escrow
FROM users u
LEFT JOIN reviews r ON u.id = r.vendor_id AND r.is_verified = true
LEFT JOIN payments p ON u.id = p.vendor_id
WHERE u.user_type = 'vendor'
GROUP BY u.id, u.name, u.average_rating;