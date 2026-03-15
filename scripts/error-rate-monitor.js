#!/usr/bin/env node
/**
 * TradeMatch Error Rate Monitor
 * Alerts if error rate exceeds 1% threshold
 */
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');
const util = require('util');

async function checkErrorRate() {
  console.log('📊 Checking production error rate...');
  
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    // Get errors in last 5 minutes
    const result = await pool.query(`
      SELECT COUNT(*) as error_count 
      FROM error_logs 
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    
    const totalRequests = await pool.query(`
      SELECT COUNT(*) as total 
      FROM analytics_events 
      WHERE event_type IN ('api_request', 'quote_submission', 'bid_submission')
      AND created_at > NOW() - INTERVAL '5 minutes'
    `);
    
    const errors = parseInt(result.rows[0].error_count);
    const total = parseInt(totalRequests.rows[0].total);
    const rate = total > 0 ? (errors / total * 100).toFixed(2) : 0;
    
    console.log(`Error rate last 5m: ${rate}% (${errors}/${total} requests)`);
    
    if (rate > 1.0) {
      console.log('🚨 ERROR RATE EXCEEDS 1% THRESHOLD!');
      console.log(' ACTION REQUIRED: Check error logs immediately');
      process.exit(1);
    } else {
      console.log('✅ Error rate within acceptable range');
      process.exit(0);
    }
    
  } catch (err) {
    console.error('Monitor failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkErrorRate().catch(console.error);
