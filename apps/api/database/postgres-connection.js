// PostgreSQL Database Connection Pool
const { Pool } = require('pg');

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('channel_binding');
    return url.toString();
  } catch (error) {
    return rawUrl;
  }
}

function resolveSslConfig(connectionString) {
  if (!connectionString) {
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
  }

  try {
    const url = new URL(connectionString);
    const sslMode = (url.searchParams.get('sslmode') || '').toLowerCase();
    const needsSsl = process.env.NODE_ENV === 'production'
      || ['require', 'verify-ca', 'verify-full'].includes(sslMode)
      || url.hostname.includes('neon.tech');

    return needsSsl ? { rejectUnauthorized: false } : false;
  } catch (error) {
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
  }
}

const sanitizedConnectionString = sanitizeDatabaseUrl(process.env.DATABASE_URL);

// HTTP Connection Pool - for REST API endpoints
const httpPool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: resolveSslConfig(sanitizedConnectionString),
  max: 15, // Reserved for HTTP API (75% of total capacity)
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  keepAlive: true
});

// WebSocket Connection Pool - for real-time connections
const wsPool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: resolveSslConfig(sanitizedConnectionString),
  max: 30, // Reserved for WebSocket operations (can fluctuate)
  idleTimeoutMillis: 30000, // Shorter idle time for WebSocket (more transient)
  connectionTimeoutMillis: 5000, // Faster timeout for real-time
  keepAlive: true,
  // WebSocket-specific configuration
  allowExitOnIdle: false // Important for persistent WebSocket connections
});

// Combined Pool - for general operations (backward compatibility)
const pool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: resolveSslConfig(sanitizedConnectionString),
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 15000,
  keepAlive: true
});

// Add error handling to all pools
[httpPool, wsPool, pool].forEach((poolInstance, index) => {
  poolInstance.on('error', (err) => {
    console.error(`[POSTGRES] Pool error (${['http', 'ws', 'combined'][index]}):`, err);
  });
  
  poolInstance.on('connect', () => {
    console.log(`[POSTGRES] Pool connected (${['http', 'ws', 'combined'][index]} max: ${poolInstance.options.max})`);
  });
  
  poolInstance.on('remove', (err) => {
    if (err) {
      console.error(`[POSTGRES] Client removed with error (${['http', 'ws', 'combined'][index]}):`, err);
    }
  });
});

module.exports = {
  pool, // Legacy combined pool for backward compatibility
  httpPool, // HTTP API requests - use: const { httpPool } = require('./postgres-connection')
  wsPool,   // WebSocket operations - use: const { wsPool } = require('./postgres-connection')
  httpPoolOrPool: httpPool || pool // Safe fallback
};