const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query("SELECT id, email, full_name, role FROM users WHERE role='super_admin' ORDER BY created_at DESC LIMIT 10")
  .then(r => {
    console.log('Found super admins:');
    console.log(JSON.stringify(r.rows, null, 2));
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
