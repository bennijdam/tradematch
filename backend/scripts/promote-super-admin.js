const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@tradematch.com';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const result = await pool.query(
      "UPDATE users SET role = 'super_admin' WHERE email = $1 RETURNING id, email, role",
      [email]
    );

    if (result.rows.length === 0) {
      console.log('No user found for:', email);
    } else {
      console.log('Updated role to super_admin:');
      console.log(result.rows[0]);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();
