const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();

// Trust proxy for rate limiting behind Render
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
}));

// Performance optimizations
const compression = require('compression');
app.use(compression());
app.use((req, res, next) => {
    // Skip heavy middleware for OAuth routes
    if (req.path.startsWith('/auth/') && !req.path.startsWith('/auth/status')) {
        return next();
    }
    next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Claude API setup for AI description generation (loaded from environment)
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Initialize Passport for session management
app.use(passport.initialize());

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.log('🔧 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: result.rows[0].now,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    name: '🚀 TradeMatch API',
    version: '2.1.0',
    status: 'running',
    documentation: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        refresh: 'POST /api/auth/refresh',
        forgotPassword: 'POST /api/auth/forgot-password'
      },
      quotes: {
        list: 'GET /api/quotes',
        create: 'POST /api/quotes',
        get: 'GET /api/quotes/:id',
        update: 'PUT /api/quotes/:id',
        delete: 'DELETE /api/quotes/:id'
      },
      ai: {
        generateDescription: 'POST /api/ai/generate-description'
      },
      bids: {
        list: 'GET /api/bids/my-bids',
        create: 'POST /api/bids',
        get: 'GET /api/bids/:id',
        update: 'PUT /api/bids/:id'
      },
      customer: {
        dashboard: 'GET /api/customer/dashboard',
        quotes: 'GET /api/customer/quotes',
        payments: 'GET /api/customer/payments',
        reviews: 'GET /api/customer/reviews',
        profile: 'PUT /api/customer/profile',
        acceptBid: 'POST /api/customer/accept-bid'
      },
      vendor: {
        dashboard: 'GET /api/vendor/dashboard',
        availableQuotes: 'GET /api/vendor/available-quotes',
        myBids: 'GET /api/vendor/my-bids',
        earnings: 'GET /api/vendor/earnings',
        reviews: 'GET /api/vendor/reviews',
        profile: 'PUT /api/vendor/profile'
},
      contact: {
        submit: 'POST /api/contact'
      },
      email: {
        welcome: 'POST /api/email/welcome',
        quoteNotification: 'POST /api/email/new-quote-notification',
        bidNotification: 'POST /api/email/new-bid-notification',
        paymentConfirmation: 'POST /api/email/payment-confirmation'
      }
    }
  });
});

// Import and configure core routes
try {
// Import route modules
  const authRoutes = require('./routes/auth');
  const quoteRoutes = require('./routes/quotes');
  const bidRoutes = require('./routes/bids');
  const contactRoutes = require('./routes/contact');
  
  // Set pool for routes that need it
  if (authRoutes.setPool) authRoutes.setPool(pool);
  if (quoteRoutes.setPool) quoteRoutes.setPool(pool);
  if (bidRoutes.setPool) bidRoutes.setPool(pool);
  if (contactRoutes.setPool) contactRoutes.setPool(pool);
  
// Set email transporter for routes that need it (simplified)
  try {
    if (quoteRoutes.setEmailTransporter) quoteRoutes.setEmailTransporter({});
    if (bidRoutes.setEmailTransporter) bidRoutes.setEmailTransporter({});
    if (contactRoutes.setEmailTransporter) contactRoutes.setEmailTransporter({});
  } catch (error) {
    console.log('⚠️ Email transporter setup skipped:', error.message);
  }

  // Mount core routes
  app.use('/api/auth', authRoutes);
  
  // Mount Google OAuth routes (public)
  app.use('/auth', require('./routes/google-auth'));
  
  // Mount Microsoft OAuth routes (public)
  app.use('/auth', require('./routes/microsoft-auth'));
  
  // Mount user management routes
  app.use('/api/user', require('./routes/user'));
  
  // Initialize OAuth providers
  try {
    const googleAuth = require('./config/google-oauth');
    googleAuth.setPool(pool);
    console.log('✅ Google OAuth configured');
  } catch (error) {
    console.warn('⚠️ Google OAuth not configured:', error.message);
  }
  
  try {
    const microsoftAuth = require('./config/microsoft-oauth');
    microsoftAuth.setPool(pool);
    console.log('✅ Microsoft OAuth configured');
  } catch (error) {
    console.warn('⚠️ Microsoft OAuth not configured:', error.message);
  }
  app.use('/api/quotes', quoteRoutes);
  app.use('/api/bids', bidRoutes);
  
  // Mount email routes (protected) using new Resend service
  const { authenticate } = require('./middleware/auth');
  app.use('/api/email', authenticate, require('./routes/email-routes'));
  app.use('/api/contact', contactRoutes);

  console.log('✅ Core routes mounted');
} catch (error) {
  console.error('❌ Core route mounting error:', error.message);
}

// Additional routes temporarily disabled for core stability
console.log('ℹ️ Additional routes disabled - focusing on core auth/quotes/bids');

// Phase 7 routes temporarily disabled to fix core functionality
console.log('ℹ️ Phase 7 routes disabled for stability');

// Stripe Webhook Endpoint
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    
    // Import webhook handler
    const { handleWebhookEvent } = require('./webhooks/stripe');
    await handleWebhookEvent(event);
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

// 404 handler - MUST BE LAST
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/register, POST /api/auth/login',
      quotes: 'GET /api/quotes, POST /api/quotes, POST /api/quotes/public',
      bids: 'GET /api/bids/my-bids, POST /api/bids',
      payments: 'POST /api/payments/create-intent',
      webhooks: 'POST /webhooks/stripe'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🚀 TradeMatch API Server Started');
  console.log('📍 Port:', PORT);
  console.log('❤️ Health:', `http://localhost:${PORT}/api/health`);
  console.log('📚 Docs:', `http://localhost:${PORT}/`);
  console.log('');
});

module.exports = app;
