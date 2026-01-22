const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");
const crypto = require("crypto");
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.set("trust proxy", 1);

// CORS with allowlist - single origin reflection (no multi-value header)
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : ['https://www.tradematch.uk', 'https://tradematch.uk'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowlist
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked origin:', origin);
            callback(null, false); // Reject but don't throw error
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect().then(() => {
    console.log("✅ Database connected (Neon / Postgres)");
}).catch(err => {
    console.error("❌ Database connection failed:", err.message);
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      console.log('❌ Invalid token:', err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded; // Attach decoded user info to request
    next();
  });
};

// Email service (Resend) - ADD ROUTES
try {
    const emailRouter = require('./email-resend');
    if (typeof emailRouter.setPool === 'function') emailRouter.setPool(pool);
    app.use('/api/email', emailRouter);
    console.log("✉️  Email service routes mounted at /api/email");
} catch (e) {
    console.warn('⚠️ Email service not available:', e && e.message ? e.message : e);
}

// Stripe Webhooks
try {
    const webhooksRouter = require('./routes/webhooks');
    if (typeof webhooksRouter.setPool === 'function') webhooksRouter.setPool(pool);
    app.use('/api/webhooks', webhooksRouter);
    console.log("💳 Stripe webhook routes mounted at /api/webhooks/stripe");
} catch (e) {
    console.warn('⚠️ Stripe webhooks not available:', e && e.message ? e.message : e);
}

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

// Registration route - WITH ACTIVATION EMAIL
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log('🔧 Registration attempt:', JSON.stringify(req.body));
    
    // Allow both fullName and name from frontend, default userType to customer
    const fullName = req.body.fullName || req.body.name;
    const userType = req.body.userType || req.body.type || 'customer';
    const { email, phone, password, postcode, terms } = req.body;
    
    console.log('🔧 Parsed data:', { userType, fullName, email, phone, postcode, terms: !!terms });
    
    if (!email || !password || !fullName) {
      console.log('❌ Missing fields:', { email: !!email, password: !!password, fullName: !!fullName });
      return res.status(400).json({ error: 'Missing required fields', received: { email: !!email, password: !!password, fullName: !!fullName } });
    }

    // Check if email already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique user ID
    const userId = crypto.randomBytes(8).toString('hex');

    // Insert user with email_verified = false
    const userResult = await pool.query(
      `INSERT INTO users (id, user_type, name, email, phone, password_hash, postcode, email_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, false) 
       RETURNING id, user_type, name, email, phone, postcode, email_verified`,
      [userId, userType, fullName, email, phone, hashedPassword, postcode]
    );

    const newUser = userResult.rows[0];
    console.log('✅ User created in DB:', { email, userId: newUser.id });

    // Generate activation token (32 bytes = 64 hex chars)
    const activationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store activation token
    await pool.query(
      `INSERT INTO activation_tokens (user_id, token, token_type, expires_at, used) 
       VALUES ($1, $2, 'email_verification', $3, false)`,
      [newUser.id, activationToken, expiresAt]
    );

    console.log('✅ Activation token created');

    // Send activation email
    try {
      const baseUrl = process.env.BACKEND_URL || 'http://localhost:3001';
      await axios.post(`${baseUrl}/api/email/activation`, {
        email: newUser.email,
        fullName: newUser.name,
        token: activationToken
      });
      console.log('✅ Activation email sent');
    } catch (emailError) {
      console.error('⚠️ Failed to send activation email:', emailError.message);
      // Don't fail registration if email fails - user can resend
    }

    return res.json({
      message: 'Registration successful! Please check your email to activate your account.',
      requiresActivation: true,
      user: {
        id: newUser.id,
        userType: newUser.user_type,
        fullName: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        postcode: newUser.postcode,
        emailVerified: false
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed: ' + error.message 
    });
  }
});

