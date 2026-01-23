#!/usr/bin/env node
/**
 * Apply Connection Layer Schema to Database
 * 
 * This script reads the schema-connection-layer.sql file and applies it
 * to the database specified in DATABASE_URL environment variable.
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  console.log('🔧 Applying Connection Layer Schema...\n');

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../../database/schema-connection-layer.sql');
    console.log('📄 Reading schema file:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✅ Schema file loaded (${schema.length} characters)\n`);

    // Test connection
    console.log('🔌 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', testResult.rows[0].now, '\n');

    // Apply schema
    console.log('🚀 Applying schema to database...');
    await pool.query(schema);
    console.log('✅ Schema applied successfully!\n');

    // Verify tables created
    console.log('🔍 Verifying tables created...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'jobs', 'leads', 'conversations', 'messages', 
        'quotes', 'milestones', 'escrow_accounts', 
        'job_reviews', 'event_log', 
        'notification_preferences', 'notification_queue'
      )
      ORDER BY table_name
    `);

    console.log('\n📊 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log('   ✓', row.table_name);
    });

    console.log(`\n✅ Total: ${tablesResult.rows.length}/11 core tables\n`);

    if (tablesResult.rows.length === 11) {
      console.log('🎉 SUCCESS! All connection layer tables created.\n');
      console.log('Next steps:');
      console.log('1. Update backend/server-production.js to mount connection-layer routes');
      console.log('2. Test with: curl -X POST http://localhost:3001/api/connection/jobs ...');
      console.log('3. See CONNECTION-LAYER-INTEGRATION.md for complete guide\n');
    } else {
      console.log('⚠️  Warning: Not all tables were created. Check for errors above.\n');
    }

  } catch (error) {
    console.error('\n❌ Error applying schema:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 Tip: Tables may already exist. To recreate:');
      console.log('   1. Drop existing tables first, or');
      console.log('   2. Modify schema to use CREATE TABLE IF NOT EXISTS\n');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
applySchema().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
