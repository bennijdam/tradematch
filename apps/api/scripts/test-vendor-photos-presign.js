const dotenv = require('dotenv');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3002';
const PASSWORD = 'UploadPass123!';

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
  const email = `vendor_upload_${crypto.randomUUID().slice(0, 8)}@example.com`;

  await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: PASSWORD,
      fullName: 'Upload Vendor',
      userType: 'vendor',
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

  const presign = await api('/api/vendor/photos/presign', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      filename: 'test.jpg',
      contentType: 'image/jpeg'
    })
  });

  const uploadRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: Buffer.from('test')
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed');
  }

  const confirm = await api('/api/vendor/photos/confirm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key: presign.key, photoUrl: presign.photoUrl })
  });

  await api('/api/vendor/photos', {
    headers: { Authorization: `Bearer ${token}` }
  });

  await api(`/api/vendor/photos/${confirm.photo.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log('✅ Presign+upload+confirm+list+delete OK');
}

main().catch((err) => {
  console.error('❌ Presign test failed:', err.data || err.message);
  process.exit(1);
});
