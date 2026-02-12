-- Lead System Database Migration (Pure SQL for Neon)
-- Run this directly in Neon SQL Editor

-- 1. Lead pricing rules table
CREATE TABLE IF NOT EXISTS lead_pricing_rules (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    min_budget INTEGER,
    max_budget INTEGER,
    base_credit_cost INTEGER NOT NULL,
    urgency_multiplier NUMERIC(3,2) DEFAULT 1.0,
    quality_bonus_min_score INTEGER DEFAULT 75,
    quality_bonus_credit_cost INTEGER DEFAULT 0,
    region VARCHAR(50),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN lead_pricing_rules.category IS 'Service category (plumbing, electrical, etc)';
COMMENT ON COLUMN lead_pricing_rules.min_budget IS 'Minimum job budget in pounds';
COMMENT ON COLUMN lead_pricing_rules.max_budget IS 'Maximum job budget in pounds';
COMMENT ON COLUMN lead_pricing_rules.base_credit_cost IS 'Credits required to access this lead';
COMMENT ON COLUMN lead_pricing_rules.urgency_multiplier IS '1.0 for normal, 1.25 for urgent, 1.5 for very urgent';
COMMENT ON COLUMN lead_pricing_rules.quality_bonus_min_score IS 'Minimum quality score for bonus pricing';
COMMENT ON COLUMN lead_pricing_rules.quality_bonus_credit_cost IS 'Additional credits for high quality leads';
COMMENT ON COLUMN lead_pricing_rules.region IS 'UK region (London, Manchester, etc) - null for nationwide';

-- 2. Vendor credits table
CREATE TABLE IF NOT EXISTS vendor_credits (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    available_credits INTEGER NOT NULL DEFAULT 0,
    total_purchased_credits INTEGER NOT NULL DEFAULT 0,
    total_spent_credits INTEGER NOT NULL DEFAULT 0,
    credit_balance_history JSONB DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN vendor_credits.available_credits IS 'Credits available for lead access';
COMMENT ON COLUMN vendor_credits.total_purchased_credits IS 'Lifetime credits purchased';
COMMENT ON COLUMN vendor_credits.total_spent_credits IS 'Total credits spent on leads';
COMMENT ON COLUMN vendor_credits.credit_balance_history IS 'Array of credit transactions for audit trail';
COMMENT ON COLUMN vendor_credits.expires_at IS 'Date when credits expire (if applicable)';

-- 3. Lead qualification scores table
CREATE TABLE IF NOT EXISTS lead_qualification_scores (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL UNIQUE REFERENCES quotes(id) ON DELETE CASCADE,
    budget_score INTEGER DEFAULT 50,
    details_score INTEGER DEFAULT 50,
    urgency_score INTEGER DEFAULT 50,
    customer_verification_score INTEGER DEFAULT 50,
    media_score INTEGER DEFAULT 0,
    location_clarity_score INTEGER DEFAULT 50,
    overall_quality_score INTEGER NOT NULL,
    qualification_level VARCHAR(20) NOT NULL DEFAULT 'standard',
    calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recalculated_at TIMESTAMP
);

COMMENT ON COLUMN lead_qualification_scores.budget_score IS '0-30: based on budget clarity and realism';
COMMENT ON COLUMN lead_qualification_scores.details_score IS '0-20: based on description length and detail';
COMMENT ON COLUMN lead_qualification_scores.urgency_score IS '0-15: based on urgency level';
COMMENT ON COLUMN lead_qualification_scores.customer_verification_score IS '0-15: email verified, phone verified, etc';
COMMENT ON COLUMN lead_qualification_scores.media_score IS '0-10: photos/videos attached';
COMMENT ON COLUMN lead_qualification_scores.location_clarity_score IS '0-10: postcode verified vs approximate';
COMMENT ON COLUMN lead_qualification_scores.overall_quality_score IS '0-100: weighted aggregate score';
COMMENT ON COLUMN lead_qualification_scores.qualification_level IS 'standard, qualified, premium, or elite';

-- 4. Lead distributions table (tracks which vendors got access to which leads)
CREATE TABLE IF NOT EXISTS lead_distributions (
    id SERIAL PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL,
    distance_miles NUMERIC(5,2),
    distribution_order INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'offered',
    credits_charged INTEGER NOT NULL,
    view_count INTEGER DEFAULT 0,
    bid_submitted BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP,
    distributed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN lead_distributions.match_score IS '0-100: match quality based on location, specialty, rating';
COMMENT ON COLUMN lead_distributions.distance_miles IS 'Distance from vendor to job location';
COMMENT ON COLUMN lead_distributions.distribution_order IS 'Order in which vendor was offered (1st, 2nd, 3rd, etc)';
COMMENT ON COLUMN lead_distributions.status IS 'offered, viewed, bid_submitted, abandoned';
COMMENT ON COLUMN lead_distributions.credits_charged IS 'Credits charged when lead was distributed';
COMMENT ON COLUMN lead_distributions.view_count IS 'How many times vendor viewed the lead';

-- 5. Lead purchase history table
CREATE TABLE IF NOT EXISTS credit_purchases (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credits_purchased INTEGER NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL,
    price_per_credit NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    discount_applied VARCHAR(100),
    bulk_purchase_bonus INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

COMMENT ON COLUMN credit_purchases.credits_purchased IS 'Number of credits purchased';
COMMENT ON COLUMN credit_purchases.amount_paid IS 'Amount paid in pounds';
COMMENT ON COLUMN credit_purchases.price_per_credit IS 'Price per credit at time of purchase';
COMMENT ON COLUMN credit_purchases.payment_method IS 'stripe, bank_transfer, etc';
COMMENT ON COLUMN credit_purchases.stripe_payment_intent_id IS 'Reference to Stripe payment';
COMMENT ON COLUMN credit_purchases.status IS 'pending, completed, failed, refunded';
COMMENT ON COLUMN credit_purchases.discount_applied IS 'Discount code or promotion applied';
COMMENT ON COLUMN credit_purchases.bulk_purchase_bonus IS 'Bonus credits for bulk purchases';
COMMENT ON COLUMN credit_purchases.expires_at IS 'When these credits expire (if applicable)';

-- 6. Lead analytics snapshot (daily aggregation for performance)
CREATE TABLE IF NOT EXISTS lead_analytics_daily (
    id SERIAL PRIMARY KEY,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analytics_date DATE NOT NULL,
    leads_offered INTEGER DEFAULT 0,
    leads_viewed INTEGER DEFAULT 0,
    bids_submitted INTEGER DEFAULT 0,
    jobs_won INTEGER DEFAULT 0,
    credits_spent INTEGER DEFAULT 0,
    revenue_generated NUMERIC(10,2) DEFAULT 0,
    roi_percent NUMERIC(5,2) DEFAULT 0,
    avg_lead_quality_score INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN lead_analytics_daily.analytics_date IS 'Date of analytics snapshot';
COMMENT ON COLUMN lead_analytics_daily.roi_percent IS 'Revenue / (credits_spent * avg_credit_price) * 100';
COMMENT ON COLUMN lead_analytics_daily.conversion_rate IS 'bids_submitted / leads_viewed * 100';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_pricing_category ON lead_pricing_rules(category);
CREATE INDEX IF NOT EXISTS idx_lead_pricing_budget ON lead_pricing_rules(min_budget, max_budget);
CREATE INDEX IF NOT EXISTS idx_vendor_credits_vendor ON vendor_credits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_quote ON lead_qualification_scores(quote_id);
CREATE INDEX IF NOT EXISTS idx_lead_dist_quote_vendor ON lead_distributions(quote_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_lead_dist_order ON lead_distributions(distribution_order);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_vendor ON credit_purchases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);
CREATE INDEX IF NOT EXISTS idx_analytics_vendor_date ON lead_analytics_daily(vendor_id, analytics_date);

-- Verification Query (run this to confirm tables were created)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
--   'lead_pricing_rules',
--   'lead_qualification_scores',
--   'lead_distributions',
--   'vendor_credits',
--   'credit_purchases',
--   'lead_analytics_daily'
-- );
