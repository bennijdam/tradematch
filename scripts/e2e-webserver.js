const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.E2E_PORT || 8080);
const WEB_ROOT = path.resolve(__dirname, '..', 'apps', 'web');

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    case '.ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}

function safeJoin(root, requestedPath) {
  const resolved = path.resolve(root, requestedPath.replace(/^\/+/, ''));
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function tryResolveFile(urlPath) {
  // Normalize Vercel-style /frontend prefix used in some configs.
  if (urlPath.startsWith('/frontend/')) urlPath = urlPath.replace('/frontend', '');

  // Root.
  if (urlPath === '/' || urlPath === '') {
    return safeJoin(WEB_ROOT, 'index.html');
  }

  // If explicitly requesting a file extension, try that directly.
  if (path.extname(urlPath)) {
    return safeJoin(WEB_ROOT, urlPath);
  }

  // Clean URL -> .html (e.g. /login -> login.html)
  const htmlCandidate = safeJoin(WEB_ROOT, `${urlPath}.html`);
  if (htmlCandidate && fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
    return htmlCandidate;
  }

  // Directory index (e.g. /user-dashboard -> user-dashboard/index.html)
  const indexCandidate = safeJoin(WEB_ROOT, path.join(urlPath, 'index.html'));
  if (indexCandidate && fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
    return indexCandidate;
  }

  // Fallback: serve 404.html if present.
  const notFoundCandidate = safeJoin(WEB_ROOT, '404.html');
  if (notFoundCandidate && fs.existsSync(notFoundCandidate) && fs.statSync(notFoundCandidate).isFile()) {
    return notFoundCandidate;
  }

  return null;
}

function proxyToApi(req, res, parsedUrl) {
  const upstreamBase = process.env.E2E_API_PROXY_BASE || 'https://api.tradematch.uk';
  const upstream = new URL(upstreamBase);
  const upstreamPath = parsedUrl.pathname.replace(/^\/api\//, '/api/');
  const upstreamUrl = new URL(upstreamPath + parsedUrl.search, upstream);

  const options = {
    method: req.method,
    headers: {
      ...req.headers,
      host: upstreamUrl.host
    }
  };

  const upstreamReq = https.request(upstreamUrl, options, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, error: 'api_proxy_error', message: String(err?.message || err) }));
  });

  if (req.method === 'GET' || req.method === 'HEAD') {
    upstreamReq.end();
    return;
  }

  req.pipe(upstreamReq);
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = parsedUrl.pathname;

  // E2E stubs: keep sanity checks fast and deterministic without relying on an external API.
  if (urlPath === '/api/webhooks/stripe') {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, error: 'stripe_signature_required' }));
    return;
  }

  if (urlPath === '/api/email/welcome') {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, error: 'email_payload_invalid' }));
    return;
  }

  // Proxy API calls to match Vercel rewrite behavior.
  if (urlPath === '/api' || urlPath.startsWith('/api/')) {
    proxyToApi(req, res, parsedUrl);
    return;
  }

  const filePath = tryResolveFile(urlPath);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error');
      return;
    }

    const isHtml = path.extname(filePath).toLowerCase() === '.html';
    res.writeHead(filePath.endsWith('404.html') ? 404 : 200, {
      'Content-Type': getContentType(filePath),
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[e2e-webserver] serving ${WEB_ROOT} at http://localhost:${PORT}`);
});
