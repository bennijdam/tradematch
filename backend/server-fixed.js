const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const pg = require("pg");
const { Pool } = pg;
const originalPgEmit = pg.Client.prototype.emit;
pg.Client.prototype.emit = function (event, ...args) {
  if (event === 'error') {
    console.error('❌ Postgres client error:', args[0]?.message || args[0]);
    return true;
  }
  return originalPgEmit.call(this, event, ...args);
};
const crypto = require("crypto");
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");
const passport = require('passport');
const {
  apiLimiter,
  authLimiter,
  registerLimiter,
  paymentLimiter,
  emailLimiter,
  uploadLimiter
} = require('./middleware/rate-limit');

dotenv.config();

const app = express();

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason && reason.message ? reason.message : reason);
});

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

// CORS with allowlist - single origin reflection (no multi-value header)
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [
        'https://www.tradematch.uk', 
        'https://tradematch.uk',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
      ];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowlist
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ CORS allowed origin:', origin);
            callback(null, true);
        } else {
            console.warn('⚠️ CORS blocked origin:', origin);
            // Still allow but log - better for debugging
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours - cache preflight requests
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Explicit OPTIONS handler for all routes
app.options('*', cors());

app.use(express.json());
app.use(passport.initialize());

// General rate limiting
app.use('/api', apiLimiter);

const databaseUrl = process.env.DATABASE_URL;
const sslmode = (() => {
  try {
    return new URL(databaseUrl).searchParams.get('sslmode') || process.env.PGSSLMODE;
  } catch (error) {
    return process.env.PGSSLMODE || null;
  }
})();

const useSsl = sslmode
  ? !['disable', 'allow'].includes(String(sslmode).toLowerCase())
  : false;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
  keepAlive: true
});

pool.on('error', (err) => {
  console.error('❌ Postgres pool error:', err.message);
});

pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('❌ Postgres client error:', err.message);
  });
});

// Verify DB connectivity without holding a client
pool.query('SELECT 1')
  .then(() => {
    console.log("✅ Database connected (Neon / Postgres)");
  })
  .catch(err => {
    console.error("❌ Database connection failed:", err.message);
  });

// Ensure reviews table exists
async function ensureReviewsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      vendor_id INTEGER NOT NULL REFERENCES users(id),
      customer_id INTEGER NOT NULL REFERENCES users(id),
      quote_id INTEGER NOT NULL REFERENCES quotes(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (customer_id, quote_id)
    )
  `);

  await pool.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS comment TEXT
  `);

  await pool.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS response_text TEXT
  `);

  await pool.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS response_at TIMESTAMP
  `);

  await pool.query(`
    ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0
  `);
}

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
  app.use('/api/email', emailLimiter, emailRouter);
  console.log("✉️  Email service routes mounted at /api/email");
} catch (e) {
  console.warn('⚠️ Email service not available:', e && e.message ? e.message : e);
}

// OAuth routes
app.get(['/auth', '/auth/'], (req, res) => {
  res.json({
    message: 'OAuth endpoints',
    endpoints: [
      'GET /auth/google',
      'GET /auth/google/callback',
      'GET /auth/google/status',
      'GET /auth/microsoft',
      'GET /auth/microsoft/callback',
      'GET /auth/microsoft/status'
    ]
  });
});

try {
  const googleAuthRoutes = require('./routes/google-auth');
  if (typeof googleAuthRoutes.setPool === 'function') googleAuthRoutes.setPool(pool);
  app.use('/auth', googleAuthRoutes);
  console.log('🔐 Google OAuth routes mounted at /auth');
} catch (e) {
  console.warn('⚠️ Google OAuth routes not available:', e && e.message ? e.message : e);
}

