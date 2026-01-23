const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const { emailLimiter } = require('./middleware/rate-limit');
const { TradeMatchEventBroker, NotificationDispatcher } = require('./services/event-broker.service');
const connectionLayerRouter = require('./routes/connection-layer');

dotenv.config();

const app = express();

// Trust proxy (required for Render, Heroku, etc.)
app.set("trust proxy", 1);

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Compression middleware
app.use(compression());

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim())
        : "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize passport
app.use(passport.initialize());

// General rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Database connection with retry logic
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Test database connection with logging
pool.connect()
    .then(() => {
        logger.info("✅ Database connected successfully");
    })
    .catch(err => {
        logger.error("❌ Database connection failed", { error: err.message });
        if (process.env.NODE_ENV === 'production') {
            process.exit(1); // Exit in production if DB is unavailable
        }
    });

// Connection layer: event broker + notification dispatcher
const eventBroker = new TradeMatchEventBroker(pool);
const notificationDispatcher = new NotificationDispatcher(pool);

if (process.env.ENABLE_NOTIFICATIONS !== 'false') {
    notificationDispatcher.startProcessing(5000);
    logger.info('Notification processor started (5s interval)');
}

// Health check endpoint
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        let notification = null;
        if (notificationDispatcher && typeof notificationDispatcher.getStats === 'function') {
            notification = await notificationDispatcher.getStats();
        }
        res.json({
            status: "ok",
            database: "connected",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: require('./package.json').version,
            notification
        });
    } catch (err) {
        logger.error("Health check failed", { error: err.message });
        res.status(500).json({
            status: "error",
            database: "not connected",
            error: err.message
        });
    }
});

// Registration endpoint with rate limiting
app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
        logger.info('Registration attempt', { email: req.body.email });
        
        const { userType, fullName, email, phone, password, postcode, terms, oauth_provider, oauth_id } = req.body;
        
        // Validation
        if (!email || !fullName) {
            logger.warn('Registration failed: Missing required fields');
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['email', 'fullName']
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Password strength validation for non-OAuth users
        if (!oauth_provider && (!password || password.length < 8)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long' 
            });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1', 
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            logger.warn('Registration failed: User already exists', { email });
            return res.status(400).json({ error: 'User already exists' });
        }

        let hashedPassword = null;
        let authProvider = 'local';
        
        // Handle OAuth users
        if (oauth_provider && oauth_provider !== 'local') {
            authProvider = oauth_provider;
            
            if (oauth_id) {
                const existingOauthUser = await pool.query(
                    'SELECT id FROM users WHERE oauth_id = $1', 
                    [oauth_id]
                );
                
                if (existingOauthUser.rows.length > 0) {
                    await pool.query(
                        'UPDATE users SET oauth_provider = $1, full_name = $2, email = $3, phone = $4, postcode = $5 WHERE oauth_id = $6',
                        [oauth_provider, fullName, email.toLowerCase(), phone, postcode, oauth_id]
                    );
                    
                    const user = await pool.query(
                        'SELECT * FROM users WHERE id = $1', 
                        [existingOauthUser.rows[0].id]
                    );
                    
                    const token = jwt.sign(
                        { userId: user.rows[0].id, email: email.toLowerCase() },
                        process.env.JWT_SECRET || 'fallback-secret',
                        { expiresIn: '7d' }
                    );
                    
                    logger.info('OAuth account linked successfully', { userId: user.rows[0].id });
                    
                    return res.json({
                        message: 'OAuth account linked successfully',
                        token,
                        user: user.rows[0]
                    });
                }
            }
        } else {
            // Regular registration - hash password
            hashedPassword = await bcrypt.hash(password, 12); // Increased salt rounds for better security
        }

        // Create user in database
        const result = await pool.query(
            `INSERT INTO users (user_type, full_name, email, phone, password, postcode, oauth_provider, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, user_type, full_name, email, phone, postcode, oauth_provider`,
            [userType, fullName, email.toLowerCase(), phone, hashedPassword, postcode, authProvider]
        );

        // Create JWT token
        const token = jwt.sign(
            { userId: result.rows[0].id, email: email.toLowerCase() },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        logger.info('User registered successfully', { 
            userId: result.rows[0].id, 
            email: email.toLowerCase(),
            authProvider 
        });

        return res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: result.rows[0].id,
                userType: result.rows[0].user_type,
                fullName: result.rows[0].full_name,
                email: result.rows[0].email,
                phone: result.rows[0].phone,
                postcode: result.rows[0].postcode,
                oauth_provider: result.rows[0].oauth_provider
            }
        });

    } catch (error) {
        logger.error('Registration error', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Registration failed. Please try again later.'
        });
    }
});

