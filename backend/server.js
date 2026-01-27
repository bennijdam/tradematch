const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require('passport');
const path = require('path');
const crypto = require('crypto');
const { emailLimiter } = require('./middleware/rate-limit');
const { startCreditExpiryJob } = require('./services/credit-expiry-job');
const { startVendorScoreRecoveryJob } = require('./services/vendor-score-recovery');

dotenv.config({ path: path.join(__dirname, '.env') });

const uploadsRoutes = require('./routes/uploads');

function sanitizeDatabaseUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const url = new URL(rawUrl);
        // Node pg does not support channel_binding in libpq params
        url.searchParams.delete('channel_binding');
        // Prefer direct Neon host for long-lived Node connections
        if (url.hostname.includes('-pooler')) {
            url.hostname = url.hostname.replace('-pooler', '');
        }
        return url.toString();
    } catch (error) {
        return rawUrl;
    }
}

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Fail fast so we don't keep serving requests with a broken state (e.g., ended DB pool)
    process.exitCode = 1;
});

const app = express();
app.set("trust proxy", 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"]
        }
    },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' }
}));

const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultAllowedOrigins = [
    'https://www.tradematch.uk',
    'https://tradematch.uk',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:8000'
];

const allowedOrigins = Array.from(new Set([...envOrigins, ...defaultAllowedOrigins]));

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

const jsonParser = express.json();
app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhooks/stripe') {
        return next();
    }
    return jsonParser(req, res, next);
});
app.use(passport.initialize());

// Serve the super admin panel statically so /admin-login.html works locally
app.use('/', express.static(path.join(__dirname, '../tradematch-super-admin-panel')));

// File uploads (S3 presigned URLs)
app.use('/api/uploads', uploadsRoutes);

// Database connection
const pool = new Pool({
    connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 60000,
    max: 10,
    keepAlive: true,
    options: '-c statement_timeout=15000'
});

// Avoid closing the pool in development (prevents "Cannot use a pool after calling end")
const originalPoolEnd = pool.end.bind(pool);
pool.end = async () => {
        if (process.env.NODE_ENV !== 'production') {
                console.warn('⚠️  pool.end() ignored in development mode');
                return;
        }
        return originalPoolEnd();
};

// Pool error handler (prevents crash on dropped connections)
pool.on('error', (err) => {
    console.error('Database pool error:', err.message);
});

// Test database connection
pool.connect().then((client) => {
    client.release();
    console.log("✅ Database connected (Neon / Postgres)");

    // Background jobs only after DB is reachable
    startCreditExpiryJob(pool);
    startVendorScoreRecoveryJob(pool);
}).catch(err => {
    console.error("❌ Database connection failed:", err.message);
});

// Health check
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({
            status: "ok",
            database: "connected",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        res.status(200).json({
            status: "degraded",
            database: "not connected",
            error: err.message,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });
    }
});