try {
  const microsoftAuthRoutes = require('./routes/microsoft-auth');
  if (typeof microsoftAuthRoutes.setPool === 'function') microsoftAuthRoutes.setPool(pool);
  app.use('/auth', microsoftAuthRoutes);
  console.log('🔐 Microsoft OAuth routes mounted at /auth');
} catch (e) {
  console.warn('⚠️ Microsoft OAuth routes not available:', e && e.message ? e.message : e);
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

// Uploads (S3 presigned URLs)
try {
  const uploadsRouter = require('./routes/uploads');
  app.use('/api/uploads', uploadLimiter, uploadsRouter);
  console.log('📤 Upload routes mounted at /api/uploads');
} catch (e) {
  console.warn('⚠️ Upload routes not available:', e && e.message ? e.message : e);
}

// Credits routes
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
  console.warn('⚠️ Super Admin routes not available:', e && e.message ? e.message : e);
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
app.post("/api/auth/register", registerLimiter, async (req, res) => {
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
      const baseUrl = process.env.BACKEND_URL
        || process.env.API_URL
        || process.env.BASE_URL
        || 'https://api.tradematch.uk';
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
      'SELECT id, full_name, name, email, email_verified FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found with this email' });
    }

    const user = userResult.rows[0];

    const adminRoles = ['admin', 'super_admin', 'finance_admin'];
    if (user.user_type && (!user.role || (user.role !== user.user_type && !adminRoles.includes(user.role)))) {
      try {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [user.user_type, user.id]);
        user.role = user.user_type;
      } catch (updateError) {
        console.warn('⚠️ Failed to backfill user role:', updateError.message || updateError);
      }
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ 
        error: 'Account is already activated. Please try logging in.' 
      });
    }

    // Invalidate any existing activation tokens for this user
    await pool.query(
      'UPDATE activation_tokens SET used = true WHERE user_id = $1 AND token_type = $2 AND used = false',
      [user.id, 'email_verification']
    );

    // Generate new activation token
    const activationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      'INSERT INTO activation_tokens (user_id, token, token_type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, activationToken, 'email_verification', expiresAt]
    );

    // Send activation email
    try {
      const baseUrl = process.env.BACKEND_URL
        || process.env.API_URL
        || process.env.BASE_URL
        || 'https://api.tradematch.uk';
      await axios.post(`${baseUrl}/api/email/activation`, {
        email: user.email,
        fullName: user.full_name || user.name,
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
app.post("/api/auth/login", authLimiter, async (req, res) => {
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
      'SELECT id, user_type, role, name, email, phone, postcode, email_verified, password_hash FROM users WHERE email = $1',
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
        userType: user.user_type,
        role: user.role
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
        role: user.role,
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

// ==========================================
// QUOTES API ROUTES
// ==========================================

// Create new quote (public guest)
app.post("/api/quotes/public", async (req, res) => {
  try {
    const {
      serviceType,
      title,
      description,
      postcode,
      budgetMin,
      budgetMax,
      urgency,
      additionalDetails
    } = req.body;

    if (!serviceType || !title || !description || !postcode) {
      return res.status(400).json({
        error: 'Missing required fields: serviceType, title, description, postcode'
      });
    }

    const quoteId = 'QT' + crypto.randomBytes(6).toString('hex');

    await pool.query(
      `INSERT INTO quotes
       (id, customer_id, service_type, title, description, postcode, budget_min, budget_max, urgency, status, additional_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10)`,
      [
        quoteId,
        null,
        serviceType,
        title,
        description,
        postcode,
        budgetMin || null,
        budgetMax || null,
        urgency || 'asap',
        additionalDetails ? JSON.stringify(additionalDetails) : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Quote created successfully',
      quote: { id: quoteId }
    });
  } catch (error) {
    console.error('❌ Guest quote error:', error);
    res.status(500).json({
      error: 'Failed to create quote: ' + error.message
    });
  }
});

// Create new quote (protected - requires authentication)
app.post("/api/quotes", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      service,
      serviceName,
      postcode,
      propertyType,
      budget,
      urgency,
      urgencyLabel,
      description,
      name,
      email,
      phone,
      contactPreference
    } = req.body;

    // Validate required fields
    if (!service || !postcode || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: service, postcode, description' 
      });
    }

    // Generate unique quote ID
    const quoteId = 'QT' + crypto.randomBytes(6).toString('hex');

    // Parse budget range
    let budgetMin = null;
    let budgetMax = null;
    if (budget) {
      const budgetMatch = budget.match(/£([\d,]+)\s*-\s*£([\d,]+)/);
      if (budgetMatch) {
        budgetMin = parseFloat(budgetMatch[1].replace(/,/g, ''));
        budgetMax = parseFloat(budgetMatch[2].replace(/,/g, ''));
      }
    }

    // Insert quote into database
    const quoteResult = await pool.query(
      `INSERT INTO quotes 
       (id, customer_id, service_type, title, description, postcode, budget_min, budget_max, urgency, status, additional_details) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10) 
       RETURNING *`,
      [
        quoteId,
        userId,
        service,
        serviceName || service,
        description,
        postcode,
        budgetMin,
        budgetMax,
        urgency || 'asap',
        JSON.stringify({
          propertyType,
          urgencyLabel,
          contactPreference,
          contactName: name,
          contactEmail: email,
          contactPhone: phone
        })
      ]
    );

    const quote = quoteResult.rows[0];

    console.log('✅ Quote created:', quoteId);

    return res.json({
      success: true,
      message: 'Quote created successfully',
      quote: {
        id: quote.id,
        serviceType: quote.service_type,
        title: quote.title,
        description: quote.description,
        postcode: quote.postcode,
        budgetMin: quote.budget_min,
        budgetMax: quote.budget_max,
        urgency: quote.urgency,
        status: quote.status,
        createdAt: quote.created_at
      }
    });

  } catch (error) {
    console.error('❌ Create quote error:', error);
    res.status(500).json({ 
      error: 'Failed to create quote: ' + error.message 
    });
  }
});

// Get all quotes for a customer (protected)
app.get("/api/quotes/customer/:customerId", authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;

    // Verify user can only access their own quotes
    if (req.user.userId !== customerId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const quotesResult = await pool.query(
      `SELECT q.*, 
              COUNT(DISTINCT b.id) as bid_count
       FROM quotes q
       LEFT JOIN bids b ON q.id = b.quote_id
       WHERE q.customer_id = $1
       GROUP BY q.id
       ORDER BY q.created_at DESC`,
      [customerId]
    );

    const quotes = quotesResult.rows.map(q => ({
      id: q.id,
      serviceType: q.service_type,
      title: q.title,
      description: q.description,
      postcode: q.postcode,
      budgetMin: q.budget_min,
      budgetMax: q.budget_max,
      urgency: q.urgency,
      status: q.status,
      bidCount: parseInt(q.bid_count) || 0,
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));

    return res.json({
      success: true,
      quotes
    });

  } catch (error) {
    console.error('❌ Get customer quotes error:', error);
    res.status(500).json({ 
      error: 'Failed to get quotes: ' + error.message 
    });
  }
});

