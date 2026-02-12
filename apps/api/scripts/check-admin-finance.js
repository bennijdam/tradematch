const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function api(pathname, options = {}) {
    const res = await fetch(`${API_BASE}${pathname}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function main() {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables');
    }

    const login = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });

    const token = login.token;

    const adminStats = await api('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const financeLedger = await api('/api/admin/finance/ledger', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const financeReconciliation = await api('/api/admin/finance/reconciliation', {
        headers: { Authorization: `Bearer ${token}` }
    });

    console.log({
        adminStatsOk: !!adminStats.success,
        financeLedgerOk: !!financeLedger.success,
        financeReconciliationOk: !!financeReconciliation.success
    });
}

main().catch((error) => {
    console.error('Admin/finance check failed:', {
        message: error.message,
        status: error.status,
        data: error.data
    });
    process.exitCode = 1;
});
