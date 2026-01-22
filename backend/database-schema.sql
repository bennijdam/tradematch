-- TradeMatch Database Schema
-- PostgreSQL (Neon) Compatible

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('customer', 'vendor')) NOT NULL,
    phone VARCHAR(50),
    postcode VARCHAR(20),
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    postcode VARCHAR(20) NOT NULL,
    budget_min DECIMAL(10, 2),
    budget_max DECIMAL(10, 2),
    urgency VARCHAR(20) DEFAULT 'asap' CHECK (urgency IN ('asap', '1-3months', '3-6months', 'planning')),
    additional_details JSONB,
    photos JSONB,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'in_progress')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Quote responses (for vendors to respond to quotes)
CREATE TABLE IF NOT EXISTS quote_responses (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    vendor_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    message TEXT,
    availability VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activation tokens table (for email verification)
CREATE TABLE IF NOT EXISTS activation_tokens (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(50) DEFAULT 'activation',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_service_type ON quotes(service_type);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_postcode ON quotes(postcode);
CREATE INDEX IF NOT EXISTS idx_quote_responses_quote_id ON quote_responses(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_responses_vendor_id ON quote_responses(vendor_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_responses_updated_at BEFORE UPDATE ON quote_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data (optional - for testing)
-- Insert a sample customer
INSERT INTO users (id, email, password_hash, name, user_type, postcode) 
VALUES (
    'cust_sample_001',
    'customer@example.com',
    '$2b$10$example_hash_replace_with_real',
    'John Customer',
    'customer',
    'SW1A 1AA'
) ON CONFLICT (email) DO NOTHING;

-- Insert a sample vendor
INSERT INTO users (id, email, password_hash, name, user_type, postcode) 
VALUES (
    'vend_sample_001',
    'vendor@example.com',
    '$2b$10$example_hash_replace_with_real',
    'Mike Builder',
    'vendor',
    'EC1A 1BB'
) ON CONFLICT (email) DO NOTHING;

-- Insert a sample quote
INSERT INTO quotes (id, customer_id, service_type, title, description, postcode) 
VALUES (
    'quote_sample_001',
    'cust_sample_001',
    'extension',
    'Kitchen Extension Quote',
    'Need a single storey kitchen extension approximately 4m x 3m.',
    'SW1A 1AA'
) ON CONFLICT DO NOTHING;