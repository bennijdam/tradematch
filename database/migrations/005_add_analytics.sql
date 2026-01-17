-- Migration 005: Add Analytics and AI Tables
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

CREATE TABLE IF NOT EXISTS ai_enhancements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    quote_id VARCHAR(50) REFERENCES quotes(id),
    original_text TEXT,
    enhanced_text TEXT,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.0,
    model VARCHAR(50) DEFAULT 'gpt-4',
    enhancement_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_analytics_vendor ON analytics_events(vendor_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_enhancements_user ON ai_enhancements(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_quote ON ai_enhancements(quote_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancements_type ON ai_enhancements(enhancement_type);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);

CREATE INDEX IF NOT EXISTS idx_vendor_stats_vendor ON vendor_statistics(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_stats_updated ON vendor_statistics(last_updated);