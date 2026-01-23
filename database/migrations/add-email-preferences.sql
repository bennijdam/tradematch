-- Add email preference columns to users table
-- Run this in your database to enable email preferences feature

-- Add columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE NOT NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{
    "newBids": true,
    "bidAccepted": true,
    "newQuotes": true,
    "paymentConfirmed": true,
    "reviewReminder": true,
    "quoteUpdates": true,
    "marketing": false,
    "newsletter": false
}'::jsonb NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_email_notifications 
ON users(email_notifications_enabled);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('email_notifications_enabled', 'email_preferences')
ORDER BY column_name;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Email preferences migration completed successfully!';
    RAISE NOTICE 'Users can now manage their email preferences at /email-preferences.html';
END $$;