// Login endpoint with rate limiting
app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
        logger.info('Login attempt', { email: req.body.email });
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            logger.warn('Login failed: Missing credentials');
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, email, password, full_name, user_type, phone, postcode, oauth_provider, active FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            logger.warn('Login failed: User not found', { email });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        // Check if account is active
        if (!user.active) {
            logger.warn('Login failed: Account inactive', { email });
            return res.status(403).json({ error: 'Account is inactive. Please contact support.' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password || '');

        if (!validPassword) {
            logger.warn('Login failed: Invalid password', { email });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, email: email.toLowerCase() },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        logger.info('User logged in successfully', { 
            userId: user.id, 
            email: email.toLowerCase() 
        });

        return res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                userType: user.user_type,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone,
                postcode: user.postcode,
                oauth_provider: user.oauth_provider
            }
        });

    } catch (error) {
        logger.error('Login error', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Login failed. Please try again later.'
        });
    }
});

// Get current user
app.get("/api/auth/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        
        const result = await pool.query(
            'SELECT id, email, full_name, user_type, phone, postcode, oauth_provider, email_verified FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            user: result.rows[0]
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        logger.error('Get user error', { error: error.message });
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Connection Layer API (Customer↔Vendor sync)
try {
    if (typeof connectionLayerRouter.setPool === 'function') connectionLayerRouter.setPool(pool);
    if (typeof connectionLayerRouter.setEventBroker === 'function') connectionLayerRouter.setEventBroker(eventBroker);
    app.use('/api/connection', (req, res, next) => {
        req.eventBroker = eventBroker;
        next();
    }, connectionLayerRouter);
    logger.info('Connection layer routes mounted at /api/connection');
} catch (e) {
    logger.warn('Connection layer routes not available', { error: e && e.message ? e.message : String(e) });
}

// Mount OAuth routers
const googleAuthRouter = require('./routes/google-auth');
const microsoftAuthRouter = require('./routes/microsoft-auth');

if (typeof googleAuthRouter.setPool === 'function') googleAuthRouter.setPool(pool);
if (typeof microsoftAuthRouter.setPool === 'function') microsoftAuthRouter.setPool(pool);

app.use('/auth', googleAuthRouter);
app.use('/auth', microsoftAuthRouter);

// Email service (Resend) routes
try {
    const emailRouter = require('./email-resend');
    if (typeof emailRouter.setPool === 'function') emailRouter.setPool(pool);
    app.use('/api/email', emailLimiter, emailRouter);
    logger.info('Email service routes mounted at /api/email');
} catch (e) {
    logger.warn('Email service not available', { error: e && e.message ? e.message : String(e) });
}

// Mount core application routers (Quotes, Bids, Customer)
try {
    const quotesRouter = require('./routes/quotes');
    if (typeof quotesRouter.setPool === 'function') quotesRouter.setPool(pool);
    app.use('/api/quotes', quotesRouter);
    logger.info('Quotes routes mounted at /api/quotes');
} catch (e) {
    logger.warn('Quotes routes not available', { error: e && e.message ? e.message : String(e) });
}

try {
    const bidsRouter = require('./routes/bids');
    if (typeof bidsRouter.setPool === 'function') bidsRouter.setPool(pool);
    app.use('/api/bids', bidsRouter);
    logger.info('Bids routes mounted at /api/bids');
} catch (e) {
    logger.warn('Bids routes not available', { error: e && e.message ? e.message : String(e) });
}

try {
    const customerRouter = require('./routes/customer');
    if (typeof customerRouter.setPool === 'function') customerRouter.setPool(pool);
    app.use('/api/customer', customerRouter);
    logger.info('Customer routes mounted at /api/customer');
} catch (e) {
    logger.warn('Customer routes not available', { error: e && e.message ? e.message : String(e) });
}

// Payments and milestones routes
try {
    const paymentsRouter = require('./routes/payments');
    if (typeof paymentsRouter.setPool === 'function') paymentsRouter.setPool(pool);
    if (typeof paymentsRouter.setEventBroker === 'function') paymentsRouter.setEventBroker(eventBroker);
    app.use('/api/payments', paymentsRouter);
    logger.info('Payments routes mounted at /api/payments');
} catch (e) {
    logger.warn('Payments routes not available', { error: e && e.message ? e.message : String(e) });
}

try {
    const milestonesRouter = require('./routes/milestones');
    if (typeof milestonesRouter.setPool === 'function') milestonesRouter.setPool(pool);
    if (typeof milestonesRouter.setEventBroker === 'function') milestonesRouter.setEventBroker(eventBroker);
    app.use('/api/milestones', milestonesRouter);
    logger.info('Milestones routes mounted at /api/milestones');
} catch (e) {
    logger.warn('Milestones routes not available', { error: e && e.message ? e.message : String(e) });
}

try {
    const adminRouter = require('./routes/admin');
    if (typeof adminRouter.setPool === 'function') adminRouter.setPool(pool);
    if (typeof adminRouter.setEventBroker === 'function') adminRouter.setEventBroker(eventBroker);
    app.use('/api/admin', adminRouter);
    logger.info('Super Admin routes mounted at /api/admin');
} catch (e) {
    logger.warn('Admin routes not available', { error: e && e.message ? e.message : String(e) });
}

// Debug endpoint (disable in production)
if (process.env.NODE_ENV !== 'production') {
    app.get("/api/auth/debug", (req, res) => {
        res.json({
            message: 'OAuth Debug Endpoint',
            routes: {
                auth_register: 'POST /api/auth/register',
                auth_login: 'POST /api/auth/login',
                auth_me: 'GET /api/auth/me',
                google_auth: 'GET /auth/google',
                google_callback: 'GET /auth/google/callback',
                microsoft_auth: 'GET /auth/microsoft',
                microsoft_callback: 'GET /auth/microsoft/callback'
            },
            environment: {
                node_env: process.env.NODE_ENV,
                database_url: process.env.DATABASE_URL ? 'configured' : 'not configured',
                frontend_url: process.env.FRONTEND_URL || 'not configured',
                jwt_secret: process.env.JWT_SECRET ? 'configured' : 'not configured',
                google_oauth: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
                microsoft_oauth: process.env.MICROSOFT_CLIENT_ID ? 'configured' : 'not configured'
            }
        });
    });
}

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "🚀 TradeMatch API",
        version: "3.1.0-Production-Ready",
        status: "running",
        environment: process.env.NODE_ENV || 'development',
        features: {
            auth: "Registration, Login, OAuth (Google, Microsoft)",
            database: "Neon PostgreSQL with migrations",
            security: "Helmet, CORS, Rate Limiting, JWT",
            logging: "Winston structured logging"
        },
        endpoints: {
            health: "GET /api/health",
            register: "POST /api/auth/register",
            login: "POST /api/auth/login",
            me: "GET /api/auth/me"
        }
    });
});

