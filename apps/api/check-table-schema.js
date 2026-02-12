const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
  .then(r => {
    console.log('Users table columns:');
    r.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    pool.end();
  })
  .catch(e => {
    console.error('Error:', e.message);
    pool.end();
  });
