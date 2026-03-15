#!/usr/bin/env node
/**
 * TradeMatch Redis Monitoring Dashboard
 * Checks pub/sub channels, memory, connections
 */
require('dotenv').config();

async function checkRedis() {
  try {
    const redis = require('redis');
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => console.error('Redis error:', err));
    await client.connect();
    
    console.log('📊 Redis Monitoring Report:');
    
    // Memory usage
    const info = await client.info('memory');
    const memory = info.split('\n').find(line => line.startsWith('used_memory_human'));
    console.log(`Memory: ${memory?.split(':')[1]?.trim() || 'N/A'}`);
    
    // Connected clients
    const clients = await client.info('clients');
    const connected = clients.split('\n').find(line => line.startsWith('connected_clients'));
    console.log(`Clients: ${connected?.split(':')[1]?.trim() || 'N/A'}`);
    
    // Pub/Sub channels
    const channels = ['tradematch:events', 'tradematch:websocket', 'tradematch:notifications'];
    for (const channel of channels) {
      const numsub = await client.pubSubNumSub([channel]);
      console.log(`Channel ${channel}: ${numsub[channel] || 0} subscribers`);
    }
    
    // Connection health
    const ping = await client.ping();
    console.log(`Ping: ${ping === 'PONG' ? '✅ OK' : '❌ FAIL'}`);
    
    await client.disconnect();
  } catch (err) {
    console.error('Redis monitor failed:', err.message);
    process.exit(1);
  }
}

checkRedis().catch(console.error);
