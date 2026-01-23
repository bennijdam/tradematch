const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || 'backend/.env' });
// Resolve pg from backend/node_modules so this script works when run from repo root
const { Pool } = require(require.resolve('pg', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    // Ensure sample users exist
    await pool.query(
        `INSERT INTO users (id,email,password_hash,name,user_type,postcode,status,email_verified)
         VALUES ('cust_sample_001','customer_rbac@example.com','dummy','Customer One','customer','SW1A 1AA','active',true)
         ON CONFLICT (id) DO UPDATE SET 
           email=EXCLUDED.email,
           password_hash=EXCLUDED.password_hash,
           name=EXCLUDED.name,
           user_type=EXCLUDED.user_type,
           postcode=EXCLUDED.postcode,
           status=EXCLUDED.status,
           email_verified=EXCLUDED.email_verified`
    );

    await pool.query(
        `INSERT INTO users (id,email,password_hash,name,user_type,postcode,status,email_verified)
         VALUES ('vend_sample_001','vendor_rbac@example.com','dummy','Vendor One','vendor','EC1A 1BB','active',true)
         ON CONFLICT (id) DO UPDATE SET 
           email=EXCLUDED.email,
           password_hash=EXCLUDED.password_hash,
           name=EXCLUDED.name,
           user_type=EXCLUDED.user_type,
           postcode=EXCLUDED.postcode,
           status=EXCLUDED.status,
           email_verified=EXCLUDED.email_verified`
    );

    await pool.query(
        `INSERT INTO users (id,email,password_hash,name,user_type,postcode,status,email_verified)
         VALUES ('vend_sample_002','vendor2_rbac@example.com','dummy','Vendor Two','vendor','EC1A 1BB','active',true)
         ON CONFLICT (id) DO UPDATE SET 
           email=EXCLUDED.email,
           password_hash=EXCLUDED.password_hash,
           name=EXCLUDED.name,
           user_type=EXCLUDED.user_type,
           postcode=EXCLUDED.postcode,
           status=EXCLUDED.status,
           email_verified=EXCLUDED.email_verified`
    );

    const jobId = `job_rbac_${Date.now()}`;
    await pool.query(
      `INSERT INTO jobs (
        id, customer_id, title, description, trade_category, postcode,
        budget_min, budget_max, timeframe, status, created_by, updated_by,
        created_at, updated_at, metadata
      ) VALUES (
        $1, 'cust_sample_001', 'RBAC Seed Job', 'Seeded job for RBAC test', 'Plumbing', 'SW1A1AA',
        50, 100, 'urgent', 'draft', 'cust_sample_001', 'cust_sample_001', NOW(), NOW(), '{}'
      )`,
      [jobId]
    );

    const leadId = `lead_rbac_${Date.now()}`;
    await pool.query(
      `INSERT INTO leads (id, job_id, vendor_id, status, created_at, updated_at)
       VALUES ($1,$2,$3,'offered',NOW(),NOW())
       ON CONFLICT (id) DO NOTHING`,
      [leadId, jobId, 'vend_sample_001']
    );

    console.log(JSON.stringify({ jobId, leadId }, null, 2));
  } catch (err) {
    console.error('Seed error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
