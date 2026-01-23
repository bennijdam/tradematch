const path = require('path');
require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || 'backend/.env' });
const { Pool } = require(require.resolve('pg', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;`);
    await client.query(`UPDATE users SET full_name = COALESCE(full_name, name, '')`);
    await client.query('COMMIT');
    console.log('users.full_name aligned');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
