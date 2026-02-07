const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = process.env.BACKEND_URL || 'https://api.tradematch.uk';
const PASSWORD = 'UploadPass123!';
const testContentType = process.env.UPLOAD_TEST_CONTENT_TYPE
  || (process.env.ALLOWED_FILE_TYPES
    ? process.env.ALLOWED_FILE_TYPES.split(',').map((value) => value.trim()).filter(Boolean)[0]
    : 'image/jpeg');

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

async function main() {
  const email = `upload_test_${crypto.randomUUID().slice(0, 8)}@example.com`;

  await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: PASSWORD,
      fullName: 'Upload Test',
      userType: 'customer',
      postcode: 'SW1A 1AA'
    })
  });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pool.query('UPDATE users SET email_verified = TRUE WHERE email = $1', [email]);
  } finally {
    await pool.end();
  }

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASSWORD })
  });

  if (!login.token) {
    throw new Error(`Login response missing token: ${JSON.stringify(login)}`);
  }

  const token = (login.token.startsWith('Bearer ')
    ? login.token.slice(7)
    : login.token).trim();

  const presign = await api('/api/uploads/presign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      filename: 'test.jpg',
      contentType: testContentType,
      contentLength: 10,
      folder: 'uploads'
    })
  });

  console.log('✅ Presign ok');
  console.log('Key:', presign.key);
  console.log('Upload URL:', presign.uploadUrl);
}

main().catch((err) => {
  console.error('❌ Presign test failed:', err.data || err.message);
  process.exit(1);
});