// 404 handler
app.use((req, res) => {
    logger.warn('Route not found', { path: req.path, method: req.method });
    res.status(404).json({
        error: "Route not found",
        path: req.path,
        method: req.method
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { 
        error: err.message, 
        stack: err.stack,
        path: req.path 
    });
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Graceful shutdown
const gracefulShutdown = async () => {
    logger.info('Shutting down gracefully...');
    try {
        if (notificationDispatcher && typeof notificationDispatcher.stopProcessing === 'function') {
            notificationDispatcher.stopProcessing();
        }
        await pool.end();
        logger.info('Database connections closed');
        process.exit(0);
    } catch (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    logger.info('TradeMatch API Server Started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
    console.log('🚀 TradeMatch API Server Started (Production)');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
});

// Attempt migrations in the background (non-blocking)
// Disabled by default to avoid spawn errors on constrained environments.
if (process.env.DATABASE_URL && process.env.RUN_BG_MIGRATIONS === 'true') {
    setImmediate(async () => {
        try {
            const { spawn } = require('child_process');
            const migrate = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'migrate:up'], {
                stdio: ['ignore', 'ignore', 'ignore'],
                timeout: 30000,
                detached: false
            });
            migrate.on('error', (e) => logger.warn('Background migration spawn error', { error: e.message }));
            migrate.unref(); // Don't wait for this process
        } catch (err) {
            logger.warn('Background migration attempt skipped', { error: err.message });
        }
    });
}

module.exports = app;
