require('dotenv').config();
const { Pool } = require('pg');

const email = process.env.USER_EMAIL;
if (!email) {
  console.error('Missing USER_EMAIL env var.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const sslmode = (() => {
  try {
    return new URL(databaseUrl).searchParams.get('sslmode');
  } catch (error) {
    return null;
  }
})();

const useSsl = sslmode ? sslmode !== 'disable' : false;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    const userRes = await pool.query(
      'SELECT id, user_type, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (userRes.rows.length === 0) {
      console.log('No user found for email', email);
      return;
    }

    const user = userRes.rows[0];
    console.log('User:', user);

    const vendorByUser = await pool.query(
      'SELECT * FROM vendors WHERE user_id = $1',
      [user.id]
    );
    console.log('Vendor by user_id:', vendorByUser.rows);

    const vendorById = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [user.id]
    );
    console.log('Vendor by id:', vendorById.rows);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
