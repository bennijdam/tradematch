/**
 * TradeMatch API Configuration
 * 
 * This file contains all API endpoint configurations for connecting
 * the frontend to the backend services.
 * 
 * Usage: Import this file and use the API endpoints throughout your application
 */

const API_CONFIG = {
    // Base API URL - Update this to your backend URL
    BASE_URL: process.env.API_BASE_URL || 'https://api.tradematch.uk',
    
    // API Version
    VERSION: 'v1',
    
    // Timeout settings (in milliseconds)
    TIMEOUT: 30000,
    
    // Retry settings
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
};

const API_ENDPOINTS = {
    // Authentication Endpoints
    AUTH: {
        LOGIN: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/login`,
        REGISTER: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/register`,
        LOGOUT: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/logout`,
        REFRESH_TOKEN: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/refresh`,
        FORGOT_PASSWORD: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/forgot-password`,
        RESET_PASSWORD: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/auth/reset-password`,
    },
    
    // Booking/Quote Endpoints
    BOOKINGS: {
        CREATE: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings`,
        GET_ALL: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings`,
        GET_BY_ID: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings/${id}`,
        UPDATE: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings/${id}`,
        DELETE: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings/${id}`,
        GET_BY_USER: (userId) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/users/${userId}/bookings`,
        SUBMIT_QUOTE: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/bookings/quote`,
    },
    
    // Reviews Endpoints
    REVIEWS: {
        GET_ALL: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews`,
        GET_BY_ID: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews/${id}`,
        CREATE: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews`,
        UPDATE: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews/${id}`,
        DELETE: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews/${id}`,
        GET_BY_SERVICE: (serviceType) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews?service=${serviceType}`,
        GET_FEATURED: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews/featured`,
        GET_RECENT: (limit = 10) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/reviews/recent?limit=${limit}`,
    },
    
    // Tradesperson Endpoints
    TRADESPEOPLE: {
        GET_ALL: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/tradespeople`,
        GET_BY_ID: (id) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/tradespeople/${id}`,
        SEARCH: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/tradespeople/search`,
        GET_BY_SERVICE: (service) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/tradespeople?service=${service}`,
        GET_BY_LOCATION: (postcode) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/tradespeople?postcode=${postcode}`,
    },
    
    // Services Endpoints
    SERVICES: {
        GET_ALL: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/services`,
        GET_BY_CATEGORY: (category) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/services/category/${category}`,
    },
    
    // User Endpoints
    USERS: {
        GET_PROFILE: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/users/profile`,
        UPDATE_PROFILE: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/users/profile`,
        GET_DASHBOARD: `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/users/dashboard`,
    },
    
    // Postcode Lookup
    POSTCODE: {
        LOOKUP: (postcode) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/postcode/lookup/${postcode}`,
        AUTOCOMPLETE: (partial) => `${API_CONFIG.BASE_URL}/${API_CONFIG.VERSION}/postcode/autocomplete?q=${partial}`,
    },
};

/**
 * API Helper Functions
 */

// Generic fetch wrapper with error handling
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        timeout: API_CONFIG.TIMEOUT,
    };
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = { ...defaultOptions, ...options };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const response = await fetch(url, {
            ...config,
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Reviews API Functions
const ReviewsAPI = {
    // Fetch all reviews
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `${API_ENDPOINTS.REVIEWS.GET_ALL}${queryString ? '?' + queryString : ''}`;
        return await apiRequest(url);
    },
    
    // Fetch featured reviews
    async getFeatured() {
        return await apiRequest(API_ENDPOINTS.REVIEWS.GET_FEATURED);
    },
    
    // Fetch recent reviews
    async getRecent(limit = 10) {
        return await apiRequest(API_ENDPOINTS.REVIEWS.GET_RECENT(limit));
    },
    
    // Create a new review
    async create(reviewData) {
        return await apiRequest(API_ENDPOINTS.REVIEWS.CREATE, {
            method: 'POST',
            body: JSON.stringify(reviewData),
        });
    },
    
    // Get reviews by service type
    async getByService(serviceType) {
        return await apiRequest(API_ENDPOINTS.REVIEWS.GET_BY_SERVICE(serviceType));
    },
};

// Booking API Functions
const BookingAPI = {
    // Submit a new quote request
    async submitQuote(quoteData) {
        return await apiRequest(API_ENDPOINTS.BOOKINGS.SUBMIT_QUOTE, {
            method: 'POST',
            body: JSON.stringify(quoteData),
        });
    },
    
    // Create a new booking
    async create(bookingData) {
        return await apiRequest(API_ENDPOINTS.BOOKINGS.CREATE, {
            method: 'POST',
            body: JSON.stringify(bookingData),
        });
    },
    
    // Get user's bookings
    async getUserBookings(userId) {
        return await apiRequest(API_ENDPOINTS.BOOKINGS.GET_BY_USER(userId));
    },
    
    // Update booking status
    async update(bookingId, updateData) {
        return await apiRequest(API_ENDPOINTS.BOOKINGS.UPDATE(bookingId), {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
    },
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        API_CONFIG,
        API_ENDPOINTS,
        apiRequest,
        ReviewsAPI,
        BookingAPI,
    };
}
