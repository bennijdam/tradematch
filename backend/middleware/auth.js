// JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const pool = require('../database/postgres-connection');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Verify JWT token and attach user to request
 */
function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                error: 'No authentication token provided',
                code: 'NO_TOKEN'
            });
        }

        // Extract token from "Bearer <token>"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Invalid token format',
                code: 'INVALID_TOKEN_FORMAT'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            vendorId: decoded.vendorId,
            customerId: decoded.customerId
        };

        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid or expired token',
                code: 'INVALID_TOKEN'
            });
        }
        
        return res.status(500).json({ 
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Require vendor role
 */
function requireVendor(req, res, next) {
    if (!req.user || req.user.role !== 'vendor') {
        return res.status(403).json({ 
            error: 'Vendor access required',
            code: 'VENDOR_REQUIRED'
        });
    }
    next();
}

/**
 * Require customer role
 */
function requireCustomer(req, res, next) {
    if (!req.user || req.user.role !== 'customer') {
        return res.status(403).json({ 
            error: 'Customer access required',
            code: 'CUSTOMER_REQUIRED'
        });
    }
    next();
}

/**
 * Require admin role
 */
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
}

/**
 * Optional authentication - works with or without token
 */
function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next(); // Continue without auth
        }

        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            vendorId: decoded.vendorId,
            customerId: decoded.customerId
        };

        next();
        
    } catch (error) {
        // Continue without auth on error
        next();
    }
}

/**
 * Refresh token
 */
function refreshToken(req, res, next) {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({ 
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        
        // Generate new access token
        const newToken = jwt.sign(
            { 
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role
            },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ 
            token: newToken,
            expiresIn: '15m'
        });
        
    } catch (error) {
        return res.status(401).json({ 
            error: 'Invalid refresh token',
            code: 'INVALID_REFRESH_TOKEN'
        });
    }
}

module.exports = {
    authenticate,
    requireVendor,
    requireCustomer,
    requireAdmin,
    optionalAuth,
    refreshToken
};