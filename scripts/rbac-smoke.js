const { spawn } = require('child_process');
const path = require('path');
const jwt = require(require.resolve('jsonwebtoken', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));
const { Pool } = require(require.resolve('pg', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));
require('dotenv').config({ path: 'backend/.env' });

const serverCmd = ['-r', 'dotenv/config', 'backend/server-production.js', 'dotenv_config_path=backend/.env'];
const repoRoot = path.join(__dirname, '..');
const server = spawn('node', serverCmd, { cwd: repoRoot, env: { ...process.env, PORT: '3001' } });

const logs = [];
let ready = false;

server.stdout.on('data', (data) => {
  const text = data.toString();
  logs.push(text);
  if (!ready && text.includes('TradeMatch API Server Started')) {
    ready = true;
    runTests();
  }
});

server.stderr.on('data', (data) => {
  logs.push(data.toString());
});

server.on('exit', (code) => {
  console.log(`SERVER EXIT code=${code}`);
  if (!ready) {
    console.log('Server logs before exit:\n', logs.join(''));
  }
});

const secret = process.env.JWT_SECRET || 'tradematch_jwt_secret_2024_secure_key_generate_a_long_random_string_here_change_in_production';
const vendor1 = jwt.sign({ userId: 'vend_sample_001', email: 'vendor_rbac@example.com', role: 'vendor' }, secret, { expiresIn: '1h' });
const vendor2 = jwt.sign({ userId: 'vend_sample_002', email: 'vendor2_rbac@example.com', role: 'vendor' }, secret, { expiresIn: '1h' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runTests() {
  try {
    // small delay to ensure server listening
    await new Promise((r) => setTimeout(r, 1000));

    // Find latest lead for vendor1 (so we don't hardcode IDs)
    const { rows } = await pool.query(`SELECT id FROM leads WHERE vendor_id = 'vend_sample_001' ORDER BY created_at DESC LIMIT 1`);
    const leadId = rows[0]?.id;
    console.log('Using leadId', leadId);

    console.log('TEST: vendor1 GET /api/connection/leads');
    const res1 = await fetch('http://localhost:3001/api/connection/leads', {
      headers: { Authorization: `Bearer ${vendor1}` }
    });
    const body1 = await res1.json();
    console.log('vendor1 status', res1.status, 'body', JSON.stringify(body1));

    console.log('TEST: vendor2 POST accept (expect 403)');
    const res2 = await fetch(`http://localhost:3001/api/connection/leads/${leadId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${vendor2}` },
      body: '{}'
    });
    const body2 = await res2.json();
    console.log('vendor2 status', res2.status, 'body', JSON.stringify(body2));
  } catch (err) {
    console.error('Test error', err);
  } finally {
    await pool.end();
    server.kill('SIGINT');
    setTimeout(() => {
      server.kill('SIGKILL');
    }, 3000);
  }
}

setTimeout(() => {
  if (!ready) {
    console.error('Server did not start in time');
    server.kill('SIGINT');
  }
}, 10000);
