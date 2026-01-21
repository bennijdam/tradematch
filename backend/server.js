const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const passport = require('passport');

dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(cors({
    origin: process.env.CORS_ORIGINS || "*",
    credentials: true,
}));

app.use(express.json());
app.use(passport.initialize());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test database connection
pool.connect().then(() => {
    console.log("✅ Database connected (Neon / Postgres)");
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
        res.status(500).json({
            status: "error",
            database: "not connected",
            error: err.message
        });
    }
});

// Registration endpoint with OAuth support
app.post("/api/auth/register", async (req, res) => {
    try {
        console.log('🔧 Registration attempt:', JSON.stringify(req.body));
        
        const { userType, fullName, email, phone, password, postcode, terms, oauth_provider, oauth_id } = req.body;
        
        console.log('🔧 Parsed data:', { userType, fullName, email, phone, postcode, oauth_provider, !!terms });
        
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
            `INSERT INTO users (user_type, full_name, email, phone, password, postcode, oauth_provider, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id, user_type, full_name, email, phone, postcode, oauth_provider`,
            [userType, fullName, email.toLowerCase(), phone, hashedPassword, postcode, authProvider || 'local']
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
            'SELECT id, email, password, full_name, user_type, phone, postcode, oauth_provider FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.id, email: email.toLowerCase() },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
        );

        console.log('✅ User logged in successfully:', { email, userId: user.id, authProvider: user.oauth_provider });

        return res.json({
            message: 'Login successful',
            token: token,
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

// Mount OAuth routers (use the routers that already configure passport strategies)
const googleAuthRouter = require('./routes/google-auth');
const microsoftAuthRouter = require('./routes/microsoft-auth');

// Provide DB pool to routers if they accept it
if (typeof googleAuthRouter.setPool === 'function') googleAuthRouter.setPool(pool);
if (typeof microsoftAuthRouter.setPool === 'function') microsoftAuthRouter.setPool(pool);

app.use('/auth', googleAuthRouter);
app.use('/auth', microsoftAuthRouter);

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

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server gracefully...');
    await pool.end();
    process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log('🚀 TradeMatch API Server Started');
    console.log(`📍 Port: ${PORT}`);
    console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
    console.log('🔗 Database: Connected');
    console.log('🔐 OAuth: Google & Microsoft ready');
    console.log('');
});

module.exports = app;