require("./instrument.js");
const Sentry = require("@sentry/node");
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
const path = require('path');
const crypto = require('crypto');
const { emailLimiter, paymentLimiter, quoteLimiter } = require('./middleware/rate-limit');
const { TradeMatchEventBroker, NotificationDispatcher } = require('./services/event-broker.service');
const connectionLayerRouter = require('./routes/connection-layer');

dotenv.config({ path: path.join(__dirname, '.env') });

function sanitizeDatabaseUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const url = new URL(rawUrl);
        url.searchParams.delete('channel_binding');
        if (url.hostname.includes('-pooler')) {
            url.hostname = url.hostname.replace('-pooler', '');
        }
        return url.toString();
    } catch (error) {
        return rawUrl;
    }
}

const app = express();

// Trust proxy (required for Render, Heroku, etc.)
app.set("trust proxy", 1);

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Compression middleware
app.use(compression());

// CORS configuration
const productionOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultProductionOrigins = [
    'https://www.tradematch.uk',
    'https://tradematch.uk'
];

const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? (productionOrigins.length ? productionOrigins : defaultProductionOrigins)
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

// Serve frontend static assets
const frontendPath = path.join(__dirname, '../frontend');
app.use('/frontend', express.static(frontendPath, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.css') {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (ext === '.js') {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
    }
}));

// Serve root landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

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

const databaseUrl = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (!databaseUrl) {
    logger.error('❌ DATABASE_URL is not set');
}

const requiresSsl = Boolean(
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    (databaseUrl && /sslmode=require|sslmode=verify-ca|sslmode=verify-full/i.test(databaseUrl))
);

// Database connection with retry logic
const pool = new Pool({
    connectionString: databaseUrl,
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
});

const adminAudit = require('./middleware/admin-audit');
adminAudit.setPool(pool);

// Handle pool errors gracefully
pool.on('error', (err, client) => {
    logger.error('Unexpected error on idle client', { error: err.message });
    // Don't exit - let the connection pool recover
});

// Test database connection with logging
pool.connect()
    .then((client) => {
        client.release();
        logger.info("✅ Database connected successfully");
    })
    .catch(err => {
        logger.error("❌ Database connection failed", {
            error: err.message || 'unknown',
            code: err.code,
            detail: err.detail
        });
        if (process.env.NODE_ENV === 'production') {
            // Don't exit immediately - allow server to start and serve health checks
            logger.warn("⚠️  Server continuing despite DB connection error - will retry on next request");
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
        const errorMessage = err.message || err.code || 'unknown';
        logger.error("Health check failed", { error: errorMessage, code: err.code, detail: err.detail });
        res.status(200).json({
            status: "degraded",
            database: "not connected",
            error: errorMessage,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            version: require('./package.json').version
        });
    }
});

// Auth routes
const authRouter = require('./routes/auth');
if (typeof authRouter.setPool === 'function') authRouter.setPool(pool);
app.use('/api/auth', authRouter);

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

// Messaging routes
try {
    const messagingRouter = require('./routes/messaging');
    if (typeof messagingRouter.setPool === 'function') messagingRouter.setPool(pool);
    app.use('/api/messaging', messagingRouter);
    logger.info('Messaging routes mounted at /api/messaging');
} catch (e) {
    logger.warn('Messaging routes not available', { error: e && e.message ? e.message : String(e) });
}

// Mount core application routers (Quotes, Bids, Customer)
try {
    const quotesRouter = require('./routes/quotes');
    if (typeof quotesRouter.setPool === 'function') quotesRouter.setPool(pool);
    app.use('/api/quotes/public', quoteLimiter);
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
    const savedTradesRouter = require('./routes/saved-trades');
    if (typeof customerRouter.setPool === 'function') customerRouter.setPool(pool);
    if (typeof savedTradesRouter.setPool === 'function') savedTradesRouter.setPool(pool);
    app.use('/api/customer', customerRouter);
    app.use('/api/saved-trades', savedTradesRouter);
    logger.info('Customer routes mounted at /api/customer');
} catch (e) {
    logger.warn('Customer routes not available', { error: e && e.message ? e.message : String(e) });
}

try {
    const reviewsRouter = require('./routes/reviews');
    if (typeof reviewsRouter.setPool === 'function') reviewsRouter.setPool(pool);
    app.use('/api/reviews', reviewsRouter);
    logger.info('Reviews routes mounted at /api/reviews');
} catch (e) {
    logger.warn('Reviews routes not available', { error: e && e.message ? e.message : String(e) });
}

// Payments and milestones routes
try {
    const paymentsRouter = require('./routes/payments');
    if (typeof paymentsRouter.setPool === 'function') paymentsRouter.setPool(pool);
    if (typeof paymentsRouter.setEventBroker === 'function') paymentsRouter.setEventBroker(eventBroker);
    app.use('/api/payments', paymentLimiter, paymentsRouter);
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

// Sentry error handler (register before any other error middleware)
Sentry.setupExpressErrorHandler(app);

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
