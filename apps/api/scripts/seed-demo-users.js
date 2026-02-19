/* eslint-disable no-console */

const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizeUserType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'vendor' || normalized === 'tradesperson') return 'vendor';
  if (normalized === 'customer' || normalized === 'user') return 'customer';
  return null;
}

function randomPassword(prefix) {
  const suffix = crypto.randomBytes(4).toString('hex');
  // Ensure complexity: upper + lower + digit + symbol
  return `${prefix}-${suffix}-A1!`;
}

function signActivationToken({ userId, email }) {
  const jwtSecret = requiredEnv('JWT_SECRET');
  return jwt.sign(
    {
      purpose: 'email_verification',
      userId,
      email
    },
    jwtSecret,
    { expiresIn: '24h' }
  );
}

async function getUserColumns(client) {
  const result = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`
  );
  return new Set(result.rows.map((row) => row.column_name));
}

async function upsertDemoUser(client, { userType, fullName, email, password, postcode }) {
  const columns = await getUserColumns(client);

  const normalizedEmail = email.toLowerCase();
  const normalizedType = normalizeUserType(userType) || 'customer';

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await client.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);

  if (existing.rows.length) {
    const user = existing.rows[0];

    const updates = [];
    const values = [];
    let idx = 1;

    if (columns.has('user_type')) {
      updates.push(`user_type = $${idx++}`);
      values.push(normalizedType);
    }

    if (columns.has('full_name')) {
      updates.push(`full_name = $${idx++}`);
      values.push(fullName);
    }

    if (columns.has('name')) {
      updates.push(`name = $${idx++}`);
      values.push(fullName);
    }

    if (columns.has('password_hash')) {
      updates.push(`password_hash = $${idx++}`);
      values.push(passwordHash);
    } else if (columns.has('password')) {
      updates.push(`password = $${idx++}`);
      values.push(passwordHash);
    }

    if (columns.has('postcode')) {
      updates.push(`postcode = $${idx++}`);
      values.push(postcode);
    }

    if (columns.has('oauth_provider')) {
      updates.push(`oauth_provider = $${idx++}`);
      values.push('local');
    }

    if (columns.has('email_verified')) {
      updates.push(`email_verified = $${idx++}`);
      values.push(true);
    }

    if (columns.has('status')) {
      updates.push(`status = $${idx++}`);
      values.push('active');
    }

    if (columns.has('active')) {
      updates.push(`active = $${idx++}`);
      values.push(true);
    }

    if (!updates.length) {
      return { id: user.id, email: user.email, userType: user.user_type || normalizedType };
    }

    values.push(user.id);
    await client.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);

    const refreshed = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
    return refreshed.rows[0];
  }

  const userId = crypto.randomUUID();

  const insertColumns = [];
  const insertValues = [];
  const params = [];
  let idx = 1;

  const add = (col, value) => {
    if (!columns.has(col)) return;
    insertColumns.push(col);
    insertValues.push(`$${idx++}`);
    params.push(value);
  };

  add('id', userId);
  add('user_type', normalizedType);
  add('full_name', fullName);
  add('name', fullName);
  add('email', normalizedEmail);
  add('phone', null);
  add('password_hash', passwordHash);
  add('password', passwordHash);
  add('postcode', postcode);
  add('oauth_provider', 'local');
  add('email_verified', true);
  add('status', 'active');
  add('active', true);

  if (!insertColumns.length) {
    throw new Error('Unable to seed demo user: users table has unexpected columns');
  }

  const sql = `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING *`;
  const created = await client.query(sql, params);
  return created.rows[0];
}

async function main() {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const frontendBase = (process.env.FRONTEND_URL || 'https://www.tradematch.uk').replace(/\/$/, '');

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  const customerEmail = `demo.customer+${stamp}@example.com`;
  const vendorEmail = `demo.vendor+${stamp}@example.com`;

  const customerPassword = randomPassword('DemoCustomer');
  const vendorPassword = randomPassword('DemoVendor');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const customer = await upsertDemoUser(client, {
      userType: 'customer',
      fullName: 'Demo Customer',
      email: customerEmail,
      password: customerPassword,
      postcode: 'SW1A 1AA'
    });

    const vendor = await upsertDemoUser(client, {
      userType: 'vendor',
      fullName: 'Demo Vendor',
      email: vendorEmail,
      password: vendorPassword,
      postcode: 'EC1A 1BB'
    });

    const customerActivationToken = signActivationToken({ userId: customer.id, email: customer.email });
    const vendorActivationToken = signActivationToken({ userId: vendor.id, email: vendor.email });

    const payload = {
      customer: {
        email: customer.email,
        password: customerPassword,
        activationToken: customerActivationToken,
        activationUrl: `${frontendBase}/activate?token=${encodeURIComponent(customerActivationToken)}`
      },
      vendor: {
        email: vendor.email,
        password: vendorPassword,
        activationToken: vendorActivationToken,
        activationUrl: `${frontendBase}/activate?token=${encodeURIComponent(vendorActivationToken)}`
      }
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
