const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const newPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!'; // Change this to something secure

(async () => {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email, full_name",
      [hashedPassword, 'admin@tradematch.com']
    );
    
    if (result.rows.length === 0) {
      console.log('Super admin account not found');
    } else {
      console.log('✓ Password updated successfully');
      console.log('Account:', result.rows[0]);
      console.log('\nNew credentials:');
      console.log('Email:', 'admin@tradematch.com');
      console.log('Password:', newPassword);
    }
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
})();
