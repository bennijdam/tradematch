const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');
const crypto = require('crypto');
const LeadSystemIntegrationService = require('../services/lead-system-integration.service');

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

const SERVICE_TYPE = 'plumbing';
const TARGET_VENDOR_COUNT = 10;
const TARGET_CUSTOMER_COUNT = 10;
const MIN_VENDOR_CREDITS = 50;
const TEST_CREDIT_TOPUP = 10;
const SPEND_CREDITS_TO = 0;

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? local : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${visible}@${domain}`;
};

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

async function spendVendorCredits(pool, vendorId, amount) {
  const columnsResult = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_credits'`
  );
  const columns = new Set(columnsResult.rows.map((row) => row.column_name));

  const hasBalance = columns.has('balance');
  const hasAvailable = columns.has('available_credits');
  const hasTotalSpent = columns.has('total_spent_credits');

  const updateParts = [];
  const params = [vendorId, amount];

  if (hasBalance) updateParts.push('balance = GREATEST(balance - $2, 0)');
  if (hasAvailable) updateParts.push('available_credits = GREATEST(available_credits - $2, 0)');
  if (hasTotalSpent) updateParts.push('total_spent_credits = COALESCE(total_spent_credits, 0) + $2');

  if (!updateParts.length) {
    throw new Error('vendor_credits table missing balance/available_credits columns');
  }

  await pool.query(
    `UPDATE vendor_credits SET ${updateParts.join(', ')} WHERE vendor_id = $1`,
    params
  );

  const creditTxnColumns = await getTableColumns(pool, 'credit_transactions');
  if (creditTxnColumns.size > 0) {
    const txnColumns = ['vendor_id', 'amount', 'transaction_type', 'description'];
    const txnValues = ['$1', '$2', '$3', '$4'];
    const txnParams = [vendorId, amount, 'spend', 'Test credit spend for lead distribution'];

    if (creditTxnColumns.has('reference_id')) {
      txnColumns.push('reference_id');
      txnValues.push('$5');
      txnParams.push(null);
    }

    await pool.query(
      `INSERT INTO credit_transactions (${txnColumns.join(', ')}) VALUES (${txnValues.join(', ')})`,
      txnParams
    );
  }
}

