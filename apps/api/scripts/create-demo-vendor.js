#!/usr/bin/env node

/**
 * Create or update a demo vendor account.
 */

const crypto = require('crypto');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

require('dotenv').config();

const DEMO_EMAIL = 'support@tradematch.uk';
const DEMO_PASSWORD = 'Achilles786$';
const DEMO_NAME = 'TradeMatch Support';
const DEMO_POSTCODE = 'SW1A 1AA';
const DEMO_PHONE = '07000000000';
const DEMO_DESCRIPTION = 'Support demo vendor account.';

function now() {
  return new Date();
}

function valueForColumn(column, userId) {
  const name = column.column_name;
  const dataType = column.data_type;

  if (name === 'id' || name === 'vendor_id') return userId;
  if (name === 'user_id') return userId;
  if (name === 'company_name' || name === 'business_name' || name === 'name') return DEMO_NAME;
  if (name === 'email') return DEMO_EMAIL;
  if (name === 'phone') return DEMO_PHONE;
  if (name === 'postcode' || name === 'post_code') return DEMO_POSTCODE;
  if (name === 'status') return 'active';
  if (name === 'service_areas') return DEMO_POSTCODE;
  if (name === 'services') return ['General'];
  if (name === 'description') return DEMO_DESCRIPTION;
  if (name === 'years_experience') return 5;
  if (name === 'created_at' || name === 'updated_at' || name === 'approved_at' || name === 'onboarded_at') return now();
  if (name === 'metadata') return {};

  if (dataType === 'boolean') return false;
  if (dataType === 'integer' || dataType === 'numeric' || dataType === 'double precision') return 0;
  if (dataType === 'json' || dataType === 'jsonb') return {};
  if (dataType.includes('timestamp')) return now();
  if (dataType === 'uuid') return userId;

  return 'N/A';
}

async function upsertUser(client, passwordHash) {
  const existing = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_EMAIL]);
  const userId = existing.rows[0]?.id || crypto.randomUUID();

  await client.query(
    `INSERT INTO users (id, email, password_hash, full_name, name, role, user_type, status, email_verified, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW())
     ON CONFLICT (email)
     DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       full_name = EXCLUDED.full_name,
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       user_type = EXCLUDED.user_type,
       status = EXCLUDED.status,
       email_verified = true`,
    [userId, DEMO_EMAIL, passwordHash, DEMO_NAME, DEMO_NAME, 'vendor', 'vendor', 'active']
  );

  return userId;
}

async function upsertVendorProfile(client, userId) {
  const columnsResult = await client.query(
    "SELECT column_name, is_nullable, column_default, data_type FROM information_schema.columns WHERE table_name = 'vendors' ORDER BY ordinal_position"
  );

  if (!columnsResult.rows.length) {
    console.warn('vendors table not found; skipping vendor profile creation.');
    return;
  }

  const columns = columnsResult.rows;
  const columnNames = new Set(columns.map((col) => col.column_name));

  if (columnNames.has('user_id')) {
    await client.query('DELETE FROM vendors WHERE user_id = $1', [userId]);
  } else if (columnNames.has('id')) {
    await client.query('DELETE FROM vendors WHERE id = $1', [userId]);
  }

  const requiredColumns = columns.filter((col) => col.is_nullable === 'NO' && !col.column_default);
  const insertColumns = [];
  const values = [];

  for (const col of requiredColumns) {
    insertColumns.push(col.column_name);
    values.push(valueForColumn(col, userId));
  }

  if (insertColumns.length === 0) {
    console.warn('No required columns without defaults; skipping vendor profile insert.');
    return;
  }

  const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`).join(', ');
  await client.query(
    `INSERT INTO vendors (${insertColumns.join(', ')}) VALUES (${placeholders})`,
    values
  );
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const userId = await upsertUser(client, passwordHash);
  await upsertVendorProfile(client, userId);

  await client.end();
  console.log('Demo vendor account ready:', DEMO_EMAIL);
}

run().catch((error) => {
  console.error('Failed to create demo vendor:', error.message);
  process.exit(1);
});