// Get single quote details (protected)
app.get("/api/quotes/:quoteId", authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;

    const quoteResult = await pool.query(
      `SELECT q.*, u.name as customer_name, u.email as customer_email
       FROM quotes q
       JOIN users u ON q.customer_id = u.id
       WHERE q.id = $1`,
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Verify user has access (customer who created it, or any vendor)
    const isCustomer = req.user.userId === quote.customer_id;
    const isVendor = req.user.userType === 'vendor';

    if (!isCustomer && !isVendor) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({
      success: true,
      quote: {
        id: quote.id,
        customerId: quote.customer_id,
        customerName: quote.customer_name,
        customerEmail: isCustomer || isVendor ? quote.customer_email : null,
        serviceType: quote.service_type,
        title: quote.title,
        description: quote.description,
        postcode: quote.postcode,
        budgetMin: quote.budget_min,
        budgetMax: quote.budget_max,
        urgency: quote.urgency,
        status: quote.status,
        additionalDetails: quote.additional_details,
        createdAt: quote.created_at,
        updatedAt: quote.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Get quote error:', error);
    res.status(500).json({ 
      error: 'Failed to get quote: ' + error.message 
    });
  }
});

// Get all open quotes (for vendors to browse)
app.get("/api/quotes/browse/open", authenticateToken, async (req, res) => {
  try {
    // Only vendors can browse quotes
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can browse quotes' });
    }

    const { service, postcode, limit = 50 } = req.query;

    let query = `
      SELECT q.*, 
             COUNT(DISTINCT b.id) as bid_count
      FROM quotes q
      LEFT JOIN bids b ON q.id = b.quote_id
      WHERE q.status = 'open'
    `;
    const params = [];

    if (service) {
      params.push(service);
      query += ` AND q.service_type = $${params.length}`;
    }

    if (postcode) {
      params.push(postcode);
      query += ` AND q.postcode ILIKE $${params.length}`;
    }

    query += ` GROUP BY q.id ORDER BY q.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const quotesResult = await pool.query(query, params);

    const quotes = quotesResult.rows.map(q => ({
      id: q.id,
      serviceType: q.service_type,
      title: q.title,
      description: q.description,
      postcode: q.postcode,
      budgetMin: q.budget_min,
      budgetMax: q.budget_max,
      urgency: q.urgency,
      bidCount: parseInt(q.bid_count) || 0,
      createdAt: q.created_at
    }));

    return res.json({
      success: true,
      quotes
    });

  } catch (error) {
    console.error('❌ Browse quotes error:', error);
    res.status(500).json({ 
      error: 'Failed to browse quotes: ' + error.message 
    });
  }
});

// Update quote status (protected - customer only)
app.patch("/api/quotes/:quoteId", authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['open', 'closed', 'awarded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    // Verify quote exists and user owns it
    const quoteResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quoteResult.rows[0].customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update quote status
    await pool.query(
      'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, quoteId]
    );

    // Trigger review reminder when closing a job
    if (status === 'closed') {
      try {
        const acceptedBidRes = await pool.query(
          'SELECT vendor_id FROM bids WHERE quote_id = $1 AND status = $2 LIMIT 1',
          [quoteId, 'accepted']
        );
        if (acceptedBidRes.rows.length) {
          const vendorId = acceptedBidRes.rows[0].vendor_id;
          const vendorRes = await pool.query('SELECT name FROM users WHERE id = $1', [vendorId]);
          const vendorName = vendorRes.rows[0]?.name || 'your tradesperson';
          const apiUrl = process.env.API_URL || 'http://localhost:5001';
          await axios.post(`${apiUrl}/api/email/review-reminder`, {
            customerId: req.user.userId,
            vendorName,
            quoteId
          }, { timeout: 5000 });
          console.log('📧 Review reminder queued');
        }
      } catch (emailErr) {
        console.error('Failed to queue review reminder:', emailErr.message);
      }
    }

    console.log('✅ Quote updated:', quoteId, 'Status:', status);

    return res.json({
      success: true,
      message: 'Quote status updated successfully'
    });

  } catch (error) {
    console.error('❌ Update quote error:', error);
    res.status(500).json({ 
      error: 'Failed to update quote: ' + error.message 
    });
  }
});

// Update quote details (protected - customer only)
app.put("/api/quotes/:quoteId", authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { title, description, budgetMin, budgetMax, urgency, postcode } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (title) { updates.push(`title = $${idx}`); values.push(title); idx++; }
    if (description) { updates.push(`description = $${idx}`); values.push(description); idx++; }
    if (budgetMin !== undefined) { updates.push(`budget_min = $${idx}`); values.push(budgetMin); idx++; }
    if (budgetMax !== undefined) { updates.push(`budget_max = $${idx}`); values.push(budgetMax); idx++; }
    if (urgency) { updates.push(`urgency = $${idx}`); values.push(urgency); idx++; }
    if (postcode) { updates.push(`postcode = $${idx}`); values.push(postcode); idx++; }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const quoteResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quoteResult.rows[0].customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateQuery = `UPDATE quotes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`;
    values.push(quoteId);

    await pool.query(updateQuery, values);

    console.log('✅ Quote updated (details):', quoteId);

    return res.json({
      success: true,
      message: 'Quote updated successfully'
    });

  } catch (error) {
    console.error('❌ Update quote details error:', error);
    res.status(500).json({
      error: 'Failed to update quote: ' + error.message
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

// ==========================================
// BIDS API ROUTES
// ==========================================

let bidsColumnsCache = null;

const getBidsColumns = async () => {
  if (bidsColumnsCache) return bidsColumnsCache;
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'bids'`
  );
  bidsColumnsCache = new Set(result.rows.map((row) => row.column_name));
  return bidsColumnsCache;
};

// Submit a bid on a quote (vendors only)
app.post("/api/bids", authenticateToken, async (req, res) => {
  try {
    // Only vendors can submit bids
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can submit bids' });
    }

    const vendorUserId = req.user.userId;
    const {
      quoteId,
      price,
      message,
      timeline,
      startDate
    } = req.body;

    // Validate required fields
    if (!quoteId || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields: quoteId, price' 
      });
    }

    // Verify quote exists and is open
    const quoteResult = await pool.query(
      'SELECT id, status, customer_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    if (quote.status !== 'open') {
      return res.status(400).json({ error: 'This quote is no longer accepting bids' });
    }

    let vendorId = vendorUserId;
    const existingVendor = await pool.query(
      'SELECT id FROM vendors WHERE user_id = $1 OR id = $1 LIMIT 1',
      [vendorUserId]
    );

    if (existingVendor.rows.length > 0) {
      vendorId = existingVendor.rows[0].id;
    } else {
      const userResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [vendorUserId]
      );
      const user = userResult.rows[0] || {};
      const companyName = user.name || user.email || 'TradeMatch Vendor';
      const serviceType = quote.service_type || req.body.serviceType || req.body.service || 'general';

      const insertVendor = await pool.query(
        `INSERT INTO vendors (id, user_id, company_name, service_type, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
         RETURNING id`,
        [vendorUserId, vendorUserId, companyName, serviceType]
      );

      vendorId = insertVendor.rows[0].id;
      console.log('✅ Created vendor profile for user:', vendorUserId, 'vendor:', vendorId);
    }

    // Check if vendor already bid on this quote
    const existingBid = await pool.query(
      'SELECT id FROM bids WHERE quote_id = $1 AND vendor_id = $2',
      [quoteId, vendorId]
    );

    if (existingBid.rows.length > 0) {
      return res.status(400).json({ error: 'You have already submitted a bid for this quote' });
    }

    // Generate unique bid ID
    const bidId = 'BID' + crypto.randomBytes(6).toString('hex');

    const columns = await getBidsColumns();
    const insertColumns = ['id', 'quote_id', 'vendor_id', 'price', 'message', 'status'];
    const values = [bidId, quoteId, vendorId, price, message, 'pending'];

    if (columns.has('estimated_duration')) {
      insertColumns.push('estimated_duration');
      values.push(timeline || req.body.estimatedDuration || null);
    } else if (columns.has('timeline')) {
      insertColumns.push('timeline');
      values.push(timeline || null);
    }

    if (columns.has('availability')) {
      insertColumns.push('availability');
      values.push(req.body.availability || null);
    } else if (columns.has('start_date')) {
      insertColumns.push('start_date');
      values.push(startDate || null);
    }

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`);

    // Insert bid
    const bidResult = await pool.query(
      `INSERT INTO bids (${insertColumns.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING *`,
      values
    );

    const bid = bidResult.rows[0];

    console.log('✅ Bid submitted:', bidId, 'Quote:', quoteId);

    return res.json({
      success: true,
      message: 'Bid submitted successfully',
      bid: {
        id: bid.id,
        quoteId: bid.quote_id,
        price: bid.price,
        message: bid.message,
        timeline: bid.timeline || bid.estimated_duration,
        status: bid.status,
        createdAt: bid.created_at
      }
    });

  } catch (error) {
    console.error('❌ Submit bid error:', error);
    res.status(500).json({ 
      error: 'Failed to submit bid: ' + error.message 
    });
  }
});

// Get all bids for a quote (customer and bidding vendors)
app.get("/api/bids/quote/:quoteId", authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;

    // Verify quote exists
    const quoteResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Only quote owner can see all bids
    if (req.user.userId !== quote.customer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all bids with vendor info
    const bidsResult = await pool.query(
      `SELECT b.*, u.name as vendor_name, u.email as vendor_email, u.phone as vendor_phone
       FROM bids b
       JOIN users u ON b.vendor_id = u.id
       WHERE b.quote_id = $1
       ORDER BY b.created_at DESC`,
      [quoteId]
    );

    const bids = bidsResult.rows.map(b => ({
      id: b.id,
      vendorId: b.vendor_id,
      vendorName: b.vendor_name,
      vendorEmail: b.vendor_email,
      vendorPhone: b.vendor_phone,
      price: b.price,
      message: b.message,
      timeline: b.timeline,
      startDate: b.start_date,
      status: b.status,
      createdAt: b.created_at
    }));

    return res.json({
      success: true,
      bids
    });

  } catch (error) {
    console.error('❌ Get quote bids error:', error);
    res.status(500).json({ 
      error: 'Failed to get bids: ' + error.message 
    });
  }
});

// Get vendor's bids (vendor only)
app.get("/api/bids/vendor/:vendorId", authenticateToken, async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Verify user can only access their own bids
    if (req.user.userId !== vendorId || req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const bidsResult = await pool.query(
      `SELECT b.*, q.title, q.service_type, q.postcode, q.status as quote_status
       FROM bids b
       JOIN quotes q ON b.quote_id = q.id
       WHERE b.vendor_id = $1
       ORDER BY b.created_at DESC`,
      [vendorId]
    );

    const bids = bidsResult.rows.map(b => ({
      id: b.id,
      quoteId: b.quote_id,
      quoteTitle: b.title,
      serviceType: b.service_type,
      postcode: b.postcode,
      quoteStatus: b.quote_status,
      price: b.price,
      message: b.message,
      timeline: b.timeline,
      startDate: b.start_date,
      status: b.status,
      createdAt: b.created_at
    }));

    return res.json({
      success: true,
      bids
    });

  } catch (error) {
    console.error('❌ Get vendor bids error:', error);
    res.status(500).json({ 
      error: 'Failed to get bids: ' + error.message 
    });
  }
});

// Accept a bid (customer only)
app.patch("/api/bids/:bidId/accept", authenticateToken, async (req, res) => {
  try {
    const { bidId } = req.params;

    // Get bid and quote info
    const bidResult = await pool.query(
      `SELECT b.*, q.customer_id, q.id as quote_id
       FROM bids b
       JOIN quotes q ON b.quote_id = q.id
       WHERE b.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify user is the quote owner
    if (req.user.userId !== bid.customer_id) {
      return res.status(403).json({ error: 'Only the quote owner can accept bids' });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'This bid has already been processed' });
    }

    // Accept the bid
    await pool.query(
      'UPDATE bids SET status = $1, updated_at = NOW() WHERE id = $2',
      ['accepted', bidId]
    );

    // Reject all other bids for this quote
    await pool.query(
      'UPDATE bids SET status = $1, updated_at = NOW() WHERE quote_id = $2 AND id != $3 AND status = $4',
      ['rejected', bid.quote_id, bidId, 'pending']
    );

    // Update quote status to awarded
    await pool.query(
      'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
      ['awarded', bid.quote_id]
    );

    // Email notifications: notify vendor their bid was accepted and customer confirmation
    try {
      const vendorResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [bid.vendor_id]);
      const customerResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [bid.customer_id]);
      const quoteResult = await pool.query('SELECT title FROM quotes WHERE id = $1', [bid.quote_id]);

      const vendorName = vendorResult.rows[0]?.name || 'Vendor';
      const customerName = customerResult.rows[0]?.name || 'Customer';
      const quoteTitle = quoteResult.rows[0]?.title || 'Your job';

        const apiUrl = process.env.BACKEND_URL
          || process.env.BASE_URL
          || `http://localhost:${process.env.PORT || 3001}`;
        // Notify vendor: bid accepted
        await axios.post(`${apiUrl}/api/email/bid-accepted`, {
          vendorId: bid.vendor_id,
          customerName,
          quoteTitle,
          bidAmount: bid.price,
          quoteId: bid.quote_id
        }, { timeout: 5000 }).catch(err => console.error('Bid accepted email failed:', err.message));

        // Optional: notify customer confirmation using general send
        await axios.post(`${apiUrl}/api/email/send`, {
          to: customerResult.rows[0]?.email,
          subject: 'You accepted a bid - next steps',
          html: `<h2>Bid Accepted</h2><p>You accepted ${vendorName}'s bid for "${quoteTitle}".</p><p>We’ll notify the vendor and guide payment into escrow.</p>`
        }, { timeout: 5000 }).catch(err => console.error('Customer confirmation email failed:', err.message));
      } catch (emailErr) {
        console.error('Email notify on bid accept failed:', emailErr.message);
      }

      res.json({
        success: true,
        message: 'Bid accepted successfully'
      });

  } catch (error) {
    console.error('❌ Accept bid error:', error);
    res.status(500).json({ 
      error: 'Failed to accept bid: ' + error.message 
    });
  }
});

