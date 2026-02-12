require('dotenv').config();
const { Pool } = require('pg');

const table = process.env.TABLE_NAME;
if (!table) {
  console.error('Missing TABLE_NAME env var.');
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
    const result = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [table]
    );
    console.log(`Columns for ${table}:`);
    result.rows.forEach((row) => console.log(row));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
