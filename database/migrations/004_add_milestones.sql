-- Migration 004: Add Milestones and Escrow Tables
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

CREATE INDEX IF NOT EXISTS idx_milestones_quote ON payment_milestones(quote_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON payment_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON payment_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_escrow_releases_payment ON escrow_releases(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_releases_status ON escrow_releases(status);