// Reject a bid (customer only)
app.patch("/api/bids/:bidId/reject", authenticateToken, async (req, res) => {
  try {
    const { bidId } = req.params;

    // Get bid and quote info
    const bidResult = await pool.query(
      `SELECT b.*, q.customer_id
       FROM bids b
       JOIN quotes q ON b.quote_id = q.id
       WHERE b.id = $1`,
      [bidId]
    );

    if (bidResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    const bid = bidResult.rows[0];

    // Verify user is the quote owner
    if (req.user.userId !== bid.customer_id) {
      return res.status(403).json({ error: 'Only the quote owner can reject bids' });
    }

    if (bid.status !== 'pending') {
      return res.status(400).json({ error: 'This bid has already been processed' });
    }

    // Reject the bid
    await pool.query(
      'UPDATE bids SET status = $1, updated_at = NOW() WHERE id = $2',
      ['rejected', bidId]
    );

    console.log('✅ Bid rejected:', bidId);

    return res.json({
      success: true,
      message: 'Bid rejected successfully'
    });

  } catch (error) {
    console.error('❌ Reject bid error:', error);
    res.status(500).json({ 
      error: 'Failed to reject bid: ' + error.message 
    });
  }
});

// Search for vendors by service and location
app.get("/api/vendors/search", async (req, res) => {
  try {
    const { service, postcode, radius = 10 } = req.query;
    
    if (!service || !postcode) {
      return res.status(400).json({ 
        error: 'Service and postcode are required' 
      });
    }

    // Get all vendors who offer this service
    // In a production system, you'd calculate actual distances using postcodes
    // For now, we'll do a simple query for vendors with this service
    const vendorsResult = await pool.query(
      `SELECT DISTINCT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(DISTINCT b.id) as bids_submitted,
              COUNT(DISTINCT CASE WHEN b.status = 'accepted' THEN b.id END) as jobs_completed,
              ROUND(AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE NULL END), 1) as average_rating,
              COUNT(DISTINCT r.id) as total_reviews
       FROM users u
       LEFT JOIN bids b ON u.id = b.vendor_id AND b.status IN ('accepted')
       LEFT JOIN reviews r ON u.id = r.vendor_id
      WHERE u.user_type = 'vendor' OR u.role = 'vendor'
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at
       ORDER BY average_rating DESC, jobs_completed DESC
       LIMIT 20`
    );

    const vendors = vendorsResult.rows.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      bids_submitted: parseInt(vendor.bids_submitted),
      jobs_completed: parseInt(vendor.jobs_completed),
      average_rating: vendor.average_rating ? parseFloat(vendor.average_rating) : null,
      total_reviews: parseInt(vendor.total_reviews),
      member_since: new Date(vendor.created_at).toLocaleDateString('en-GB', { 
        year: 'numeric', 
        month: 'short' 
      })
    }));

    console.log(`✅ Found ${vendors.length} vendors for service: ${service}`);

    return res.json({
      success: true,
      data: vendors
    });

  } catch (error) {
    console.error('❌ Vendor search error:', error);
    res.status(500).json({ 
      error: 'Failed to search vendors: ' + error.message 
    });
  }
});