// Registration endpoint with OAuth support
app.post("/api/auth/register", async (req, res) => {
    try {
        console.log('🔧 Registration attempt:', JSON.stringify(req.body));
        
        const { userType, fullName, email, phone, password, postcode, terms, oauth_provider, oauth_id } = req.body;
        
        console.log('🔧 Parsed data:', { userType, fullName, email, phone, postcode, oauth_provider, termsAccepted: !!terms });
        
        if (!email || !password || !fullName) {
            console.log('❌ Missing fields:', { email: !!email, password: !!password, fullName: !!fullName });
            return res.status(400).json({ 
                error: 'Missing required fields', 
                received: { email: !!email, password: !!password, fullName: !!fullName } 
            });
        }

        // Check if user exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1', 
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        let hashedPassword;
        let authProvider = 'local';
        
        // Handle OAuth users
        if (oauth_provider && oauth_provider !== 'local') {
            // OAuth user - no password hashing needed
            hashedPassword = null;
            authProvider = oauth_provider;
            
            // Check if OAuth user exists and link to existing account
            if (oauth_id) {
                const existingOauthUser = await pool.query(
                    'SELECT id FROM users WHERE oauth_id = $1', 
                    [oauth_id]
                );
                
                if (existingOauthUser.rows.length > 0) {
                    // Link OAuth to existing user
                    await pool.query(
                        'UPDATE users SET oauth_provider = $1, full_name = $2, email = $3, phone = $4, postcode = $5 WHERE oauth_id = $6',
                        [oauth_provider, fullName, email.toLowerCase(), phone, postcode, oauth_id]
                    );
                    
                    const user = await pool.query(
                        'SELECT * FROM users WHERE id = $1', 
                        [existingUser.rows[0].id]
                    );
                    
                    return res.json({
                        message: 'OAuth account linked successfully',
                        token: jwt.sign(user.rows[0], process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' }),
                        user: user.rows[0]
                    });
                }
            }
        } else {
            // Regular registration - hash password
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Create user in database
        const result = await pool.query(
            `INSERT INTO users (id, user_type, full_name, name, email, phone, password_hash, postcode, oauth_provider, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id, user_type, full_name, email, phone, postcode, oauth_provider`,
            [
                crypto.randomUUID(),
                userType,
                fullName,
                fullName,
                email.toLowerCase(),
                phone,
                hashedPassword,
                postcode,
                authProvider || 'local'
            ]
        );

        // Create JWT token
        const token = jwt.sign(
            { userId: result.rows[0].id, email: email.toLowerCase() },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        console.log('✅ User created successfully:', { email, userId: result.rows[0].id, authProvider });

        return res.json({
            message: 'User registered successfully',
            token: token,
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
        console.error('❌ Registration error:', error);
        res.status(500).json({
            error: 'Registration failed: ' + error.message
        });
    }
});

// Login endpoint with OAuth support
app.post("/api/auth/login", async (req, res) => {
    try {
        console.log('🔧 Login attempt:', JSON.stringify(req.body));
        
        const { email, password } = req.body;
        
        console.log('🔧 Login data:', { email, hasPassword: !!password });
        
        if (!email || !password) {
            console.log('❌ Missing login fields');
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const result = await pool.query(
            'SELECT id, email, password_hash, full_name, user_type, role, phone, postcode FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash || '');

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const role = user.role || user.user_type;
        const displayName = user.full_name || user.email;

        const token = jwt.sign(
            { userId: user.id, email: email.toLowerCase(), role },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        console.log('✅ User logged in successfully:', { email, userId: user.id });

        return res.json({
            message: 'Login successful',
            token: token,
            userId: user.id,
            email: user.email,
            name: displayName,
            role,
            user: {
                id: user.id,
                userType: user.user_type,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone,
                postcode: user.postcode,
                oauth_provider: null,
                role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            error: 'Login failed: ' + error.message
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
            'SELECT id, email, full_name, user_type, phone, postcode, oauth_provider FROM users WHERE id = $1',
            [decoded.userId]
        );

        return res.json({
            user: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Verify token (used by admin portal)
app.get("/api/auth/verify", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

        const result = await pool.query(
            'SELECT id, email, full_name, user_type, role, status FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const role = user.role || user.user_type;

        return res.json({
            userId: user.id,
            email: user.email,
            name: user.full_name || user.email,
            role,
            status: user.status
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('❌ Verify token error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

// Mount OAuth routers (use the routers that already configure passport strategies)
const googleAuthRouter = require('./routes/google-auth');
const microsoftAuthRouter = require('./routes/microsoft-auth');

// Provide DB pool to routers if they accept it
if (typeof googleAuthRouter.setPool === 'function') googleAuthRouter.setPool(pool);
if (typeof microsoftAuthRouter.setPool === 'function') microsoftAuthRouter.setPool(pool);

app.use('/auth', googleAuthRouter);
app.use('/auth', microsoftAuthRouter);

// Email service (Resend)
try {
    const emailRouter = require('./email-resend');
    if (typeof emailRouter.setPool === 'function') emailRouter.setPool(pool);
    app.use('/api/email', emailLimiter, emailRouter);
    console.log('✉️  Email service routes mounted at /api/email');
} catch (e) {
    console.warn('⚠️ Email service not available:', e && e.message ? e.message : e);
}

// Lead system routes
try {
    const quotesRouter = require('./routes/quotes');
    if (typeof quotesRouter.setPool === 'function') quotesRouter.setPool(pool);
    app.use('/api/quotes', quotesRouter);
    console.log('📋 Quotes routes mounted at /api/quotes');
} catch (e) {
    console.warn('⚠️ Quotes routes not available:', e && e.message ? e.message : e);
}

try {
    const vendorCreditsRouter = require('./routes/vendor-credits')(pool);
    app.use('/api/vendor-credits', vendorCreditsRouter);
    console.log('💳 Vendor credits routes mounted at /api/vendor-credits');
} catch (e) {
    console.warn('⚠️ Vendor credits routes not available:', e && e.message ? e.message : e);
}

try {
    const leadsRouter = require('./routes/leads')(pool);
    app.use('/api/leads', leadsRouter);
    console.log('🎯 Leads routes mounted at /api/leads');
} catch (e) {
    console.warn('⚠️ Leads routes not available:', e && e.message ? e.message : e);
}

// Messaging routes
try {
    const messagingRouter = require('./routes/messaging');
    if (typeof messagingRouter.setPool === 'function') messagingRouter.setPool(pool);
    app.use('/api/messaging', messagingRouter);
    console.log('💬 Messaging routes mounted at /api/messaging');
} catch (e) {
    console.warn('⚠️ Messaging routes not available:', e && e.message ? e.message : e);
}

// Contracts & disputes routes
try {
    const contractsRouter = require('./routes/contracts');
    if (typeof contractsRouter.setPool === 'function') contractsRouter.setPool(pool);
    app.use('/api/contracts', contractsRouter);
    console.log('📄 Contracts routes mounted at /api/contracts');
} catch (e) {
    console.warn('⚠️ Contracts routes not available:', e && e.message ? e.message : e);
}

// Disputes routes
try {
    const disputesRouter = require('./routes/disputes');
    if (typeof disputesRouter.setPool === 'function') disputesRouter.setPool(pool);
    app.use('/api/disputes', disputesRouter);
    console.log('⚖️ Disputes routes mounted at /api/disputes');
} catch (e) {
    console.warn('⚠️ Disputes routes not available:', e && e.message ? e.message : e);
}

// Milestone status routes
try {
    const milestoneStatusRouter = require('./routes/milestones-status');
    if (typeof milestoneStatusRouter.setPool === 'function') milestoneStatusRouter.setPool(pool);
    app.use('/api/milestones', milestoneStatusRouter);
    console.log('📌 Milestone status routes mounted at /api/milestones');
} catch (e) {
    console.warn('⚠️ Milestone status routes not available:', e && e.message ? e.message : e);
}

// Stripe webhooks
try {
    const webhooksRouter = require('./routes/webhooks');
    if (typeof webhooksRouter.setPool === 'function') webhooksRouter.setPool(pool);
    app.use('/api/webhooks', webhooksRouter);
    console.log('💳 Stripe webhook routes mounted at /api/webhooks/stripe');
} catch (e) {
    console.warn('⚠️ Webhook routes not available:', e && e.message ? e.message : e);
}

try {
    const creditsRouter = require('./routes/credits')(pool);
    app.use('/api/credits', creditsRouter);
    console.log('💰 Credits routes mounted at /api/credits');
} catch (e) {
    console.warn('⚠️ Credits routes not available:', e && e.message ? e.message : e);
}

// Finance Admin routes
try {
    const financeRouter = require('./routes/admin-finance');
    if (typeof financeRouter.setPool === 'function') financeRouter.setPool(pool);
    app.use('/api/admin/finance', financeRouter);
    console.log('🏦 Finance Admin routes mounted at /api/admin/finance');
} catch (e) {
    console.warn('⚠️ Finance routes not available:', e && e.message ? e.message : e);
}

// Super Admin routes
try {
    const adminRouter = require('./routes/admin');
    if (typeof adminRouter.setPool === 'function') adminRouter.setPool(pool);
    app.use('/api/admin', adminRouter);
    console.log('🛡️ Super Admin routes mounted at /api/admin');
} catch (e) {
    console.warn('⚠️ Admin routes not available:', e && e.message ? e.message : e);
}

// Debug endpoint
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
            database_url: process.env.DATABASE_URL ? 'configured' : 'not configured',
            frontend_url: process.env.FRONTEND_URL || 'not configured',
            jwt_secret: process.env.JWT_SECRET ? 'configured' : 'not configured',
            google_oauth: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
            microsoft_oauth: process.env.MICROSOFT_CLIENT_ID ? 'configured' : 'not configured'
        }
    });
});

// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "🚀 TradeMatch API",
        version: "3.0.0-Working",
        status: "running",
        features: {
            auth: "Registration, Login, OAuth (Google, Microsoft)",
            database: "Neon PostgreSQL",
            security: "Password hashing, JWT tokens, CORS"
        },
        endpoints: {
            health: "GET /api/health",
            register: "POST /api/auth/register",
            login: "POST /api/auth/login",
            me: "GET /api/auth/me",
            debug: "GET /api/auth/debug",
            oauth_google: "GET /auth/google",
            oauth_google_callback: "GET /auth/google/callback",
            oauth_microsoft: "GET /auth/microsoft",
            oauth_microsoft_callback: "GET /auth/microsoft/callback"
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.path,
        method: req.method,
        available_endpoints: [
            "GET /",
            "GET /api/health",
            "POST /api/auth/register",
            "POST /api/auth/login",
            "GET /api/auth/me",
            "GET /api/auth/debug",
            "GET /auth/google",
            "GET /auth/google/callback",
            "GET /auth/microsoft",
            "GET /auth/microsoft/callback"
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Prevent premature exit

// Start server
const PORT = process.env.PORT || 3001;

try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('🚀 TradeMatch API Server Started');
        console.log(`📍 Port: ${PORT}`);
        console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
        console.log('🔗 Database: Connected');
        console.log('🔐 OAuth: Google & Microsoft ready');
        console.log('');
    });

    server.on('error', (err) => {
        console.error('❌ Server error:', err.message, err.code);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use`);
        }
        process.exit(1);
    });
} catch (err) {
    console.error('❌ Fatal server error:', err);
    process.exit(1);
}

module.exports = app;