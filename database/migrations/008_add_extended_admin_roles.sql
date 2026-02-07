-- Migration 008: Extend admin role support
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN (
    'customer',
    'vendor',
    'admin',
    'super_admin',
    'finance_admin',
    'trust_safety_admin',
    'support_admin',
    'read_only_admin'
));
