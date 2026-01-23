// API Rate Limiting Middleware
const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Authentication rate limiter (prevent brute force)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 attempts per 15 minutes
    message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
});

/**
 * Registration rate limiter (prevent spam)
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 registrations per hour
    message: {
        error: 'Too many registration attempts',
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
});

/**
 * Quote submission rate limiter
 */
const quoteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 quotes per hour
    message: {
        error: 'Quote submission limit exceeded',
        code: 'QUOTE_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
});

/**
 * AI service rate limiter (expensive operations)
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 AI calls per hour
    message: {
        error: 'AI enhancement limit exceeded',
        code: 'AI_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
});

/**
 * Payment processing rate limiter
 */
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 payments per hour
    message: {
        error: 'Payment processing limit exceeded',
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
});

/**
 * Email sending rate limiter
 */
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 emails per 15 minutes
    message: {
        error: 'Email sending limit exceeded',
        code: 'EMAIL_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 uploads per hour
    message: {
        error: 'File upload limit exceeded',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
});

module.exports = {
    apiLimiter,
    authLimiter,
    registerLimiter,
    quoteLimiter,
    aiLimiter,
    paymentLimiter,
    emailLimiter,
    uploadLimiter
};