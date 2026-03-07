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

const pool = new Pool({
  connectionString: sanitizedConnectionString,
  ssl: resolveSslConfig(sanitizedConnectionString),
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 60000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 15000, // How long to wait when establishing a connection
  keepAlive: true
});

module.exports = pool;