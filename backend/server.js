const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();

app.set('trust proxy', 1);
app.use(cors({
    origin: process.env.CORS_ORIGINS || '*',
    credentials: true,
}));

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'not connected',
      error: err.message,
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: '🚀 TradeMatch API is running',
    version: '2.0.0 (Phase 7)',
    endpoints: {
      health: '/api/health',
      auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login' },
      quotes: { list: 'GET /api/quotes', create: 'POST /api/quotes' },
      bids: { create: 'POST /api/bids', list: 'GET /api/bids/my-bids' },
      payments: { list: 'GET /api/payments', create: 'POST /api/payments', confirm: 'POST /api/payments' },
      reviews: { list: 'GET /api/reviews', create: 'POST /api/reviews' },
      ai: { enhance: 'POST /api/ai/enhance-quote', estimate: 'POST /api/ai/estimate-cost' },
      analytics: { dashboard: 'GET /api/analytics/dashboard' },
      proposals: { create: 'POST /api/proposals', list: 'GET /api/proposals', generatePdf: 'POST /api/proposals/generate-pdf' },
      milestones: { create: 'POST /api/milestones/create', getQuote: 'GET /api/milestones/quote/:quoteId', updateStatus: 'POST /api/milestones/update-status' }
    }
  });
});

// Import existing routes
try {
  const authRoutes = require('./routes/auth');
  const quoteRoutes = require('./routes/quotes');
  const bidRoutes = require('./routes/bids');
  
  authRoutes.setPool(pool);
  quoteRoutes.setPool(pool);
  bidRoutes.setPool(pool);

  app.use('/api/auth', authRoutes);
  app.use('/api/quotes', quoteRoutes);
  app.use('/api/bids', bidRoutes);

} catch (error) {
  console.error('❌ Core route mounting error:', error.message);
}

// Import Phase 7 routes
try {
  // Import middleware
  const { authenticate, requireVendor, requireCustomer, optionalAuth } = require('./middleware/auth');
  const { apiLimiter, authLimiter, registerLimiter, quoteLimiter, aiLimiter, paymentLimiter, emailLimiter } = require('./middleware/rate-limit');
  
  const paymentRoutes = require('./routes/payments');
  const reviewRoutes = require('./routes/reviews');
  const aiRoutes = require('./routes/ai');
  const analyticsRoutes = require('./routes/analytics');
  const proposalRoutes = require('./routes/proposals');
  const milestoneRoutes = require('./routes/milestones');
  
  paymentRoutes.setPool(pool);
  reviewRoutes.setPool(pool);
  aiRoutes.setPool(pool);
  analyticsRoutes.setPool(pool);
  proposalRoutes.setPool(pool);
  milestoneRoutes.setPool(pool);
  
  // Global API rate limiting
  app.use('/api', apiLimiter);
  
  // Authentication routes with rate limiting
  app.post('/api/auth/login', authLimiter, require('./routes/auth'));
  app.post('/api/auth/register', registerLimiter, require('./routes/auth'));
  app.post('/api/auth/logout', optionalAuth, require('./routes/auth'));
  app.post('/api/auth/refresh', authLimiter, require('./routes/auth'));
  app.post('/api/auth/forgot-password', emailLimiter, require('./routes/auth'));
  
  // Protected API routes
  app.use('/api/payments', authenticate, paymentLimiter, paymentRoutes);
  app.use('/api/reviews', authenticate, reviewRoutes);
  app.use('/api/ai', authenticate, aiLimiter, aiRoutes);
  app.use('/api/analytics', authenticate, analyticsRoutes);
  app.use('/api/proposals', authenticate, proposalRoutes);
  app.use('/api/milestones', authenticate, milestoneRoutes);
  
  // Quote routes with optional auth (public quotes + rate limiting)
  app.get('/api/quotes', optionalAuth, quoteLimiter, require('./routes/quotes'));
  app.post('/api/quotes', authenticate, quoteLimiter, require('./routes/quotes'));
  app.get('/api/quotes/public', quoteLimiter, require('./routes/quotes'));
  
  // Customer-only routes
  app.use('/api/customer', authenticate, requireCustomer, require('./routes/customer'));
  app.use('/api/customer/dashboard', authenticate, requireCustomer, require('./routes/customer'));
  
  // Vendor-only routes
  app.use('/api/vendor', authenticate, requireVendor, require('./routes/vendor'));
  app.use('/api/vendor/bids', authenticate, requireVendor, require('./routes/vendor'));
  app.use('/api/vendor/analytics', authenticate, requireVendor, analyticsRoutes);
  app.use('/api/vendor/dashboard', authenticate, requireVendor, require('./routes/vendor'));
  
  // Email routes with rate limiting
  app.post('/api/send-email', authenticate, emailLimiter, require('./routes/email'));
  
  console.log('✅ Complete authentication and rate limiting system implemented');
  console.log('✅ Phase 7 routes mounted with proper protection');
} catch (error) {
  console.error('❌ Route mounting error:', error.message);
  console.error('Stack:', error.stack);
}

// 404 handler (LAST)
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
});