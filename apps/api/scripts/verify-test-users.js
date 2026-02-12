require('dotenv').config();
const { Pool } = require('pg');

const customerEmail = process.env.EMAIL_CUSTOMER;
const vendorEmail = process.env.EMAIL_VENDOR;

if (!customerEmail || !vendorEmail) {
  console.error('Missing EMAIL_CUSTOMER or EMAIL_VENDOR env vars.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const emails = [customerEmail, vendorEmail];
    const updateResult = await pool.query(
      'UPDATE users SET email_verified = true WHERE email = ANY($1) RETURNING email, email_verified',
      [emails]
    );
    console.log('✅ Marked email_verified true for test accounts');
    console.log(updateResult.rows);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
