#!/usr/bin/env node
/**
 * TradeMatch Transaction Monitor Dashboard
 * Monitors first 1000 transactions for patterns
 */
require('dotenv').config();

const { Pool } = require('pg');

async function monitorFirst1000() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🎯 Monitoring First 1000 Transactions...\n');
    
    // Transaction 1: First 1000 quotes
    const firstQuotes = await pool.query(`
      SELECT 
        id, 
        trade, 
        postcode, 
        status,
        created_at
      FROM quotes 
      ORDER BY created_at ASC 
      LIMIT 1000
    `);
    
    console.log(`📊 First 1000 Quotes Monitored:`);
    console.log(`- Total: ${firstQuotes.rows.length}`);
    console.log(`- First: ${firstQuotes.rows[0]?.trade || 'N/A'}`);
    console.log(`- Last: ${firstQuotes.rows[firstQuotes.rows.length - 1]?.trade || 'N/A'}`);
    
    // Transaction 2: Analysis
    const analysis = await pool.query(`
      SELECT 
        trade,
        COUNT(*) as count,
        AVG(EXTRACT(epoch FROM (vendor_response_time - created_at))) as avg_response
      FROM quotes 
      WHERE id IN (${firstQuotes.rows.map(q => q.id).join(',')})
      GROUP BY trade
      ORDER BY count DESC
    `);
    
    console.log(`\n🎨 Transaction Patterns:`);
    analysis.rows.forEach(row => {
      console.log(`- ${row.trade}: ${row.count} quotes, avg response ${Math.round(row.avg_response || 0)} seconds`);
    });
    
    // Transaction 3: KPI from 1000
    const kpis = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
      FROM quotes 
      WHERE id IN (${firstQuotes.rows.map(q => q.id).join(',')})
    `);
    
    console.log(`\n📈 KPIs from First 1000:`);
    console.log(`- Conversion Rate: ${Math.round(kpis.rows[0].conversion_rate || 0)}%`);
    
    console.log('\n✅ First 1000 transactions monitored');
    
  } catch (err) {
    console.error('Monitoring failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

monitorFirst1000().catch(console.error);
