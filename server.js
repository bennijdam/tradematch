const http = require('http');
const fs = require('fs');
const path = require('path');

const cleanRoutes = {
    '/': '/index.html',
    '/login': '/pages/auth-login.html',
    '/signup': '/pages/auth-register.html',
    '/select-role': '/pages/auth-select-role.html',
    '/activate': '/pages/activate.html',
    '/about': '/pages/about.html',
    '/contact': '/pages/contact.html',
    '/help': '/pages/help.html',
    '/how-it-works': '/pages/how-it-works.html',
    '/find-tradespeople': '/pages/find-tradespeople.html',
    '/terms': '/pages/terms.html',
    '/privacy': '/pages/privacy.html',
    '/cookies': '/pages/cookies.html',
    '/blog': '/pages/blog.html',
    '/post-job': '/pages/quote-engine.html',
    '/trade-signup': '/pages/vendor-register.html'
};

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let urlPath = parsedUrl.pathname;

    if (cleanRoutes[urlPath]) {
        urlPath = cleanRoutes[urlPath];
    } else if (urlPath.endsWith('/')) {
        urlPath = `${urlPath}index.html`;
    }

    let filePath;
    if (urlPath.startsWith('/frontend/')) {
        filePath = path.join('.', urlPath.replace(/^\/+/, ''));
    } else {
        filePath = path.join('.', 'frontend', urlPath.replace(/^\/+/, ''));
    }

    fs.stat(filePath, (statError, stats) => {
        if (!statError && stats.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon'
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(500);
                    res.end('Server Error', 'utf-8');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });
});

const PORT = 8000;
server.listen(PORT, () => {
    console.log(`🚀 TradeMatch Local Server running at http://localhost:${PORT}`);
    console.log(`📱 Main page: http://localhost:${PORT}`);
    console.log(`🔧 Quote Engine: http://localhost:${PORT}/post-job`);
    console.log(`👷 Vendor Portal: http://localhost:${PORT}/trade-signup`);
    console.log(`🧪 API Test: http://localhost:${PORT}/pages/api-test.html`);
});