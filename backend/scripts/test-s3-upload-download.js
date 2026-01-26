const httpBase = process.env.API_BASE || 'http://localhost:3001';

const run = async () => {
  const loginRes = await fetch(`${httpBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testuser_1769330515@example.com', password: 'TestPass123!' })
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
  const loginData = await loginRes.json();

  const pngPayload = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const presignRes = await fetch(`${httpBase}/api/uploads/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${loginData.token}` },
    body: JSON.stringify({ filename: 'smoke-upload.png', contentType: 'image/png', folder: 'smoke-tests', contentLength: pngPayload.length })
  });
  if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);
  const presign = await presignRes.json();

  const uploadRes = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: pngPayload
  });

  const signedRes = await fetch(`${httpBase}/api/uploads/signed-url?key=${encodeURIComponent(presign.key)}`, {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  if (!signedRes.ok) throw new Error(`Signed URL failed: ${signedRes.status}`);
  const signed = await signedRes.json();

  console.log(JSON.stringify({
    presign: 'ok',
    uploadStatus: uploadRes.status,
    signedUrl: signed.url ? 'ok' : 'missing'
  }, null, 2));
  
    const downloadRes = await fetch(signed.url, { method: 'GET' });
    const downloaded = Buffer.from(await downloadRes.arrayBuffer());
    const matches = Buffer.compare(downloaded, pngPayload) === 0;
    console.log(JSON.stringify({ downloadStatus: downloadRes.status, bytes: downloaded.length, matches }, null, 2));
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
