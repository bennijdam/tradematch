-- Lead Pricing, Qualification & Distribution System
-- TradeMatch: Premium alternative to MyBuilder

-- =============================================
-- 1. LEAD PRICING CONFIGURATION
-- =============================================

-- Pricing tiers based on job value
CREATE TABLE IF NOT EXISTS lead_pricing_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    min_budget DECIMAL(10,2) NOT NULL,
    max_budget DECIMAL(10,2),
    base_price DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category-based pricing multipliers
CREATE TABLE IF NOT EXISTS category_pricing_multipliers (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL UNIQUE,
    multiplier DECIMAL(4,2) DEFAULT 1.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location-based pricing (premium areas)
CREATE TABLE IF NOT EXISTS location_pricing_zones (
    id SERIAL PRIMARY KEY,
    postcode_prefix VARCHAR(10) NOT NULL,
    zone_name VARCHAR(100),
    multiplier DECIMAL(4,2) DEFAULT 1.00,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. VENDOR CREDITS SYSTEM
-- =============================================

-- Vendor credit balances
CREATE TABLE IF NOT EXISTS vendor_credits (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_purchased DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id)
);

-- Credit purchase history
CREATE TABLE IF NOT EXISTS credit_purchases (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    credits_purchased DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    stripe_payment_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions (purchases and debits for leads)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'lead_access', 'refund', 'bonus'
    amount DECIMAL(10,2) NOT NULL, -- positive for credits added, negative for deducted
    balance_after DECIMAL(10,2) NOT NULL,
    reference_id VARCHAR(255), -- quote_id or purchase_id
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. LEAD QUALIFICATION SCORES
-- =============================================

-- Lead quality scoring (0-100)
CREATE TABLE IF NOT EXISTS lead_qualification_scores (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(255) NOT NULL REFERENCES quotes(id) UNIQUE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    
    -- Individual scoring components (each 0-20 points)
    budget_score INTEGER DEFAULT 0,
    detail_score INTEGER DEFAULT 0,
    urgency_score INTEGER DEFAULT 0,
    customer_score INTEGER DEFAULT 0,
    location_score INTEGER DEFAULT 0,
    
    -- Scoring metadata
    has_budget BOOLEAN DEFAULT FALSE,
    has_photos BOOLEAN DEFAULT FALSE,
    description_length INTEGER DEFAULT 0,
    customer_verified BOOLEAN DEFAULT FALSE,
    customer_response_rate DECIMAL(5,2),
    
    quality_tier VARCHAR(20), -- 'premium', 'standard', 'basic'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. LEAD DISTRIBUTION TRACKING
-- =============================================

-- Track which vendors get which leads
CREATE TABLE IF NOT EXISTS lead_distributions (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(255) NOT NULL REFERENCES quotes(id),
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id),
    
    -- Matching details
    match_score INTEGER NOT NULL, -- 0-100 how well vendor matches this lead
    distance_miles DECIMAL(6,2),
    priority_rank INTEGER, -- 1-5 (which position in the queue)
    
    -- Access tracking
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    viewed_at TIMESTAMP,
    bid_submitted_at TIMESTAMP,
    
    -- Pricing
    lead_cost DECIMAL(10,2) NOT NULL,
    charged BOOLEAN DEFAULT FALSE,
    refunded BOOLEAN DEFAULT FALSE,
    refund_reason TEXT,
    
    -- Performance
    response_time_minutes INTEGER,
    bid_accepted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(quote_id, vendor_id)
);

-- =============================================
-- 5. VENDOR MATCHING PREFERENCES
-- =============================================

-- Vendor preferences for lead filtering
CREATE TABLE IF NOT EXISTS vendor_lead_preferences (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id) UNIQUE,
    
    -- Budget filtering
    min_budget DECIMAL(10,2),
    max_budget DECIMAL(10,2),
    
    -- Service radius
    max_distance_miles INTEGER DEFAULT 25,
    
    -- Preferred categories (JSON array)
    preferred_categories JSONB DEFAULT '[]',
    excluded_categories JSONB DEFAULT '[]',
    
    -- Lead quality minimum
    min_quality_score INTEGER DEFAULT 50,
    
    -- Availability
    max_leads_per_day INTEGER DEFAULT 10,
    max_concurrent_bids INTEGER DEFAULT 5,
    
    -- Auto-bid settings
    auto_bid_enabled BOOLEAN DEFAULT FALSE,
    auto_bid_margin DECIMAL(5,2), -- percentage above customer budget
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. VENDOR PERFORMANCE METRICS
-- =============================================

-- Track vendor performance for matching algorithm
CREATE TABLE IF NOT EXISTS vendor_performance_metrics (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(255) NOT NULL REFERENCES users(id) UNIQUE,
    
    -- Response metrics
    avg_response_time_minutes INTEGER,
    response_rate DECIMAL(5,2), -- % of leads where they responded
    
    -- Conversion metrics
    total_leads_purchased INTEGER DEFAULT 0,
    total_bids_submitted INTEGER DEFAULT 0,
    total_bids_accepted INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2), -- % of bids that won
    
    -- Quality metrics
    avg_customer_rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2),
    
    -- Financial
    total_spent_on_leads DECIMAL(10,2) DEFAULT 0.00,
    total_revenue_earned DECIMAL(10,2) DEFAULT 0.00,
    roi DECIMAL(6,2), -- Return on investment %
    
    -- Reputation score (0-100)
    reputation_score INTEGER DEFAULT 50,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_vendor_credits_vendor_id ON vendor_credits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_vendor ON credit_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_lead_scores_quote ON lead_qualification_scores(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_tier ON lead_qualification_scores(quality_tier);
CREATE INDEX IF NOT EXISTS idx_lead_dist_quote ON lead_distributions(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_dist_vendor ON lead_distributions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_lead_dist_charged ON lead_distributions(charged);
CREATE INDEX IF NOT EXISTS idx_vendor_prefs_vendor ON vendor_lead_preferences(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_perf_vendor ON vendor_performance_metrics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_perf_score ON vendor_performance_metrics(reputation_score);

-- =============================================
-- DEFAULT DATA: PRICING TIERS
-- =============================================

INSERT INTO lead_pricing_tiers (tier_name, min_budget, max_budget, base_price, description) VALUES
('Micro Jobs', 0, 250, 3.50, 'Small quick jobs under £250'),
('Small Jobs', 250, 500, 5.00, 'Standard small jobs £250-500'),
('Medium Jobs', 500, 1500, 8.00, 'Medium-sized projects £500-1500'),
('Large Jobs', 1500, 5000, 12.00, 'Large projects £1500-5000'),
('Premium Jobs', 5000, NULL, 18.00, 'High-value projects over £5000')
ON CONFLICT DO NOTHING;

-- =============================================
-- DEFAULT DATA: CATEGORY MULTIPLIERS
-- =============================================

INSERT INTO category_pricing_multipliers (category, multiplier, description) VALUES
('Plumbing', 1.0, 'Standard plumbing jobs'),
('Electrician', 1.1, 'Electrical work - higher demand'),
('Building', 1.2, 'General building and construction'),
('Roofing', 1.3, 'Roofing - specialized high-value'),
('Bathroom', 1.2, 'Bathroom fitting'),
('Kitchen', 1.3, 'Kitchen installation'),
('Painting', 0.9, 'Painting and decorating - lower value'),
('Landscaping', 1.1, 'Garden and landscaping'),
('Carpentry', 1.0, 'Carpentry and joinery'),
('Heating', 1.1, 'Heating and boiler work')
ON CONFLICT (category) DO NOTHING;

-- =============================================
-- DEFAULT DATA: LONDON PREMIUM ZONES
-- =============================================

INSERT INTO location_pricing_zones (postcode_prefix, zone_name, multiplier, is_premium) VALUES
('SW', 'South West London', 1.3, TRUE),
('W', 'West London', 1.3, TRUE),
('NW', 'North West London', 1.2, TRUE),
('N', 'North London', 1.1, TRUE),
('E', 'East London', 1.0, FALSE),
('SE', 'South East London', 1.1, FALSE),
('EC', 'City of London', 1.4, TRUE),
('WC', 'West Central London', 1.4, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- View: Vendor credit summary
CREATE OR REPLACE VIEW vendor_credit_summary AS
SELECT 
    vc.vendor_id,
    u.name AS vendor_name,
    u.email,
    vc.balance,
    vc.total_purchased,
    vc.total_spent,
    (vc.total_purchased - vc.total_spent) AS net_credits,
    vm.total_leads_purchased,
    vm.win_rate,
    vm.roi,
    vm.reputation_score
FROM vendor_credits vc
JOIN users u ON vc.vendor_id = u.id
LEFT JOIN vendor_performance_metrics vm ON vc.vendor_id = vm.vendor_id;

-- View: Lead quality distribution
CREATE OR REPLACE VIEW lead_quality_distribution AS
SELECT 
    quality_tier,
    COUNT(*) AS total_leads,
    AVG(overall_score) AS avg_score,
    AVG(budget_score) AS avg_budget_score,
    AVG(detail_score) AS avg_detail_score,
    COUNT(*) FILTER (WHERE has_budget) AS leads_with_budget,
    COUNT(*) FILTER (WHERE has_photos) AS leads_with_photos
FROM lead_qualification_scores
GROUP BY quality_tier;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Lead pricing, qualification & distribution system created successfully!';
    RAISE NOTICE '📊 Tables created: 11 core tables + 2 views';
    RAISE NOTICE '💰 Default pricing tiers: 5 tiers (£3.50 - £18.00 base)';
    RAISE NOTICE '📍 London premium zones configured';
    RAISE NOTICE '🎯 Ready for smart lead matching and distribution';
END $$;
