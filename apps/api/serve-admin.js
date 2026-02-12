/**
 * Simple Static Server for Super Admin Panel
 * Run this to serve the admin panel on http://localhost:3002
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

// Serve static files from super admin SPA directory
app.use(express.static(path.join(__dirname, '..', '..', 'public', 'super-admin-dashboard')));

// Fallback to SPA entry
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'public', 'super-admin-dashboard', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎨 Super Admin Panel running at: http://localhost:${PORT}`);
    console.log(`📱 SPA: http://localhost:${PORT}/#/super-admin/dashboard`);
});
