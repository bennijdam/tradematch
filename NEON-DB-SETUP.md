# Neon Database Setup Guide

## Problem
The Neon database may have old tables or missing the `activation_tokens` table required for email verification.

## Solution

### Option 1: Drop and Recreate (Recommended for Development)

If you're willing to lose all existing test data:

1. **Go to Neon Dashboard**:
   - https://console.neon.tech/
   - Select your project
   - Go to SQL Editor

2. **Drop all tables** (in this order to respect foreign keys):
   ```sql
   DROP TABLE IF EXISTS activation_tokens CASCADE;
   DROP TABLE IF EXISTS quote_responses CASCADE;
   DROP TABLE IF EXISTS quotes CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```

3. **Run the schema file**:
   - Copy the entire contents of `backend/database-schema.sql`
   - Paste into Neon SQL Editor
   - Execute

4. **Verify tables exist**:
   ```sql
   \dt
   ```
   You should see:
   - `users` ✓
   - `quotes` ✓
   - `quote_responses` ✓
   - `activation_tokens` ✓

### Option 2: Add Missing Table Only

If you want to keep existing data:

1. **Go to Neon SQL Editor**

2. **Run this SQL**:
   ```sql
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

   CREATE INDEX IF NOT EXISTS idx_activation_tokens_user ON activation_tokens(user_id);
   CREATE INDEX IF NOT EXISTS idx_activation_tokens_token ON activation_tokens(token);
   ```

### Verification Steps

1. **Check users table has correct columns**:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'users' 
   ORDER BY ordinal_position;
   ```
   
   Should include:
   - `id` (character varying)
   - `email` (character varying, UNIQUE)
   - `password_hash` (character varying)
   - `name` (character varying)
   - `user_type` (character varying)
   - `phone` (character varying)
   - `postcode` (character varying)
   - `email_verified` (boolean, DEFAULT false)

2. **Check activation_tokens table exists**:
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'activation_tokens' 
   ORDER BY ordinal_position;
   ```

### After Setup

1. Backend will auto-redeploy when you push code to GitHub
2. Try registering again at https://www.tradematch.uk/auth-register.html
3. You should receive an activation email

## Troubleshooting

**Still getting "column does not exist" errors?**
- Verify you ran the CREATE TABLE statements
- Check column names match exactly (case-sensitive for names like `password_hash`, `email_verified`)

**Users table has old columns?**
- Consider Option 1 (drop and recreate)
- Or manually ALTER the table to add missing columns

**Activation email not sent?**
- Check RESEND_API_KEY is set in backend environment variables
- Verify the activation token is being created in the database
- Check /api/auth/register response

## Quick Status Check

Run this in Neon SQL Editor to see everything:
```sql
-- Check all tables
\dt

-- Check users table structure
\d users

-- Check activation_tokens table structure  
\d activation_tokens

-- Count users
SELECT COUNT(*) as user_count FROM users;

-- Count pending activation tokens
SELECT COUNT(*) as pending_tokens FROM activation_tokens WHERE used = false;
```

---
**Next**: After database is set up correctly, try registration again!
