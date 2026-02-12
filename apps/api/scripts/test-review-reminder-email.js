const dotenv = require('dotenv');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');

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

const API_BASE = process.env.BACKEND_URL || 'https://api.tradematch.uk';
const PASSWORD = 'ReviewPass123!';

async function api(route, options = {}) {
  const res = await fetch(`${API_BASE}${route}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status}`);
    error.data = data;
    throw error;
  }
  return data;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiWithRetry(route, options = {}, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await api(route, options);
    } catch (error) {
      lastError = error;
      if (error?.data?.details?.statusCode === 429 || error?.data?.details?.name === 'rate_limit_exceeded') {
        await sleep(1500 * attempt);
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function getTableColumns(pool, tableName) {
  const result = await pool.query(
    `SELECT column_name, is_nullable, column_default, data_type
     FROM information_schema.columns
     WHERE table_name = $1`,
    [tableName]
  );
  return result.rows;
}

function defaultForType(dataType) {
  if (!dataType) return null;
  const lowered = dataType.toLowerCase();
  if (lowered.includes('char') || lowered.includes('text')) return 'N/A';
  if (lowered.includes('bool')) return false;
  if (lowered.includes('int') || lowered.includes('numeric') || lowered.includes('decimal')) return 0;
  if (lowered.includes('timestamp') || lowered.includes('date')) return new Date();
  return null;
}

async function ensureVendorRow(pool, vendor) {
  const tableExists = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors'`
  );
  if (tableExists.rows.length === 0) return;

  const columns = await getTableColumns(pool, 'vendors');
  const columnSet = new Set(columns.map((col) => col.column_name));

  const idColumn = columnSet.has('user_id')
    ? 'user_id'
    : columnSet.has('vendor_id')
      ? 'vendor_id'
      : columnSet.has('id')
        ? 'id'
        : null;

  if (!idColumn) return;

  const exists = await pool.query(
    `SELECT 1 FROM vendors WHERE ${idColumn} = $1`,
    [vendor.id]
  );

  if (exists.rows.length > 0) return;

  const valuesByColumn = {
    id: vendor.id,
    user_id: vendor.id,
    vendor_id: vendor.id,
    name: vendor.name,
    company_name: vendor.name,
    business_name: vendor.name,
    email: vendor.email,
    postcode: vendor.postcode,
    average_rating: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  const requiredColumns = columns.filter(
    (col) => col.is_nullable === 'NO' && !col.column_default
  );

  for (const col of requiredColumns) {
    if (!(col.column_name in valuesByColumn)) {
      valuesByColumn[col.column_name] = defaultForType(col.data_type);
    }
  }

  const insertColumns = Object.keys(valuesByColumn).filter((key) => columnSet.has(key));
  const insertValues = insertColumns.map((key) => valuesByColumn[key]);
  const placeholders = insertValues.map((_, idx) => `$${idx + 1}`);

  await pool.query(
    `INSERT INTO vendors (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
    insertValues
  );
}

async function main() {
  const pool = new Pool({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    ssl: { rejectUnauthorized: false }
  });

  try {
    const customerEmail = `review_reminder_customer_${crypto.randomUUID().slice(0, 8)}@example.com`;
    const vendorEmail = `review_reminder_vendor_${crypto.randomUUID().slice(0, 8)}@example.com`;

    const customerRegister = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: customerEmail,
        password: PASSWORD,
        fullName: 'Review Reminder Customer',
        userType: 'customer',
        postcode: 'SW1A 1AA'
      })
    });

    const vendorRegister = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: vendorEmail,
        password: PASSWORD,
        fullName: 'Review Reminder Vendor',
        userType: 'vendor',
        postcode: 'SW1A 2AA'
      })
    });

    const vendorId = vendorRegister.user?.id || vendorRegister.userId;
    const customerId = customerRegister.user?.id || customerRegister.userId;

    await pool.query(
      'UPDATE users SET email_verified = TRUE WHERE id = ANY($1::text[])',
      [[customerId, vendorId]]
    );

    await ensureVendorRow(pool, {
      id: vendorId,
      name: 'Review Reminder Vendor',
      email: vendorEmail,
      postcode: 'SW1A 2AA'
    });

    const customerLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: customerEmail, password: PASSWORD })
    });

    const vendorLogin = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: vendorEmail, password: PASSWORD })
    });

    const customerToken = (customerLogin.token.startsWith('Bearer ')
      ? customerLogin.token.slice(7)
      : customerLogin.token).trim();

    const vendorToken = (vendorLogin.token.startsWith('Bearer ')
      ? vendorLogin.token.slice(7)
      : vendorLogin.token).trim();

    const quote = await api('/api/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        serviceType: 'plumbing',
        service: 'plumbing',
        serviceName: 'Plumbing',
        title: 'Review reminder test job',
        description: 'Testing review reminder flow.',
        postcode: 'SW1A 1AA',
        budgetMin: 100,
        budgetMax: 200,
        urgency: 'asap'
      })
    });

    const quoteId = quote.quoteId || quote.quote?.id || quote.id;

    const bid = await api('/api/bids', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorToken}` },
      body: JSON.stringify({
        quoteId,
        price: 150,
        message: 'Happy to take this job.',
        timeline: '1 week'
      })
    });

    const bidId = bid.bid?.id || bid.bidId || bid.id;

    await api(`/api/bids/${bidId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${customerToken}` }
    });

    const reminder = await apiWithRetry('/api/email/review-reminder', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        vendorName: 'Review Reminder Vendor',
        quoteId
      })
    });

    if (!reminder.success) {
      throw new Error('Review reminder email failed');
    }

    console.log('✅ Review reminder email sent');
    console.log('Review Reminder Email ID:', reminder.emailId);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Review reminder test failed:', err.data || err.message);
  process.exit(1);
});
