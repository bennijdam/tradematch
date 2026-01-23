-- Super Admin Schema Extension
-- Add admin audit logging and super admin role support

-- Update users table to support super_admin role
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
ADD CONSTRAINT users_role_check 
CHECK (role IN ('customer', 'vendor', 'admin', 'super_admin'));

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'user', 'vendor', 'review', 'payment', etc.
    target_id UUID,
    details JSONB, -- Additional action details
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_type, target_id);

-- Add moderation fields to job_reviews if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_reviews' AND column_name = 'moderation_status'
    ) THEN
        ALTER TABLE job_reviews 
        ADD COLUMN moderation_status VARCHAR(20) DEFAULT 'pending',
        ADD COLUMN moderated_at TIMESTAMP,
        ADD COLUMN moderated_by UUID REFERENCES users(id);
        
        CREATE INDEX idx_job_reviews_moderation ON job_reviews(moderation_status);
    END IF;
END $$;

-- Add status field to users if not exists (for suspension/banning)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN status VARCHAR(20) DEFAULT 'active',
        ADD COLUMN last_login_at TIMESTAMP;
        
        ALTER TABLE users
        ADD CONSTRAINT users_status_check
        CHECK (status IN ('active', 'pending', 'suspended', 'banned', 'rejected'));
        
        CREATE INDEX idx_users_status ON users(status);
        CREATE INDEX idx_users_role_status ON users(role, status);
    END IF;
END $$;

-- Add metadata to users for KYC/verification details
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN metadata JSONB DEFAULT '{}';
        
        CREATE INDEX idx_users_metadata ON users USING gin(metadata);
    END IF;
END $$;

-- Create super admin user (password should be changed immediately)
-- Password: ChangeMe123! (hashed with bcrypt)
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at)
VALUES (
    gen_random_uuid(),
    'admin@tradematch.com',
    '$2b$10$8K1p/a0dL3LKllfdeR7ZAO4w8O6U4f0cE.GJ3hK6qL.QKX5q8LQXK', -- ChangeMe123!
    'Super Admin',
    'super_admin',
    'active',
    true,
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Grant schema permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_audit_log TO postgres;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

COMMENT ON TABLE admin_audit_log IS 'Audit trail for all administrative actions';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action performed (e.g., user_status_change, vendor_approved, review_moderated)';
COMMENT ON COLUMN admin_audit_log.details IS 'JSON object containing action-specific details';
