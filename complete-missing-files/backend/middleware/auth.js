const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 */
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                error: 'No authentication token provided' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid authentication token format' 
            });
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            userType: decoded.userType,
            name: decoded.name
        };
        
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        
        return res.status(500).json({ 
            success: false,
            error: 'Authentication failed' 
        });
    }
};

/**
 * Require Vendor Role
 */
const requireVendor = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            error: 'Authentication required' 
        });
    }
    
    if (req.user.userType !== 'vendor') {
        return res.status(403).json({ 
            success: false,
            error: 'Vendor access required',
            code: 'FORBIDDEN'
        });
    }
    
    next();
};

/**
 * Require Customer Role
 */
const requireCustomer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            error: 'Authentication required' 
        });
    }
    
    if (req.user.userType !== 'customer') {
        return res.status(403).json({ 
            success: false,
            error: 'Customer access required',
            code: 'FORBIDDEN'
        });
    }
    
    next();
};

/**
 * Require Admin Role
 */
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false,
            error: 'Authentication required' 
        });
    }
    
    if (req.user.userType !== 'admin') {
        return res.status(403).json({ 
            success: false,
            error: 'Admin access required',
            code: 'FORBIDDEN'
        });
    }
    
    next();
};

/**
 * Optional Authentication (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue without user
        next();
    }
};

module.exports = {
    authenticate,
    requireVendor,
    requireCustomer,
    requireAdmin,
    optionalAuth
};
