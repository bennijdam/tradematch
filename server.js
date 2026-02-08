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
    '/trade-signup': '/pages/vendor-register.html',
    '/user-dashboard': '/user-dashboard/index.html',
    '/vendor-dashboard': '/vendor-dashboard/index.html',
    '/super-admin': '/super-admin-dashboard/index.html',
    '/user-dashboard/billing-addons': '/user-dashboard/pages/billing-addons.html',
    '/user-dashboard/billing': '/user-dashboard/pages/billing.html',
    '/user-dashboard/dashboard': '/user-dashboard/pages/dashboard.html',
    '/user-dashboard/edit-job-modal': '/user-dashboard/pages/edit-job-modal.html',
    '/user-dashboard/job-details': '/user-dashboard/pages/job-details.html',
    '/user-dashboard/job-quotes': '/user-dashboard/pages/job-quotes.html',
    '/user-dashboard/messages': '/user-dashboard/pages/messages.html',
    '/user-dashboard/my-jobs': '/user-dashboard/pages/my-jobs.html',
    '/user-dashboard/notifications': '/user-dashboard/pages/notifications.html',
    '/user-dashboard/post-job': '/user-dashboard/pages/post-job.html',
    '/user-dashboard/profile': '/user-dashboard/pages/profile.html',
    '/user-dashboard/quotes': '/user-dashboard/pages/quotes.html',
    '/user-dashboard/reviews': '/user-dashboard/pages/reviews.html',
    '/user-dashboard/saved-trades': '/user-dashboard/pages/saved-trades.html',
    '/user-dashboard/settings': '/user-dashboard/pages/settings.html',
    '/user-dashboard/your-quotes': '/user-dashboard/pages/your-quotes.html',
    '/vendor-dashboard/vendor-active-quotes': '/vendor-dashboard/pages/vendor-active-quotes.html',
    '/vendor-dashboard/vendor-analytics': '/vendor-dashboard/pages/vendor-analytics.html',
    '/vendor-dashboard/vendor-archived-jobs': '/vendor-dashboard/pages/vendor-archived-jobs.html',
    '/vendor-dashboard/vendor-badges': '/vendor-dashboard/pages/vendor-badges.html',
    '/vendor-dashboard/vendor-billing': '/vendor-dashboard/pages/vendor-billing.html',
    '/vendor-dashboard/vendor-coverage': '/vendor-dashboard/pages/vendor-coverage.html',
    '/vendor-dashboard/vendor-dashboard-enhanced': '/vendor-dashboard/pages/vendor-dashboard-enhanced.html',
    '/vendor-dashboard/vendor-dashboard-with-modals': '/vendor-dashboard/pages/vendor-dashboard-with-modals.html',
    '/vendor-dashboard/vendor-heatmaps': '/vendor-dashboard/pages/vendor-heatmaps.html',
    '/vendor-dashboard/vendor-impressions': '/vendor-dashboard/pages/vendor-impressions.html',
    '/vendor-dashboard/vendor-messages': '/vendor-dashboard/pages/vendor-messages.html',
    '/vendor-dashboard/vendor-new-jobs': '/vendor-dashboard/pages/vendor-new-jobs.html',
    '/vendor-dashboard/vendor-new-leads': '/vendor-dashboard/pages/vendor-new-leads.html',
    '/vendor-dashboard/vendor-profile': '/vendor-dashboard/pages/vendor-profile.html',
    '/vendor-dashboard/vendor-settings': '/vendor-dashboard/pages/vendor-settings.html',
    '/vendor-dashboard/vendor-timeline': '/vendor-dashboard/pages/vendor-timeline.html'
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