async function getTableColumns(pool, tableName) {
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = $1`,
    [tableName]
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function resolveQuoteCustomerColumn(pool) {
  const columns = await getTableColumns(pool, 'quotes');
  return columns.has('customer_id') ? 'customer_id' : 'user_id';
}

function addService(services, serviceType) {
  if (!services || typeof services !== 'string') return serviceType;
  const parts = services.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.some((s) => s.toLowerCase() === serviceType.toLowerCase())) {
    return parts.join(',');
  }
  parts.push(serviceType);
  return parts.join(',');
}

async function main() {
  if (!process.env.BACKEND_URL || process.env.BACKEND_URL.includes('onrender.com')) {
    process.env.BACKEND_URL = 'https://api.tradematch.uk';
  }

  const pool = new Pool({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const vendorRows = await pool.query(
      `SELECT id, email, full_name, name, services
       FROM users
       WHERE user_type = 'vendor'
         AND email IS NOT NULL
       ORDER BY created_at DESC NULLS LAST
       LIMIT 30`
    );

    const customerRows = await pool.query(
      `SELECT id, email, full_name, name
       FROM users
       WHERE user_type = 'customer'
         AND email IS NOT NULL
       ORDER BY created_at DESC NULLS LAST
       LIMIT 30`
    );

    const vendors = vendorRows.rows.slice(0, TARGET_VENDOR_COUNT);
    const customers = customerRows.rows.slice(0, TARGET_CUSTOMER_COUNT);

    if (vendors.length < 5) {
      throw new Error(`Need at least 5 vendors for lead distribution. Found ${vendors.length}.`);
    }

    if (vendors.length < TARGET_VENDOR_COUNT || customers.length < TARGET_CUSTOMER_COUNT) {
      console.warn(`⚠️ Not enough users for full target. Vendors: ${vendors.length}/${TARGET_VENDOR_COUNT}, Customers: ${customers.length}/${TARGET_CUSTOMER_COUNT}`);
    }

    const vendorIds = vendors.map((v) => v.id);
    const customerIds = customers.map((c) => c.id);

    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ANY($1::text[])', [vendorIds]);
    await pool.query('UPDATE users SET email_verified = TRUE WHERE id = ANY($1::text[])', [customerIds]);

    for (const vendor of vendors) {
      const updatedServices = addService(vendor.services, SERVICE_TYPE);
      await pool.query('UPDATE users SET services = $1 WHERE id = $2', [updatedServices, vendor.id]);
      await ensureVendorCredits(pool, vendor.id, MIN_VENDOR_CREDITS);
    }

    const testVendor = vendors[0];
    if (testVendor) {
      await ensureVendorCredits(pool, testVendor.id, TEST_CREDIT_TOPUP);
      await spendVendorCredits(pool, testVendor.id, TEST_CREDIT_TOPUP - SPEND_CREDITS_TO);
    }

    const quoteId = `quote_lead_test_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const customer = customers[0];
    const quoteColumns = await getTableColumns(pool, 'quotes');
    const customerColumn = await resolveQuoteCustomerColumn(pool);

    const quotePayload = {
      id: quoteId,
      [customerColumn]: customer.id,
      service_type: SERVICE_TYPE,
      service: SERVICE_TYPE,
      category: SERVICE_TYPE,
      title: 'Lead distribution email test',
      description: 'Testing lead distribution with 5 vendors and customer confirmation email.',
      postcode: 'SW1A 1AA',
      budget_min: 150,
      budget_max: 450,
      urgency: 'asap',
      status: 'open',
      additional_details: null,
      photos: null
    };

    const insertColumns = Object.entries(quotePayload)
      .filter(([key, value]) => value !== undefined && quoteColumns.has(key))
      .map(([key]) => key);

    const insertValues = insertColumns.map((_, idx) => `$${idx + 1}`);
    const insertParams = insertColumns.map((key) => quotePayload[key]);

    await pool.query(
      `INSERT INTO quotes (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')})`,
      insertParams
    );

    const customerResult = await pool.query('SELECT * FROM users WHERE id = $1', [customer.id]);
    const customerRow = customerResult.rows[0];

    const leadService = new LeadSystemIntegrationService(pool, null);
    await leadService.processNewLead(
      {
        id: quoteId,
        serviceType: SERVICE_TYPE,
        title: quotePayload.title,
        description: quotePayload.description,
        postcode: quotePayload.postcode,
        budgetMin: quotePayload.budget_min,
        budgetMax: quotePayload.budget_max,
        urgency: quotePayload.urgency
      },
      customerRow
    );

    const distributionRows = await pool.query(
      `SELECT ld.vendor_id, ld.match_score, u.email, COALESCE(u.full_name, u.name, u.email) AS name
       FROM lead_distributions ld
       JOIN users u ON u.id = ld.vendor_id
       WHERE ld.quote_id = $1
       ORDER BY ld.match_score DESC NULLS LAST, ld.distribution_order ASC`,
      [quoteId]
    );

    const matchedVendors = distributionRows.rows;
    const matchedCount = matchedVendors.length;

    console.log('✅ Lead distribution email test completed.');
    console.log(`Quote: ${quoteId}`);
    console.log(`Customer: ${maskEmail(customer.email)}`);
    console.log(`Matched vendors: ${matchedCount}`);
    matchedVendors.slice(0, 5).forEach((vendor, idx) => {
      console.log(`  ${idx + 1}. ${vendor.name} (${maskEmail(vendor.email)}) score ${vendor.match_score ?? 'n/a'}`);
    });

    if (testVendor) {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      const reminderRes = await fetch(`${backendUrl}/api/email/credits-purchase-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: testVendor.id, creditsRemaining: SPEND_CREDITS_TO })
      });

      if (!reminderRes.ok) {
        const errorPayload = await reminderRes.json().catch(() => ({}));
        console.error('Credits reminder failed:', { status: reminderRes.status, errorPayload });

        const fallbackHtml = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">
            <h2>Low credits alert</h2>
            <p>Your TradeMatch credits are running low. Top up to keep receiving new leads.</p>
            <p><strong>Credits remaining:</strong> ${SPEND_CREDITS_TO}</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor-credits.html">Buy Credits</a></p>
          </div>
        `;

        const sendRes = await fetch(`${backendUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: testVendor.email,
            subject: '🧾 Low credits - top up to keep receiving leads',
            html: fallbackHtml,
            userId: testVendor.id,
            emailType: 'creditUpdates'
          })
        });

        if (!sendRes.ok) {
          const sendError = await sendRes.json().catch(() => ({}));
          console.error('Fallback credits reminder failed:', { status: sendRes.status, sendError });
        } else {
          console.log('✅ Credits purchase reminder sent via fallback email endpoint');
        }
      } else {
        console.log('✅ Credits purchase reminder sent to test vendor');
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Lead distribution email test failed:', err);
  process.exit(1);
});
