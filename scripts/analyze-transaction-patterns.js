#!/usr/bin/env node
/**
 * TradeMatch Transaction Pattern Analyzer
 * Analyzes first 1000 transactions for patterns
 */
require('dotenv').config();

const { Pool } = require('pg');

async function analyzePatterns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('📊 Analyzing first 1000 transaction patterns...\n');
    
    // Pattern 1: Quote submission times
    const quoteTimes = await pool.query(`
      SELECT 
        EXTRACT(hour from created_at) as hour,
        COUNT(*) as count
      FROM quotes 
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
      LIMIT 1000
    `);
    
    console.log('PATTERN 1: Quote Submission by Hour');
    console.log(quoteTimes.rows.map(r => `Hour ${r.hour}: ${r.count} quotes`).join('\n'));
    
    // Pattern 2: Conversion by trade type
    const conversionByTrade = await pool.query(`
      SELECT 
        trade,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as converted,
        ROUND(COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*), 2) as rate
      FROM quotes
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY trade
      ORDER BY total DESC
      LIMIT 1000
    `);
    
    console.log('\nPATTERN 2: Quote Conversion by Trade Type');
    conversionByTrade.rows.forEach(r => {
      console.log(`${r.trade}: ${r.total} submitted, ${r.converted} accepted (${r.rate}%)`);
    });
    
    // Pattern 3: Average response time
    const responseTime = await pool.query(`
      SELECT 
        AVG(EXTRACT(epoch from (vendor_response_time - created_at))) as avg_seconds
      FROM leads
      WHERE vendor_response_time IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
      LIMIT 1000
    `);
    
    console.log(`\nPATTERN 3: Average Vendor Response Time`);
    const avgResponse = responseTime.rows[0].avg_seconds;
    console.log(`Average: ${Math.round(avgResponse)} seconds (${Math.round(avgResponse/60)} minutes)`);
    
    // Pattern 4: Top performing postcodes
    const topPostcodes = await pool.query(`
      SELECT 
        postcode,
        COUNT(*) as quotes,
        AVG(match_score) as avg_score
      FROM quotes
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY postcode
      ORDER BY quotes DESC
      LIMIT 20
    `);
    
    console.log('\nPATTERN 4: Top Performing Postcodes');
    topPostcodes.rows.forEach((r, i) => {
      console.log(`${i+1}. ${r.postcode}: ${r.quotes} quotes, avg score ${Math.round(r.avg_score)}`);
    });
    
    console.log('\n✅ Transaction pattern analysis complete');
    
  } catch (err) {
    console.error('Analysis failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

analyzePatterns().catch(console.error);
