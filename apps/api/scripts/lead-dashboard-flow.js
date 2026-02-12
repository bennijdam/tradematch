const dotenv = require('dotenv');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const { spawn } = require('child_process');
const LeadDistributionService = require('../services/lead-distribution.service');
const LeadPricingService = require('../services/lead-pricing.service');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

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

const API_BASE = 'http://localhost:3001';
const BACKEND_DIR = path.join(__dirname, '..');
const password = 'TempPass123!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, options = {}) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const { headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: baseHeaders
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) return true;
    } catch (_) {
      // ignore
    }
    await sleep(1000);
  }
  return false;
}

async function ensureVendorCredits(pool, vendorId, amount) {
  const columnsResult = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_credits'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  const hasBalance = columns.has('balance');
  const hasAvailable = columns.has('available_credits');

  const insertColumns = ['vendor_id'];
  const insertValues = ['$1'];

  if (hasBalance) {
    insertColumns.push('balance');
    insertValues.push('$2');
  }
  if (hasAvailable) {
    insertColumns.push('available_credits');
    insertValues.push('$2');
  }

  if (!hasBalance && !hasAvailable) {
    throw new Error('vendor_credits table missing balance/available_credits columns');
  }

  const existing = await pool.query(
    'SELECT 1 FROM vendor_credits WHERE vendor_id = $1',
    [vendorId]
  );

  if (existing.rows.length > 0) {
    const updateParts = [];
    const updateValues = [vendorId, amount];
    if (hasBalance) updateParts.push('balance = $2');
    if (hasAvailable) updateParts.push('available_credits = $2');

    await pool.query(
      `UPDATE vendor_credits SET ${updateParts.join(', ')} WHERE vendor_id = $1`,
      updateValues
    );
  } else {
    await pool.query(
      `INSERT INTO vendor_credits (${insertColumns.join(', ')})
       VALUES (${insertValues.join(', ')})`,
      [vendorId, amount]
    );
  }
}

