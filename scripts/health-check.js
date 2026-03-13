#!/usr/bin/env node
/**
 * Health Check Script for TradeMatch
 * Usage: node scripts/health-check.js [environment]
 */

const BACKEND_URL = (process.env.BACKEND_URL || 'https://api.tradematch.uk').replace(/\/$/, '');

const CHECKS = [
  {
    name: 'Health Endpoint',
    path: '/api/health',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => data.status === 'ok'
  },
  {
    name: 'Database Connection',
    path: '/api/health/db',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => data.connected === true
  },
  {
    name: 'Quote Creation (Public)',
    path: '/api/quotes/public',
    method: 'POST',
    body: {
      serviceType: 'Plumbing',
      title: 'Health Check Test',
      description: 'Automated health check test',
      postcode: 'SW1A 1AA'
    },
    expectedStatus: 201,
    validate: (data) => data.success && data.quote && data.quote.id
  },
  {
    name: 'Postcode Validation',
    path: '/api/postcode/SW1A1AA',
    method: 'GET',
    expectedStatus: 200,
    validate: (data) => data.valid === true
  }
];

async function makeRequest(check) {
  const url = `${BACKEND_URL}${check.path}`;
  const options = {
    method: check.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (check.body) {
    options.body = JSON.stringify(check.body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      data,
      success: response.status === check.expectedStatus && check.validate(data)
    };
  } catch (error) {
    return {
      status: 0,
      data: {},
      success: false,
      error: error.message
    };
  }
}

async function runHealthChecks() {
  console.log('🏥 TradeMatch Health Check');
  console.log('===========================');
  console.log(`Backend: ${BACKEND_URL}`);
  console.log('');

  const results = [];

  for (const check of CHECKS) {
    process.stdout.write(`Checking ${check.name}... `);
    const result = await makeRequest(check);
    results.push({ check, result });

    if (result.success) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL');
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      } else {
        console.log(`   Status: ${result.status}, Expected: ${check.expectedStatus}`);
      }
    }
  }

  console.log('');
  console.log('===========================');
  console.log('📊 Health Check Summary');
  console.log('===========================');
  
  const passed = results.filter(r => r.result.success).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All ${total} checks passed!`);
    process.exit(0);
  } else {
    console.log(`❌ ${passed}/${total} checks passed`);
    console.log('');
    console.log('Failed checks:');
    results.filter(r => !r.result.success).forEach(r => {
      console.log(`  - ${r.check.name}`);
    });
    process.exit(1);
  }
}

runHealthChecks();
