/**
 * Super Admin Dashboard API Client
 * Handles all API calls and authentication for the admin panel
 */

const isLocal = window.location.protocol === 'file:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

const API_CONFIG = {
    BASE_URL: isLocal
        ? 'http://localhost:3001'
        : 'https://tradematch.onrender.com',
    ENDPOINTS: {
        // Stats
        STATS: '/api/admin/stats',
        ACTIVITY: '/api/admin/activity',
        CHARTS: '/api/admin/charts',
        
        // Users
        USERS: '/api/admin/users',
        USER_DETAIL: '/api/admin/users/:id',
        USER_STATUS: '/api/admin/users/:id/status',
        
        // Vendors
        VENDORS_PENDING: '/api/admin/vendors/pending',
        VENDOR_APPROVE: '/api/admin/vendors/:id/approve',
        VENDOR_REJECT: '/api/admin/vendors/:id/reject',
        
        // Reviews
        REVIEWS_PENDING: '/api/admin/reviews/pending',
        REVIEW_MODERATE: '/api/admin/reviews/:id/moderate',

        // Finance
        FINANCE_REASONS: '/api/admin/finance/reason-codes',
        FINANCE_REFUNDS: '/api/admin/finance/refunds',
        FINANCE_CREDITS: '/api/admin/finance/credits',
        FINANCE_LEDGER: '/api/admin/finance/ledger',
        FINANCE_RECONCILIATION: '/api/admin/finance/reconciliation',
        FINANCE_RECONCILIATION_STRIPE: '/api/admin/finance/reconciliation/stripe',
        FINANCE_RECONCILIATION_EXPORT: '/api/admin/finance/reconciliation/export',
        FINANCE_CREDITS_EXPIRE: '/api/admin/finance/credits/expire',
        FINANCE_CREDITS_CONSUME: '/api/admin/finance/credits/consume',
        FINANCE_RECONCILIATION_REPORT: '/api/admin/finance/reconciliation/report',
        FINANCE_RECONCILIATION_TX_EXPORT: '/api/admin/finance/reconciliation/transactions/export',
        FINANCE_RECONCILIATION_PAYMENTS: '/api/admin/finance/reconciliation/payments',
        FINANCE_RECONCILIATION_PAYMENTS_EXPORT: '/api/admin/finance/reconciliation/payments/export',
        
        // Auth
        LOGIN: '/api/auth/login',
        VERIFY: '/api/auth/verify',
        LOGOUT: '/api/auth/logout'
    }
};

class AdminAPI {
    constructor() {
        this.token = localStorage.getItem('admin_token');
        this.user = JSON.parse(localStorage.getItem('admin_user') || 'null');
    }

