const rateLimit = require('express-rate-limit');

/**
 * General API Rate Limiter
 * 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
});

/**
 * Strict Rate Limiter for Authentication
 * 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true, // Don't count successful logins
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes'
    }
});

/**
 * Registration Rate Limiter
 * 3 registrations per hour per IP
 */
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        success: false,
        error: 'Too many accounts created from this IP, please try again later.',
        retryAfter: '1 hour'
    }
});

/**
 * Quote Creation Rate Limiter
 * 10 quotes per hour per user
 */
const quoteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many quotes submitted, please try again later.',
        retryAfter: '1 hour'
    }
});

/**
 * AI Features Rate Limiter
 * 20 AI requests per hour (expensive operations)
 */
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'AI request limit reached, please try again later.',
        retryAfter: '1 hour'
    }
});

/**
 * Payment Operations Rate Limiter
 * 10 payment operations per hour
 */
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many payment operations, please try again later.',
        retryAfter: '1 hour'
    }
});

/**
 * Email Sending Rate Limiter
 * 5 emails per 15 minutes
 */
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many emails sent, please try again later.',
        retryAfter: '15 minutes'
    }
});

/**
 * Custom key generator for authenticated users
 * Rate limit per user ID instead of IP
 */
const userBasedLimiter = (maxRequests, windowMinutes) => {
    return rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        max: maxRequests,
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise use IP
            return req.user?.userId || req.ip;
        },
        message: {
            success: false,
            error: `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowMinutes} minutes.`,
        }
    });
};

module.exports = {
    apiLimiter,
    authLimiter,
    registerLimiter,
    quoteLimiter,
    aiLimiter,
    paymentLimiter,
    emailLimiter,
    userBasedLimiter
};