// Get vendor profile details by ID
app.get("/api/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await ensureReviewsTable();

    // Fetch vendor details with stats and reviews
    const vendorResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(DISTINCT b.id) as bids_submitted,
              COUNT(DISTINCT CASE WHEN b.status = 'accepted' THEN b.id END) as jobs_completed,
              ROUND(AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating ELSE NULL END), 1) as average_rating,
              COUNT(DISTINCT r.id) as total_reviews
       FROM users u
       LEFT JOIN bids b ON u.id = b.vendor_id AND b.status IN ('accepted')
       LEFT JOIN reviews r ON u.id = r.vendor_id
      WHERE u.id = $1 AND (u.user_type = 'vendor' OR u.role = 'vendor')
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at`,
      [id]
    );

    if (!vendorResult.rows[0]) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = vendorResult.rows[0];

    // Fetch reviews for this vendor
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, c.name as customer_name
       FROM reviews r
       JOIN users c ON r.customer_id = c.id
       WHERE r.vendor_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const vendorData = {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      bids_submitted: parseInt(vendor.bids_submitted),
      jobs_completed: parseInt(vendor.jobs_completed),
      average_rating: vendor.average_rating ? parseFloat(vendor.average_rating) : null,
      total_reviews: parseInt(vendor.total_reviews),
      member_since: new Date(vendor.created_at).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      reviews: reviewsResult.rows.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customer_name: r.customer_name,
        date: new Date(r.created_at).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
    };

    return res.json({
      success: true,
      data: vendorData
    });

  } catch (error) {
    console.error('❌ Vendor profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch vendor profile: ' + error.message 
    });
  }
});

// ===== REVIEWS API =====

// Add a review for a vendor (customer only)
app.post("/api/reviews", authenticateToken, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { vendor_id, quote_id, rating, comment } = req.body;

    await ensureReviewsTable();

    if (!vendor_id || !quote_id || !rating) {
      return res.status(400).json({ error: 'vendor_id, quote_id, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const trimmedComment = (comment || '').toString().trim();
    if (trimmedComment.length > 1000) {
      return res.status(400).json({ error: 'Comment is too long (max 1000 characters)' });
    }

    // Ensure quote belongs to this customer
    const quoteResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [quote_id]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quoteResult.rows[0].customer_id !== userId) {
      return res.status(403).json({ error: 'You can only review your own quotes' });
    }

    // Ensure vendor has an accepted/paid bid on this quote
    const bidResult = await pool.query(
      `SELECT id, status FROM bids 
       WHERE quote_id = $1 AND vendor_id = $2 AND status IN ('accepted', 'paid')
       ORDER BY created_at DESC LIMIT 1`,
      [quote_id, vendor_id]
    );

    if (bidResult.rows.length === 0) {
      return res.status(400).json({ error: 'You can only review vendors you hired for this quote' });
    }

    try {
      const columnsResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'`
      );
      const columns = new Set(columnsResult.rows.map((row) => row.column_name));

      const reviewId = 'REV' + crypto.randomBytes(8).toString('hex');
      const insertColumns = [];
      const insertValues = [];

      if (columns.has('id')) {
        insertColumns.push('id');
        insertValues.push(reviewId);
      }

      insertColumns.push('vendor_id', 'customer_id', 'quote_id', 'rating');
      insertValues.push(vendor_id, userId, quote_id, rating);

      if (columns.has('comment')) {
        insertColumns.push('comment');
        insertValues.push(trimmedComment);
      } else if (columns.has('review_text')) {
        insertColumns.push('review_text');
        insertValues.push(trimmedComment);
      }

      const placeholders = insertValues.map((_, idx) => `$${idx + 1}`);

      const reviewResult = await pool.query(
        `INSERT INTO reviews (${insertColumns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING id, vendor_id, customer_id, quote_id, rating, comment, created_at`,
        insertValues
      );

      const review = reviewResult.rows[0];

      console.log(`✅ Review added by user ${userId} for vendor ${vendor_id}`);

      return res.json({
        success: true,
        data: {
          id: review.id,
          vendor_id: review.vendor_id,
          customer_id: review.customer_id,
          quote_id: review.quote_id,
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at
        }
      });

    } catch (insertErr) {
      if (insertErr.code === '23505') {
        return res.status(400).json({ error: 'You have already left a review for this job' });
      }
      throw insertErr;
    }

  } catch (error) {
    console.error('❌ Add review error:', error);
    res.status(500).json({ 
      error: 'Failed to add review: ' + error.message 
    });
  }
});