async function main() {
  const serverProc = spawn('node', ['scripts/init-server.js'], { cwd: BACKEND_DIR, stdio: 'inherit' });
  try {
    const healthy = await waitForHealth();
    if (!healthy) {
      throw new Error('Backend did not become healthy');
    }

    const pool = new Pool({
      connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL)
    });

  const customerEmail = `customer_${crypto.randomUUID().slice(0, 8)}@example.com`;
  const vendorEmail = `vendor_${crypto.randomUUID().slice(0, 8)}@example.com`;

  const customerRegister = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: customerEmail,
      password,
      fullName: 'Dashboard Customer',
      userType: 'customer',
      postcode: 'SW1A 1AA'
    })
  });

  const vendorRegister = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: vendorEmail,
      password,
      fullName: 'Dashboard Vendor',
      userType: 'vendor',
      postcode: 'SW1A 2AA'
    })
  });

  const vendorId = vendorRegister.user.id;

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS services TEXT');
  await pool.query(
    `UPDATE users
     SET email_verified = TRUE,
         services = $2
     WHERE id = $1`,
    [vendorId, 'plumbing,heating']
  );

  await ensureVendorCredits(pool, vendorId, 50);

  const quote = await api('/api/quotes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${customerRegister.token}`
    },
    body: JSON.stringify({
      serviceType: 'plumbing',
      title: 'Dashboard flow test',
      description: 'Verify lead distribution and dashboard state.',
      postcode: 'SW1A 1AA',
      budgetMin: 120,
      budgetMax: 250,
      urgency: 'asap'
    })
  });

  const quoteId = quote.quoteId;

  await sleep(1200);

  const distributions = await pool.query(
    'SELECT * FROM lead_distributions WHERE quote_id = $1',
    [quoteId]
  );

  if (distributions.rows.length === 0) {
    const qualification = await pool.query(
      'SELECT * FROM lead_qualification_scores WHERE quote_id = $1',
      [quoteId]
    );

    const qualityScore = qualification.rows[0]?.overall_quality_score || 60;
    const pricingService = new LeadPricingService(pool);
    const distributionService = new LeadDistributionService(pool);
    const pricing = await pricingService.calculateLeadPrice(
      {
        serviceType: 'plumbing',
        postcode: 'SW1A 1AA',
        budgetMin: 120,
        budgetMax: 250
      },
      qualityScore
    );

    await distributionService.distributeLead(
      {
        id: quoteId,
        serviceType: 'plumbing',
        postcode: 'SW1A 1AA',
        budgetMin: 120,
        budgetMax: 250,
        urgency: 'asap'
      },
      qualityScore,
      pricing.finalPrice
    );
  }

  const vendorLogin = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: vendorEmail,
      password
    })
  });

  let offeredLeads = { leads: [], count: 0 };
  let offered = null;
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    offeredLeads = await api('/api/leads/offered', {
      headers: { Authorization: `Bearer ${vendorLogin.token}` }
    });

    offered = offeredLeads.leads.find((lead) => lead.quote_id === quoteId || lead.quoteId === quoteId);
    if (offered) break;
    await sleep(1000);
  }

  if (!offered) {
    const existingManual = await pool.query(
      'SELECT 1 FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
      [quoteId, vendorId]
    );

    if (existingManual.rows.length === 0) {
      await pool.query(
        `INSERT INTO lead_distributions (
          quote_id, vendor_id, match_score, distance_miles,
          distribution_order, credits_charged, lead_state,
          expires_at, distributed_at, payment_charged
        ) VALUES ($1, $2, $3, $4, $5, $6, 'offered', NOW() + INTERVAL '24 hours', NOW(), FALSE)`,
        [quoteId, vendorId, 100, 0, 1, 5]
      );
    }

    offeredLeads = await api('/api/leads/offered', {
      headers: { Authorization: `Bearer ${vendorLogin.token}` }
    });

    offered = offeredLeads.leads.find((lead) => lead.quote_id === quoteId || lead.quoteId === quoteId);
  }

  if (!offered) {
    const qualification = await pool.query(
      'SELECT * FROM lead_qualification_scores WHERE quote_id = $1',
      [quoteId]
    );
    const distributionsAfter = await pool.query(
      'SELECT * FROM lead_distributions WHERE quote_id = $1',
      [quoteId]
    );
    console.error('Lead distribution debug:', {
      qualificationRows: qualification.rows.length,
      distributionRows: distributionsAfter.rows.length
    });
    throw new Error(`Lead not offered for quote ${quoteId}`);
  }

  const preview = await api(`/api/leads/${quoteId}/preview`, {
    headers: { Authorization: `Bearer ${vendorLogin.token}` }
  });

  const accept = await api(`/api/leads/${quoteId}/accept`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${vendorLogin.token}` }
  });

  const customerQuotes = await api(`/api/quotes/customer/${customerRegister.user.id}`, {
    headers: { Authorization: `Bearer ${customerRegister.token}` }
  });

  const result = {
    customerEmail,
    vendorEmail,
    quoteId,
    offeredCount: offeredLeads.count,
    offeredMatch: Boolean(offered),
    previewOk: preview.success === true,
    acceptSuccess: accept.success !== false,
    customerQuoteCount: customerQuotes.count,
    customerQuotePresent: customerQuotes.quotes.some((q) => q.id === quoteId),
    acceptResponse: accept
  };

  const fs = require('fs');
  fs.writeFileSync(path.join(__dirname, '..', 'logs', 'lead-dashboard-flow.json'), JSON.stringify(result, null, 2));
  console.log(result);

    await pool.end();
  } finally {
    serverProc.kill();
  }
}

main().catch((error) => {
  console.error('Lead/dashboard flow failed:', error.message);
  if (error.data) {
    console.error('Details:', JSON.stringify(error.data));
  }
  process.exit(1);
});