    /**
     * Get authorization headers
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    /**
     * Handle API response
     */
    async handleResponse(response) {
        if (response.status === 401) {
            // Token expired or invalid
            this.logout();
            window.location.href = 'admin-login.html';
            throw new Error('Session expired. Please login again.');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Request failed with status ${response.status}`);
        }

        return data;
    }

    /**
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * Replace params in endpoint path
     */
    buildEndpoint(endpoint, params = {}) {
        let url = endpoint;
        Object.keys(params).forEach(key => {
            url = url.replace(`:${key}`, params[key]);
        });
        return url;
    }

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    async login(email, password) {
        const data = await this.request(API_CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (!['super_admin', 'finance_admin'].includes(data.role)) {
            throw new Error('Admin access required');
        }

        this.token = data.token;
        this.user = {
            userId: data.userId,
            email: data.email,
            name: data.name,
            role: data.role
        };

        localStorage.setItem('admin_token', this.token);
        localStorage.setItem('admin_user', JSON.stringify(this.user));

        return data;
    }

    // ============================================================
    // FINANCE
    // ============================================================

    async getFinanceReasonCodes() {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_REASONS);
    }

    async createRefund(payload) {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_REFUNDS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async issueVendorCredit(payload) {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_CREDITS, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async consumeVendorCredit(payload) {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_CREDITS_CONSUME, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getLedger(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query
            ? `${API_CONFIG.ENDPOINTS.FINANCE_LEDGER}?${query}`
            : API_CONFIG.ENDPOINTS.FINANCE_LEDGER;
        return await this.request(endpoint);
    }

    async getReconciliation(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query
            ? `${API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION}?${query}`
            : API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION;
        return await this.request(endpoint);
    }

    async getReconciliationReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query
            ? `${API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION_REPORT}?${query}`
            : API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION_REPORT;
        return await this.request(endpoint);
    }

    async getPaymentReconciliation() {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION_PAYMENTS);
    }

    async getStripeReconciliation(params = {}) {
        const query = new URLSearchParams(params).toString();
        const endpoint = query
            ? `${API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION_STRIPE}?${query}`
            : API_CONFIG.ENDPOINTS.FINANCE_RECONCILIATION_STRIPE;
        return await this.request(endpoint);
    }

    async expireCredits() {
        return await this.request(API_CONFIG.ENDPOINTS.FINANCE_CREDITS_EXPIRE, {
            method: 'POST'
        });
    }

    async verifyToken() {
        try {
            return await this.request(API_CONFIG.ENDPOINTS.VERIFY);
        } catch (error) {
            this.logout();
            return null;
        }
    }

    logout() {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        this.token = null;
        this.user = null;
    }

    // ============================================================
    // DASHBOARD STATS
    // ============================================================

    async getStats(period = '30d') {
        return await this.request(`${API_CONFIG.ENDPOINTS.STATS}?period=${period}`);
    }

    async getActivity(limit = 20) {
        return await this.request(`${API_CONFIG.ENDPOINTS.ACTIVITY}?limit=${limit}`);
    }

    async getCharts(period = '30d') {
        return await this.request(`${API_CONFIG.ENDPOINTS.CHARTS}?period=${period}`);
    }

    // ============================================================
    // USER MANAGEMENT
    // ============================================================

    async getUsers(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return await this.request(`${API_CONFIG.ENDPOINTS.USERS}?${params}`);
    }

    async getUserDetail(userId) {
        const endpoint = this.buildEndpoint(API_CONFIG.ENDPOINTS.USER_DETAIL, { id: userId });
        return await this.request(endpoint);
    }

    async updateUserStatus(userId, status, reason = '') {
        const endpoint = this.buildEndpoint(API_CONFIG.ENDPOINTS.USER_STATUS, { id: userId });
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ status, reason })
        });
    }

    // ============================================================
    // VENDOR MANAGEMENT
    // ============================================================

    async getPendingVendors() {
        return await this.request(API_CONFIG.ENDPOINTS.VENDORS_PENDING);
    }

    async approveVendor(vendorId, notes = '') {
        const endpoint = this.buildEndpoint(API_CONFIG.ENDPOINTS.VENDOR_APPROVE, { id: vendorId });
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({ notes })
        });
    }

    async rejectVendor(vendorId, reason) {
        const endpoint = this.buildEndpoint(API_CONFIG.ENDPOINTS.VENDOR_REJECT, { id: vendorId });
        return await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    // ============================================================
    // REVIEW MODERATION
    // ============================================================

    async getPendingReviews() {
        return await this.request(API_CONFIG.ENDPOINTS.REVIEWS_PENDING);
    }

    async moderateReview(reviewId, action, reason = '') {
        const endpoint = this.buildEndpoint(API_CONFIG.ENDPOINTS.REVIEW_MODERATE, { id: reviewId });
        return await this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify({ action, reason })
        });
    }

    // ============================================================
    // AUDIT LOG
    // ============================================================

    async getAuditLog(filters = {}) {
        const params = new URLSearchParams();
        if (filters.days) params.append('days', filters.days);
        if (filters.action) params.append('action', filters.action);
        if (filters.target_type) params.append('target_type', filters.target_type);
        if (filters.page) params.append('page', filters.page);
        if (filters.limit) params.append('limit', filters.limit);
        
        const endpoint = `/api/admin/audit?${params.toString()}`;
        return await this.request(endpoint);
    }

    // ============================================================
    // ADMIN MANAGEMENT
    // ============================================================

    async getAdmins() {
        return await this.request('/api/admin/admins');
    }

    async createAdmin(fullName, email, temporaryPassword) {
        return await this.request('/api/admin/admins', {
            method: 'POST',
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                temporary_password: temporaryPassword
            })
        });
    }

    async removeAdmin(adminId) {
        return await this.request(`/api/admin/admins/${adminId}`, {
            method: 'DELETE'
        });
    }

    // ============================================================
    // PASSWORD MANAGEMENT
    // ============================================================

    async changePassword(currentPassword, newPassword) {
        return await this.request('/api/admin/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency
    }).format(amount / 100); // Amount in pence
}

/**
 * Format date
 */
function formatDate(dateString, format = 'full') {
    const date = new Date(dateString);
    
    if (format === 'full') {
        return new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    if (format === 'short') {
        return new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    }
    
    return date.toLocaleDateString('en-GB');
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'just now';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Check authentication
 */
async function checkAuth() {
    const api = new AdminAPI();
    
    if (!api.token) {
        window.location.href = 'admin-login.html';
        return null;
    }
    
    const user = await api.verifyToken();
    
    if (!user || user.role !== 'super_admin') {
        window.location.href = 'admin-login.html';
        return null;
    }
    
    return api;
}

/**
 * Initialize user info in header
 */
function initUserInfo(api) {
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    
    if (userNameEl && api.user) {
        userNameEl.textContent = api.user.name || 'Super Admin';
    }
    
    if (userEmailEl && api.user) {
        userEmailEl.textContent = api.user.email;
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    const api = new AdminAPI();
    api.logout();
    window.location.href = 'admin-login.html';
}

// Export for use in other scripts
window.AdminAPI = AdminAPI;
window.API_CONFIG = API_CONFIG;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;
window.showToast = showToast;
window.checkAuth = checkAuth;
window.initUserInfo = initUserInfo;
window.handleLogout = handleLogout;
