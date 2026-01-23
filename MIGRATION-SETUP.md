# Database Migration - Setup Instructions

## Current Status
✅ Migration file created and ready: `backend/migrations/1737660000000_create-lead-system-tables.js`
❌ Cannot connect to Neon database from this environment (network restriction)

## What Needs to Be Done

The database migration has been fully prepared and is ready to apply. However, since this environment cannot access your Neon PostgreSQL database, you'll need to apply the migration from an environment that can connect to it.

### Option 1: Apply from Your Deployment Server (RECOMMENDED)

```bash
# SSH into your Render or deployment server
ssh your-server

# Navigate to project directory
cd /your/tradematch/path

# Install dependencies
npm install

# Apply migration
npm run migrate -- up
```

### Option 2: Apply from Your Local Machine with VPN

If you have VPN access to your Neon database:

```bash
# On your local machine
cd path/to/tradematch-fixed/backend

# Set DATABASE_URL (from your Neon dashboard)
export DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# Run migration
npm run migrate -- up
```

### Option 3: Apply Directly via Neon Console

If you prefer to apply the SQL directly:

1. Go to your Neon Dashboard
2. Open the SQL Editor
3. Copy the SQL from: `backend/migrations/1737660000000_create-lead-system-tables.js`
4. Run the SQL statements in order

## Migration Contents

The migration will create 6 new tables:

### 1. lead_pricing_rules
Stores pricing configuration by category, budget range, and location.

### 2. lead_qualification_scores
Stores quality scores (0-100) for each quote/lead.

### 3. lead_distributions
Tracks which vendors received which leads, match scores, and charging.

### 4. vendor_credits
Tracks credit balance and spending for each vendor.

### 5. credit_purchases
Records all credit purchase transactions from vendors.

### 6. lead_analytics_daily
Daily aggregated statistics for vendor analytics.

## Verification After Migration

After the migration is applied, verify success by running:

```sql
-- Check that all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND (tablename LIKE 'lead_%' OR tablename LIKE 'vendor_%' OR tablename LIKE 'credit_%');

-- Should return 6 rows:
-- - lead_pricing_rules
-- - lead_qualification_scores
-- - lead_distributions
-- - vendor_credits
-- - credit_purchases
-- - lead_analytics_daily
```

## Next Steps (After Migration Applied)

1. ✅ Database migration applied (this step)
2. Integrate quote creation with lead system
   - Edit `backend/routes/quotes.js`
   - Add lead processing to POST /api/quotes handler
3. Test end-to-end flow
4. Deploy to production

## Migration File Location

**Path**: `c:\Users\ASUS\Desktop\tradematch-fixed\backend\migrations\1737660000000_create-lead-system-tables.js`

**Size**: 600+ lines of SQL with proper schema, indexes, and constraints

## Troubleshooting

### Error: "could not connect to postgres"
- Database host is unreachable
- Check DATABASE_URL environment variable
- Verify Neon database is running
- Check firewall/VPN access

### Error: "permission denied"
- User doesn't have CREATE permission
- Contact Neon support or use admin credentials
- Or apply directly via Neon console

### Error: "relation already exists"
- Tables have already been created
- This is safe, migration has idempotent logic (IF NOT EXISTS)
- You can run migration multiple times safely

## Support

For issues with the migration:
1. Check the error message above
2. Verify DATABASE_URL is correct
3. Test connection: `psql $DATABASE_URL`
4. Review `NEON-DB-SETUP.md` for Neon-specific setup
5. Check `LEAD-SYSTEM-STATUS.md` for technical details

---

**Important**: The migration must be applied before the quote creation integration will work properly. The lead system requires these tables to function.

**Timeline**: Apply migration, then proceed with quote creation integration (documented in LEAD-SYSTEM-CHECKLIST.md).