// Activation endpoint
app.get("/api/auth/activate", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Activation token required' });
    }

    // Look up token
    const tokenResult = await pool.query(
      `SELECT user_id, expires_at, used FROM activation_tokens 
       WHERE token = $1 AND token_type = 'email_verification'`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid activation token' });
    }

    const tokenData = tokenResult.rows[0];

    // Check if already used
    if (tokenData.used) {
      return res.status(400).json({ error: 'This activation link has already been used' });
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Activation link has expired. Please request a new one.' });
    }

    // Mark user as verified
    await pool.query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [tokenData.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE activation_tokens SET used = true, used_at = NOW() WHERE token = $1',
      [token]
    );

    console.log('✅ User activated:', tokenData.user_id);

    return res.json({
      success: true,
      message: 'Account activated successfully! You can now log in.'
    });

  } catch (error) {
    console.error('❌ Activation error:', error);
    res.status(500).json({ 
      error: 'Activation failed: ' + error.message 
    });
  }
});

// Resend activation email
app.post("/api/auth/resend-activation", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('📧 Resend activation request for:', email);

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, full_name, email, email_verified FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = userResult.rows[0];

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ 
        error: 'Account is already activated. Please try logging in.' 
      });
    }

    // Invalidate any existing activation tokens for this user
    await pool.query(
      'UPDATE activation_tokens SET used = true WHERE user_id = $1 AND token_type = $2 AND used = false',
      [user.id, 'activation']
    );

    // Generate new activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      'INSERT INTO activation_tokens (user_id, token, token_type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, activationToken, 'activation', expiresAt]
    );

    // Send activation email
    try {
      await axios.post('https://tradematch.onrender.com/api/email/activation', {
        email: user.email,
        fullName: user.name,
        token: activationToken
      });

      console.log('✅ Activation email resent to:', email);
      
      return res.json({
        success: true,
        message: 'Activation email sent! Please check your inbox.'
      });

    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send activation email. Please try again later.' 
      });
    }

  } catch (error) {
    console.error('❌ Resend activation error:', error);
    res.status(500).json({ 
      error: 'Failed to resend activation email: ' + error.message 
    });
  }
});

// Login route - WITH EMAIL VERIFICATION CHECK
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log('🔧 Login attempt:', JSON.stringify(req.body));
    
    const { email, password } = req.body;
    
    console.log('🔧 Login data:', { email, hasPassword: !!password });
    
    if (!email || !password) {
      console.log('❌ Missing login fields');
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Look up user in database
    const userResult = await pool.query(
      'SELECT id, user_type, name, email, phone, postcode, email_verified, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.log('❌ Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email is verified
    if (!user.email_verified) {
      console.log('❌ Email not verified:', email);
      return res.status(403).json({ 
        error: 'Please activate your account. Check your email for the activation link.',
        requiresActivation: true,
        email: user.email
      });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        userType: user.user_type
      },
      jwtSecret,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    console.log('✅ User logged in successfully:', { email, userId: user.id });

    return res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        userType: user.user_type,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        postcode: user.postcode
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      error: 'Login failed: ' + error.message 
    });
  }
});

// Get current user info (protected route)
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    // req.user contains decoded JWT payload (userId, email, userType)
    const userResult = await pool.query(
      'SELECT id, user_type, name, email, phone, postcode, email_verified FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    return res.json({
      success: true,
      user: {
        id: user.id,
        userType: user.user_type,
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        postcode: user.postcode,
        emailVerified: user.email_verified
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to get user: ' + error.message 
    });
  }
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "🚀 TradeMatch API - WORKING VERSION",
    version: "1.0.0-fixed",
    status: "running",
    endpoints: {
      health: "/api/health",
      auth_register: "/api/auth/register",
      auth_login: "/api/auth/login"
    }
  });
});

// Debug routes
app.get("/debug/routes", (req, res) => {
  res.json({
    message: "Routes debug info",
    registered_paths: [
      "/api/health",
      "/api/auth/register", 
      "/api/auth/login"
    ]
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404: Route not found - ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method,
    available_endpoints: [
      "GET /",
      "GET /api/health",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /debug/routes"
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log("🚀 TradeMatch API Server - FIXED VERSION (email fixed)");
    console.log(`Port: ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Working endpoints: POST /api/auth/register, POST /api/auth/login`);
});

module.exports = app;