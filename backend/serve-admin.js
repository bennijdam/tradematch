/**
 * Simple Static Server for Super Admin Panel
 * Run this to serve the admin panel on http://localhost:3002
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

// Serve static files from super admin panel directory
app.use(express.static(path.join(__dirname, '../tradematch-super-admin-panel')));

// Fallback to admin-login.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../tradematch-super-admin-panel/admin-login.html'));
});

app.listen(PORT, () => {
    console.log(`🎨 Super Admin Panel running at: http://localhost:${PORT}`);
    console.log(`📱 Login page: http://localhost:${PORT}/admin-login.html`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
    console.log(`👥 Users: http://localhost:${PORT}/admin-users.html`);
    console.log(`🏪 Vendors: http://localhost:${PORT}/admin-vendors.html`);
});
