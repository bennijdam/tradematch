/**
 * TradeMatch API Configuration
 * Connects frontend to backend APIs
 */

// API Configuration - Update this with your Render backend URL
const API_CONFIG = {
    // Development: localhost
    // Production: your Render URL
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://tradematch.onrender.com', // <-- Production backend
    
    ENDPOINTS: {
        // Authentication
        AUTH: {
            REGISTER: '/api/auth/register',
            LOGIN: '/api/auth/login',
            ME: '/api/auth/me'
        },
        
        // Quotes
        QUOTES: {
            LIST: '/api/quotes',
            CREATE: '/api/quotes',
            GET: '/api/quotes',
            UPDATE: '/api/quotes',
            DELETE: '/api/quotes'
        },
        
        // Health check
        HEALTH: '/api/health'
    }
};

/**
 * API Client Class
 * Handles all API requests with authentication
 */
class TradeMatchAPI {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
        this.token = localStorage.getItem('tradematch_token');
    }

    /**
     * Set authentication token
     */
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('tradematch_token', token);
        } else {
            localStorage.removeItem('tradematch_token');
        }
    }

    /**
     * Get authentication headers
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
     * Make API request
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log(`🔗 API Request: ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            console.log(`✅ API Response:`, data);
            return data;
        } catch (error) {
            console.error(`❌ API Error:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * PUT request
     */
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ==========================================
    // AUTHENTICATION METHODS
    // ==========================================

    /**
     * Register new user
     */
    async register(userData) {
        const response = await this.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * Login user
     */
    async login(email, password) {
        const response = await this.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
            email,
            password
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    /**
     * Get current user info
     */
    async getCurrentUser() {
        return this.get(API_CONFIG.ENDPOINTS.AUTH.ME);
    }

    /**
     * Logout user
     */
    logout() {
        this.setToken(null);
        window.location.href = '/index.html';
    }

    // ==========================================
    // QUOTES METHODS
    // ==========================================

    /**
     * Create new quote
     */
    async createQuote(quoteData) {
        return this.post(API_CONFIG.ENDPOINTS.QUOTES.CREATE, quoteData);
    }

    /**
     * Get all quotes (with filters)
     */
    async getQuotes(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.get(`${API_CONFIG.ENDPOINTS.QUOTES.LIST}?${params}`);
    }

    /**
     * Get single quote
     */
    async getQuote(quoteId) {
        return this.get(`${API_CONFIG.ENDPOINTS.QUOTES.GET}/${quoteId}`);
    }

    /**
     * Update quote
     */
    async updateQuote(quoteId, updateData) {
        return this.put(`${API_CONFIG.ENDPOINTS.QUOTES.UPDATE}/${quoteId}`, updateData);
    }

    /**
     * Delete quote
     */
    async deleteQuote(quoteId) {
        return this.delete(`${API_CONFIG.ENDPOINTS.QUOTES.DELETE}/${quoteId}`);
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.token;
    }

    /**
     * Test API connection
     */
    async healthCheck() {
        try {
            const response = await this.get(API_CONFIG.ENDPOINTS.HEALTH);
            return response;
        } catch (error) {
            console.error('Health check failed:', error);
            throw error;
        }
    }
}

// Create global API instance
const api = new TradeMatchAPI();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TradeMatchAPI, api, API_CONFIG };
} else {
    window.TradeMatchAPI = TradeMatchAPI;
    window.api = api;
    window.API_CONFIG = API_CONFIG;
}