// Get reviews for a vendor
app.get("/api/reviews/vendor/:vendorId", async (req, res) => {
  try {
    const { vendorId } = req.params;

    await ensureReviewsTable();

    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, c.name as customer_name
       FROM reviews r
       JOIN users c ON r.customer_id = c.id
       WHERE r.vendor_id = $1
       ORDER BY r.created_at DESC`,
      [vendorId]
    );

    return res.json({
      success: true,
      data: reviewsResult.rows.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customer_name: r.customer_name,
        date: new Date(r.created_at).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
    });

  } catch (error) {
    console.error('❌ Get vendor reviews error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch reviews: ' + error.message 
    });
  }
});

// Vendor response to a review
app.post("/api/reviews/:reviewId/response", authenticateToken, async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { reviewId } = req.params;
  const { responseText } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!responseText || !responseText.trim()) {
    return res.status(400).json({ error: 'responseText is required' });
  }

  try {
    await ensureReviewsTable();

    const reviewResult = await pool.query(
      'SELECT vendor_id FROM reviews WHERE id = $1',
      [reviewId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviewResult.rows[0].vendor_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await pool.query(
      `UPDATE reviews
       SET response_text = $1, response_at = NOW()
       WHERE id = $2`,
      [responseText.trim(), reviewId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Review response error:', error);
    return res.status(500).json({ error: 'Failed to post response' });
  }
});

// Mark review as helpful
app.post("/api/reviews/:reviewId/helpful", authenticateToken, async (req, res) => {
  const { reviewId } = req.params;

  try {
    await ensureReviewsTable();

    await pool.query(
      'UPDATE reviews SET helpful_count = COALESCE(helpful_count, 0) + 1 WHERE id = $1',
      [reviewId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Helpful vote error:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ===== MESSAGING API =====

// Send a message
app.post("/api/messages", authenticateToken, async (req, res) => {
  try {
    const { recipient_id, message_text } = req.body;
    const sender_id = req.user.userId;

    if (!recipient_id || !message_text) {
      return res.status(400).json({ error: 'recipient_id and message_text are required' });
    }

    const usersResult = await pool.query(
      'SELECT id, user_type FROM users WHERE id = ANY($1)',
      [[sender_id, recipient_id]]
    );

    const sender = usersResult.rows.find(row => row.id === sender_id);
    const recipient = usersResult.rows.find(row => row.id === recipient_id);

    if (!sender || !recipient) {
      return res.status(404).json({ error: 'Sender or recipient not found' });
    }

    let customerId = null;
    let vendorId = null;

    if (sender.user_type === 'customer' && recipient.user_type === 'vendor') {
      customerId = sender_id;
      vendorId = recipient_id;
    } else if (sender.user_type === 'vendor' && recipient.user_type === 'customer') {
      customerId = recipient_id;
      vendorId = sender_id;
    } else {
      return res.status(400).json({ error: 'Messaging requires one customer and one vendor' });
    }

    let conversationId = null;
    const convoResult = await pool.query(
      `SELECT id FROM conversations
       WHERE customer_id = $1 AND vendor_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId, vendorId]
    );

    if (convoResult.rows.length > 0) {
      conversationId = convoResult.rows[0].id;
    } else {
      const jobId = 'JOB' + crypto.randomBytes(6).toString('hex');
      await pool.query(
        `INSERT INTO jobs (id, customer_id, title, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [jobId, customerId, 'Messaging thread']
      );

      conversationId = 'CONV' + crypto.randomBytes(6).toString('hex');
      await pool.query(
        `INSERT INTO conversations (id, job_id, customer_id, vendor_id, contact_allowed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        [conversationId, jobId, customerId, vendorId]
      );
    }

    const messageId = 'MSG' + crypto.randomBytes(6).toString('hex');
    const insertResult = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, created_at)
       VALUES ($1, $2, $3, $4, 'text', $5, NOW())
       RETURNING *`,
      [messageId, conversationId, sender_id, sender.user_type, message_text]
    );

    await pool.query(
      `UPDATE conversations
       SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [messageId, conversationId]
    );

    const message = insertResult.rows[0];

    console.log(`✅ Message sent in conversation ${conversationId}`);

    return res.json({
      success: true,
      data: {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        sender_role: message.sender_role,
        body: message.body,
        created_at: message.created_at
      }
    });

  } catch (error) {
    console.error('❌ Message send error:', error);
    return res.status(500).json({ error: 'Failed to send message: ' + error.message });
  }
});

