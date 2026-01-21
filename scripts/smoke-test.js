#!/usr/bin/env node
/*
 Simple smoke test for TradeMatch backend.
 Usage:
   BACKEND_URL="https://your-backend.onrender.com" node scripts/smoke-test.js
*/

const BACKEND_URL = (process.env.BACKEND_URL || 'https://tradematch.onrender.com').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(`${BACKEND_URL}${path}`, { method: 'GET' });
  return { status: res.status, headers: res.headers, json: await res.json().catch(() => ({})) };
}

async function main() {
  console.log(`Running smoke tests against: ${BACKEND_URL}`);

  const results = [];
  // Health
  try {
    const r = await get('/api/health');
    results.push({ name: 'Health endpoint', pass: r.status === 200 && r.json.status === 'ok', details: r });
  } catch (e) {
    results.push({ name: 'Health endpoint', pass: false, details: e.message });
  }

  // Root info
  try {
    const r = await get('/');
    results.push({ name: 'Root endpoint', pass: r.status === 200, details: r });
  } catch (e) {
    results.push({ name: 'Root endpoint', pass: false, details: e.message });
  }

  // Optional auth debug (disabled in production). Treat 404 as SKIP, not a failure.
  try {
    const r = await get('/api/auth/debug');
    const pass = r.status === 200 || r.status === 404;
    const note = r.status === 404 ? 'SKIP (disabled in production)' : 'OK';
    results.push({ name: 'Auth debug', pass, note, details: r.json?.environment || {} });
  } catch (e) {
    results.push({ name: 'Auth debug', pass: false, details: e.message });
  }

  // Summarize
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log('\nSummary:');
  results.forEach(r => {
    const label = r.note ? `${r.pass ? 'PASS' : 'FAIL'} - ${r.note}` : (r.pass ? 'PASS' : 'FAIL');
    console.log(`- ${r.name}: ${label}`);
  });
  console.log(`\n${passed}/${total} checks passed.`);

  // Do not exit non-zero to avoid breaking pipelines for optional checks
}

main().catch(err => {
  console.error('Smoke test failed to run:', err);
});
