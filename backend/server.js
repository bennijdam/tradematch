const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();

// Trust proxy for rate limiting behind Render
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
}));

// Body parser
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

// Email transporter setup
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
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
  
  // Set email transporter for routes that need it
  if (quoteRoutes.setEmailTransporter) quoteRoutes.setEmailTransporter(emailTransporter);
  if (bidRoutes.setEmailTransporter) bidRoutes.setEmailTransporter(emailTransporter);
  if (contactRoutes.setEmailTransporter) contactRoutes.setEmailTransporter(emailTransporter);
  if (paymentRoutes.setEmailTransporter) paymentRoutes.setEmailTransporter(emailTransporter);

// Mount core routes
  app.use('/api/auth', authRoutes);
  app.use('/api/quotes', quoteRoutes);
  app.use('/api/bids', bidRoutes);
  app.use('/api/contact', contactRoutes);

  console.log('✅ Core routes mounted');
} catch (error) {
  console.error('❌ Core route mounting error:', error.message);
}

// Import and configure Phase 7+ routes
try {
  // Import middleware
  const { authenticate, requireVendor, requireCustomer } = require('./middleware/auth');
  const { apiLimiter } = require('./middleware/rate-limit');
  
  // Apply global rate limiting
  app.use('/api', apiLimiter);
  
  // Import additional routes
  const customerRoutes = require('./routes/customer');
  const vendorRoutes = require('./routes/vendor');
  const emailRoutes = require('./routes/email');
  
  // Set pool for additional routes
  if (customerRoutes.setPool) customerRoutes.setPool(pool);
  if (vendorRoutes.setPool) vendorRoutes.setPool(pool);
  if (emailRoutes.setPool) emailRoutes.setPool(pool);
  
  // Mount customer routes (protected)
  app.use('/api/customer', authenticate, requireCustomer, customerRoutes);
  
  // Mount vendor routes (protected)
  app.use('/api/vendor', authenticate, requireVendor, vendorRoutes);
  
  // Mount email routes (protected)
  app.use('/api/email', authenticate, emailRoutes);

  console.log('✅ Customer & Vendor routes mounted');
  console.log('✅ Email routes mounted');
} catch (error) {
  console.error('⚠️ Additional routes not available:', error.message);
  console.log('ℹ️ This is okay if you haven\'t deployed Batch 1 yet');
}

// Import Phase 7 advanced routes (optional)
try {
  const paymentRoutes = require('./routes/payments');
  const reviewRoutes = require('./routes/reviews');
  const aiRoutes = require('./routes/ai');
  const analyticsRoutes = require('./routes/analytics');
  const proposalRoutes = require('./routes/proposals');
  const milestoneRoutes = require('./routes/milestones');
  
  if (paymentRoutes.setPool) paymentRoutes.setPool(pool);
  
  // Set webhook pool
  const { setPool: setWebhookPool } = require('./webhooks/stripe');
  setWebhookPool(pool);
  if (reviewRoutes.setPool) reviewRoutes.setPool(pool);
  if (aiRoutes.setPool) aiRoutes.setPool(pool);
  if (analyticsRoutes.setPool) analyticsRoutes.setPool(pool);
  if (proposalRoutes.setPool) proposalRoutes.setPool(pool);
  if (milestoneRoutes.setPool) milestoneRoutes.setPool(pool);
  
  const { authenticate } = require('./middleware/auth');
  
  app.use('/api/payments', authenticate, paymentRoutes);
  app.use('/api/reviews', authenticate, reviewRoutes);
  app.use('/api/ai', authenticate, aiRoutes);
  app.use('/api/analytics', authenticate, analyticsRoutes);
  app.use('/api/proposals', authenticate, proposalRoutes);
  app.use('/api/milestones', authenticate, milestoneRoutes);
  
  console.log('✅ Phase 7 routes mounted');
} catch (error) {
  console.log('ℹ️ Phase 7 routes not available (optional features)');
}

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