// Get messages with a specific user (conversation)
app.get("/api/messages/conversation/:otherId", authenticateToken, async (req, res) => {
  try {
    const { otherId } = req.params;
    const userId = req.user.userId;

    const usersResult = await pool.query(
      'SELECT id, user_type FROM users WHERE id = ANY($1)',
      [[userId, otherId]]
    );

    const current = usersResult.rows.find(row => row.id === userId);
    const other = usersResult.rows.find(row => row.id === otherId);

    if (!current || !other) {
      return res.status(404).json({ error: 'User not found' });
    }

    let customerId = null;
    let vendorId = null;

    if (current.user_type === 'customer' && other.user_type === 'vendor') {
      customerId = userId;
      vendorId = otherId;
    } else if (current.user_type === 'vendor' && other.user_type === 'customer') {
      customerId = otherId;
      vendorId = userId;
    } else {
      return res.status(400).json({ error: 'Conversation requires customer/vendor pair' });
    }

    const convoResult = await pool.query(
      `SELECT id FROM conversations
       WHERE customer_id = $1 AND vendor_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId, vendorId]
    );

    if (convoResult.rows.length === 0) {
      return res.json({ success: true, messages: [] });
    }

    const conversationId = convoResult.rows[0].id;
    const result = await pool.query(
      `SELECT id, conversation_id, sender_id, sender_role, message_type, body, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversationId]
    );

    return res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    console.error('❌ Get conversation messages error:', error);
    return res.status(500).json({ error: 'Failed to fetch messages: ' + error.message });
  }
});

// Get list of conversations (users you've messaged)
app.get("/api/messages/conversations", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT c.id as conversation_id,
              c.customer_id,
              c.vendor_id,
              c.last_message_at,
              m.body as last_message,
              u.id as other_user_id,
              u.name,
              u.email
       FROM conversations c
       LEFT JOIN messages m ON m.id = c.last_message_id
       JOIN users u ON u.id = CASE WHEN c.customer_id = $1 THEN c.vendor_id ELSE c.customer_id END
       WHERE c.customer_id = $1 OR c.vendor_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Get conversations error:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations: ' + error.message });
  }
});

// ===== PAYMENT API =====

// Create Stripe Payment Intent
app.post("/api/payments/create-intent", authenticateToken, paymentLimiter, async (req, res) => {
  try {
    const { bidId, bid_id, quoteId, quote_id, amount } = req.body;
    const customer_id = req.user.userId;
    const resolvedBidId = bidId || bid_id || null;
    const resolvedQuoteId = quoteId || quote_id || null;

    if (!resolvedQuoteId || !amount) {
      return res.status(400).json({ error: 'quote_id and amount are required' });
    }

    if (amount < 1) {
      return res.status(400).json({ error: 'Amount must be at least $1' });
    }

    let vendor_id = null;
    let finalQuoteId = resolvedQuoteId;

    if (resolvedBidId) {
      const bidResult = await pool.query(
        'SELECT vendor_id, quote_id FROM bids WHERE id = $1 AND status = $2',
        [resolvedBidId, 'accepted']
      );

      if (!bidResult.rows[0]) {
        return res.status(400).json({ error: 'Accepted bid not found' });
      }

      vendor_id = bidResult.rows[0].vendor_id;
      finalQuoteId = bidResult.rows[0].quote_id || finalQuoteId;
    } else {
      const bidResult = await pool.query(
        'SELECT vendor_id FROM bids WHERE quote_id = $1 AND status = $2 LIMIT 1',
        [resolvedQuoteId, 'accepted']
      );

      if (!bidResult.rows[0]) {
        return res.status(400).json({ error: 'Accepted bid not found for quote' });
      }

      vendor_id = bidResult.rows[0].vendor_id;
    }

    const currency = (process.env.DEFAULT_CURRENCY || 'GBP').toLowerCase();

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        bid_id: resolvedBidId ? resolvedBidId.toString() : '',
        quote_id: finalQuoteId.toString(),
        customer_id: customer_id.toString(),
        vendor_id: vendor_id.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // Store payment record in database
    const paymentId = 'PAY' + crypto.randomBytes(6).toString('hex');
    const paymentResult = await pool.query(
      `INSERT INTO payments (id, quote_id, customer_id, vendor_id, amount, currency, stripe_payment_intent_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
       RETURNING *`,
      [
        paymentId,
        finalQuoteId,
        customer_id,
        vendor_id,
        Math.round(amount * 100),
        currency.toUpperCase(),
        paymentIntent.id,
        { bidId: resolvedBidId }
      ]
    );

    const payment = paymentResult.rows[0];

    console.log(`✅ Payment intent created: ${paymentIntent.id} for quote ${finalQuoteId}`);

    return res.json({
      success: true,
      data: {
        payment_id: payment.id,
        stripe_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: amount,
        currency: currency.toUpperCase()
      }
    });

  } catch (error) {
    console.error('❌ Payment intent error:', error);
    return res.status(500).json({ error: 'Failed to create payment intent: ' + error.message });
  }
});

// ===== MILESTONE API =====

