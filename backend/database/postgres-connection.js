// PostgreSQL Database Connection Pool
const { Pool } = require('pg');

function sanitizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('channel_binding');
    if (url.hostname.includes('-pooler')) {
      url.hostname = url.hostname.replace('-pooler', '');
    }
    return url.toString();
  } catch (error) {
    return rawUrl;
  }
}

const pool = new Pool({
  connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 60000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 15000, // How long to wait when establishing a connection
  keepAlive: true
});

module.exports = pool;