#!/usr/bin/env node
/*
 Basic security header and rate-limit visibility check.
 Usage:
   BACKEND_URL="https://your-backend.onrender.com" node scripts/security-check.js
*/

const BACKEND_URL = (process.env.BACKEND_URL || 'https://tradematch.onrender.com').replace(/\/$/, '');

async function get(path, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, { method: 'GET', headers });
  const body = await res.text().catch(() => '');
  return { status: res.status, headers: res.headers, body };
}

function hasHeader(headers, name) {
  return headers.has(name.toLowerCase());
}

async function checkHeaders() {
  const r = await get('/api/health');
  const checks = [
    'x-frame-options',
    'x-content-type-options',
    'x-dns-prefetch-control',
    'referrer-policy',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
    'content-security-policy'
  ];
  const results = {};
  for (const h of checks) {
    results[h] = hasHeader(r.headers, h);
  }
  return { status: r.status, results };
}

async function checkRateLimit() {
  // Make several rapid requests and see if any 429s appear
  const attempts = 30;
  let got429 = false;
  const reqs = Array.from({ length: attempts }, () => get('/api/health'));
  const resAll = await Promise.all(reqs);
  got429 = resAll.some(r => r.status === 429);
  return { attempts, got429 };
}

async function main() {
  console.log(`Running security checks against: ${BACKEND_URL}`);

  // Headers
  try {
    const h = await checkHeaders();
    console.log('\nSecurity headers present:');
    for (const [k, v] of Object.entries(h.results)) {
      console.log(`- ${k}: ${v ? 'YES' : 'NO'}`);
    }
  } catch (e) {
    console.error('Header checks failed:', e.message);
  }

  // Rate limit signal
  try {
    const r = await checkRateLimit();
    console.log(`\nRate-limit signal (429 observed): ${r.got429 ? 'YES' : 'NO'}`);
  } catch (e) {
    console.error('Rate limit check failed:', e.message);
  }
}

main().catch(err => console.error(err));
