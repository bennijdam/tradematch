#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

async function checkDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false
  });

  try {
    console.log('📊 Checking existing tables...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (result.rows.length === 0) {
      console.log('No tables found in public schema.\n');
    } else {
      console.log(`Found ${result.rows.length} tables:\n`);
      result.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabase();
