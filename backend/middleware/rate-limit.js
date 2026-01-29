// API Rate Limiting Middleware
const rateLimit = require('express-rate-limit');

const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp.trim();
    }

    const cfConnecting = req.headers['cf-connecting-ip'];
    if (cfConnecting) {
        return cfConnecting.trim();
    }

    return req.ip;
};

const keyGenerator = (req) => getClientIp(req) || 'unknown';

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    keyGenerator,
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
    keyGenerator,
    message: {
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Registration rate limiter (prevent spam)
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 registrations per hour
    keyGenerator,
    message: {
        error: 'Too many registration attempts',
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Quote submission rate limiter
 */
const quoteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 quotes per hour
    keyGenerator,
    message: {
        error: 'Quote submission limit exceeded',
        code: 'QUOTE_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * AI service rate limiter (expensive operations)
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 AI calls per hour
    keyGenerator,
    message: {
        error: 'AI enhancement limit exceeded',
        code: 'AI_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Payment processing rate limiter
 */
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 payments per hour
    keyGenerator,
    message: {
        error: 'Payment processing limit exceeded',
        code: 'PAYMENT_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Email sending rate limiter
 */
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit to 5 emails per 15 minutes
    keyGenerator,
    message: {
        error: 'Email sending limit exceeded',
        code: 'EMAIL_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 uploads per hour
    keyGenerator,
    message: {
        error: 'File upload limit exceeded',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 hour'
    },
    skipSuccessfulRequests: true,
    skipFailedRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
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