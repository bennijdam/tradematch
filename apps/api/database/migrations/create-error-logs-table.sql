-- Create error_logs table for admin error tracking
-- Run this migration to enable comprehensive error logging

CREATE TABLE IF NOT EXISTS error_logs (
    id VARCHAR(100) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL DEFAULT 'error', -- error, warn, info
    message TEXT NOT NULL,
    stack TEXT,
    path VARCHAR(500),
    method VARCHAR(10),
    user_id VARCHAR(100),
    user_email VARCHAR(255),
    ip INET,
    user_agent TEXT,
    request_body JSONB,
    query_params JSONB,
    headers JSONB,
    status_code INTEGER,
    error_type VARCHAR(100),
    source VARCHAR(50) DEFAULT 'backend', -- backend, frontend, database
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_source ON error_logs(source);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_path ON error_logs(path);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved_timestamp ON error_logs(resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_level_timestamp ON error_logs(level, timestamp DESC);

-- Add comments
COMMENT ON TABLE error_logs IS 'Stores all backend errors for admin review and debugging';
COMMENT ON COLUMN error_logs.id IS 'Unique error identifier (err_<timestamp>_<random>)';
COMMENT ON COLUMN error_logs.level IS 'Error severity: error, warn, info';
COMMENT ON COLUMN error_logs.resolved IS 'Whether the error has been marked as resolved by admin';
COMMENT ON COLUMN error_logs.source IS 'Where the error originated: backend, frontend, database';
