-- Migration 003: Add Proposals Table
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

CREATE INDEX IF NOT EXISTS idx_proposals_quote ON proposals(quote_id);
CREATE INDEX IF NOT EXISTS idx_proposals_vendor ON proposals(vendor_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);