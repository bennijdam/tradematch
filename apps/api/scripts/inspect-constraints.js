#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: node scripts/inspect-constraints.js <table>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false
});

(async () => {
  try {
    const res = await pool.query(
      `SELECT conname, pg_get_constraintdef(c.oid) AS def
       FROM pg_constraint c
       JOIN pg_class t ON c.conrelid = t.oid
       WHERE t.relname = $1 AND c.contype = 'c'`,
      [tableName]
    );
    console.log(res.rows);
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
