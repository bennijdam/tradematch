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
        : 'https://tradematch.onrender.com/', // <-- UPDATE THIS WITH YOUR RENDER URL
    
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
            
            // Handle network errors
            if (!response) {
                throw new Error('Network error - please check your connection');
            }

            // Parse JSON response
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error(`Invalid response from server: ${parseError.message}`);
            }

            // Handle HTTP errors
            if (!response.ok) {
                const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
                
                // Handle specific error cases
                if (response.status === 401) {
                    this.setToken(null); // Clear invalid token
                    throw new Error('Session expired - please log in again');
                } else if (response.status === 403) {
                    throw new Error('Access denied - insufficient permissions');
                } else if (response.status === 404) {
                    throw new Error('Resource not found');
                } else if (response.status >= 500) {
                    throw new Error('Server error - please try again later');
                } else {
                    throw new Error(errorMessage);
                }
            }

            console.log(`✅ API Response:`, data);
            return data;
        } catch (error) {
            console.error(`❌ API Error:`, error);
            
            // Enhance error message for common cases
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to server - please check your internet connection');
            } else if (error.name === 'AbortError') {
                throw new Error('Request timeout - please try again');
            }
            
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

    /**
     * Check API availability
     */
    async isAPIAvailable() {
        try {
            await this.healthCheck();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Retry failed request with exponential backoff
     */
    async retryRequest(endpoint, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.request(endpoint, options);
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
                    console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
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