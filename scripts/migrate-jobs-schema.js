const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || 'backend/.env' });
const { Pool } = require(require.resolve('pg', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log('Applying jobs schema alignment...');
    await client.query('BEGIN');

    // Add missing columns with safe defaults
    await client.query(`
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS trade_category VARCHAR(100),
        ADD COLUMN IF NOT EXISTS postcode VARCHAR(10),
        ADD COLUMN IF NOT EXISTS budget_min DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS budget_max DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS timeframe VARCHAR(50),
        ADD COLUMN IF NOT EXISTS status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS created_by VARCHAR(50),
        ADD COLUMN IF NOT EXISTS updated_by VARCHAR(50),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);

    // Set defaults for existing rows to satisfy NOT NULL expectations in routes
    await client.query(`
      UPDATE jobs
      SET description = COALESCE(description, ''),
          trade_category = COALESCE(trade_category, 'general'),
          postcode = COALESCE(postcode, ''),
          budget_min = COALESCE(budget_min, 0),
          budget_max = COALESCE(budget_max, 0),
          timeframe = COALESCE(timeframe, 'flexible'),
          status = COALESCE(status, 'draft'),
          created_by = COALESCE(created_by, customer_id),
          updated_by = COALESCE(updated_by, customer_id),
          updated_at = COALESCE(updated_at, NOW()),
          metadata = COALESCE(metadata, '{}'::jsonb);
    `);

    // Add constraints (idempotent via IF NOT EXISTS checks inside DO block)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'job_budget_range'
        ) THEN
          ALTER TABLE jobs ADD CONSTRAINT job_budget_range CHECK (budget_min <= budget_max);
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'jobs_timeframe_check'
        ) THEN
          ALTER TABLE jobs ADD CONSTRAINT jobs_timeframe_check CHECK (timeframe IN ('urgent','1-2_weeks','1_month','flexible'));
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'jobs_status_check'
        ) THEN
          ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('draft','live','in_progress','completed','cancelled'));
        END IF;
      END$$;
    `);

    // Helpful indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);`);

    await client.query('COMMIT');
    console.log('Jobs schema alignment complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