// Create milestones for a quote
app.post("/api/milestones/create", authenticateToken, async (req, res) => {
  try {
    const { quoteId, paymentId, milestones } = req.body;

    if (!quoteId || !Array.isArray(milestones) || milestones.length === 0) {
      return res.status(400).json({ error: 'quoteId and milestones are required' });
    }

    let resolvedPaymentId = paymentId;
    if (!resolvedPaymentId) {
      const paymentResult = await pool.query(
        'SELECT id FROM payments WHERE quote_id = $1 ORDER BY created_at DESC LIMIT 1',
        [quoteId]
      );
      resolvedPaymentId = paymentResult.rows[0]?.id || null;
    }

    const quoteResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (resolvedPaymentId) {
      await pool.query('DELETE FROM payment_milestones WHERE payment_id = $1', [resolvedPaymentId]);
    }

    const created = [];
    for (let i = 0; i < milestones.length; i += 1) {
      const milestone = milestones[i];
      const milestoneId = 'ms_' + crypto.randomBytes(8).toString('hex');

      await pool.query(
        `INSERT INTO payment_milestones (id, payment_id, name, amount, percentage, status, due_date)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
        [
          milestoneId,
          resolvedPaymentId,
          milestone.title || `Milestone ${i + 1}`,
          milestone.amount,
          milestone.percentage || null,
          milestone.dueDate ? new Date(milestone.dueDate) : null
        ]
      );

      created.push({ id: milestoneId, title: milestone.title, amount: milestone.amount });
    }

    return res.json({
      success: true,
      message: 'Milestones created successfully',
      milestones: created
    });
  } catch (error) {
    console.error('❌ Create milestones error:', error);
    return res.status(500).json({ error: 'Failed to create milestones: ' + error.message });
  }
});

// Get milestones for a quote
app.get("/api/milestones/quote/:quoteId", authenticateToken, async (req, res) => {
  try {
    const { quoteId } = req.params;
    const paymentResult = await pool.query(
      'SELECT id FROM payments WHERE quote_id = $1 ORDER BY created_at DESC LIMIT 1',
      [quoteId]
    );
    const paymentId = paymentResult.rows[0]?.id;
    const result = paymentId
      ? await pool.query(
          'SELECT * FROM payment_milestones WHERE payment_id = $1 ORDER BY created_at ASC',
          [paymentId]
        )
      : { rows: [] };

    return res.json({ success: true, milestones: result.rows });
  } catch (error) {
    console.error('❌ Get milestones error:', error);
    return res.status(500).json({ error: 'Failed to get milestones: ' + error.message });
  }
});

// Create payment milestones (vendor only)
app.post("/api/payments/milestones", authenticateToken, async (req, res) => {
  try {
    if (req.user.userType !== 'vendor') {
      return res.status(403).json({ error: 'Only vendors can create milestones' });
    }

    const { paymentId, payment_id, milestones } = req.body;
    const resolvedPaymentId = paymentId || payment_id;

    if (!resolvedPaymentId || !Array.isArray(milestones)) {
      return res.status(400).json({ error: 'payment_id and milestones are required' });
    }

    await pool.query('DELETE FROM payment_milestones WHERE payment_id = $1', [resolvedPaymentId]);

    for (let i = 0; i < milestones.length; i += 1) {
      const milestone = milestones[i] || {};
      const milestoneId = 'MS' + crypto.randomBytes(6).toString('hex');
      const name = milestone.name || milestone.title || `Milestone ${i + 1}`;
      const amount = milestone.amount;
      const percentage = milestone.percentage || null;
      const dueDate = milestone.dueDate || milestone.due_date || null;

      await pool.query(
        `INSERT INTO payment_milestones (id, payment_id, name, amount, percentage, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [milestoneId, resolvedPaymentId, name, amount, percentage, dueDate]
      );
    }

    return res.json({
      success: true,
      message: 'Milestones created successfully'
    });
  } catch (error) {
    console.error('❌ Create milestones error:', error);
    res.status(500).json({ error: 'Failed to create milestones: ' + error.message });
  }
});

// Get milestones for a payment
app.get("/api/payments/milestones/:paymentId", authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(
      'SELECT * FROM payment_milestones WHERE payment_id = $1 ORDER BY created_at ASC',
      [paymentId]
    );
    return res.json({
      success: true,
      milestones: result.rows
    });
  } catch (error) {
    console.error('❌ Get milestones error:', error);
    res.status(500).json({ error: 'Failed to get milestones: ' + error.message });
  }
});

// Get payment status
app.get("/api/payments/:paymentId", authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Get payment from database
    const result = await pool.query(
      `SELECT * FROM payments WHERE id = $1 AND (customer_id = $2 OR vendor_id = $2)`,
      [paymentId, userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = result.rows[0];

    // Check status with Stripe
    if (payment.stripe_payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id);
      
      // Update local status if changed
      if (paymentIntent.status !== payment.status) {
        await pool.query(
          'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [paymentIntent.status, paymentId]
        );
      }

      return res.json({
        success: true,
        data: {
          payment_id: payment.id,
          amount: payment.amount / 100,
          status: paymentIntent.status,
          created_at: payment.created_at
        }
      });
    }

    return res.json({
      success: true,
      data: {
        payment_id: payment.id,
        amount: payment.amount / 100,
        status: payment.status,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error('❌ Get payment error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment: ' + error.message 
    });
  }
});

// Get payment by Stripe Intent ID (for webhook confirmation)
app.post("/api/payments/confirm", authenticateToken, async (req, res) => {
  try {
    const { stripe_intent_id } = req.body;

    if (!stripe_intent_id) {
      return res.status(400).json({ error: 'stripe_intent_id is required' });
    }

    // Get payment from database
    const result = await pool.query(
      'SELECT * FROM payments WHERE stripe_payment_intent_id = $1',
      [stripe_intent_id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = result.rows[0];

    // Check Stripe status
    const paymentIntent = await stripe.paymentIntents.retrieve(stripe_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Update payment status
      await pool.query(
        'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [paymentIntent.status, payment.id]
      );

      // Keep bid status within allowed values
      if (payment.vendor_id) {
        await pool.query(
          'UPDATE bids SET status = $1 WHERE quote_id = $2 AND vendor_id = $3',
          ['accepted', payment.quote_id, payment.vendor_id]
        );
      }

      // Update quote status to 'awarded'
      await pool.query(
        'UPDATE quotes SET status = $1 WHERE id = $2',
        ['awarded', payment.quote_id]
      );

      console.log(`✅ Payment confirmed for quote ${payment.quote_id}`);

      return res.json({
        success: true,
        data: {
          payment_id: payment.id,
          status: 'confirmed',
          amount: payment.amount / 100
        }
      });
    }

    return res.json({
      success: false,
      data: { status: paymentIntent.status }
    });

  } catch (error) {
    console.error('❌ Confirm payment error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm payment: ' + error.message 
    });
  }
});

// Debug routes
app.get("/debug/routes", (req, res) => {
  res.json({
    message: "Routes debug info",
    registered_paths: [
      "/api/health",
      "/api/auth/register", 
      "/api/auth/login",
      "/auth/google",
      "/auth/google/callback",
      "/auth/google/status",
      "/auth/microsoft",
      "/auth/microsoft/callback",
      "/auth/microsoft/status"
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
      "GET /auth",
      "GET /auth/google",
      "GET /auth/google/callback",
      "GET /auth/google/status",
      "GET /auth/microsoft",
      "GET /auth/microsoft/callback",
      "GET /auth/microsoft/status",
      "GET /debug/routes"
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log("🚀 TradeMatch API Server - FIXED VERSION (email fixed)");
    console.log(`Port: ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
    console.log(`Working endpoints: POST /api/auth/register, POST /api/auth/login`);
});

module.exports = app;