#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function describeTable(tableName) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`\n📋 Structure of "${tableName}" table:\n`);
    
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    if (result.rows.length === 0) {
      console.log(`Table "${tableName}" not found.\n`);
    } else {
      result.rows.forEach(row => {
        console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

const tableName = process.argv[2] || 'conversations';
describeTable(tableName);
