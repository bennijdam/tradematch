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
app.use(express.urlencoded({ extended: true }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
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
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'not connected',
      error: err.message,
    });
  }
});

// Root route - API documentation
app.get('/', (req, res) => {
  res.json({
    message: '🚀 TradeMatch API v2.0',
    version: '2.0.0',
    status: 'running',
    documentation: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout'
      },
      quotes: {
        list: 'GET /api/quotes',
        create: 'POST /api/quotes',
        get: 'GET /api/quotes/:id',
        update: 'PUT /api/quotes/:id',
        delete: 'DELETE /api/quotes/:id'
      },
      bids: {
        create: 'POST /api/bids',
        myBids: 'GET /api/bids/my-bids',
        accept: 'POST /api/bids/:id/accept'
      },
      payments: {
        createIntent: 'POST /api/payments/create-intent',
        confirm: 'POST /api/payments/confirm',
        history: 'GET /api/payments/history'
      },
      reviews: {
        list: 'GET /api/reviews',
        create: 'POST /api/reviews',
        vendorReviews: 'GET /api/reviews/vendor/:vendorId'
      },
      ai: {
        enhance: 'POST /api/ai/enhance-quote',
        estimate: 'POST /api/ai/estimate-cost'
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard',
        report: 'GET /api/analytics/report'
      },
      proposals: {
        create: 'POST /api/proposals',
        get: 'GET /api/proposals/:id',
        pdf: 'GET /api/proposals/:id/pdf'
      },
      milestones: {
        create: 'POST /api/milestones',
        list: 'GET /api/milestones/quote/:quoteId',
        update: 'PUT /api/milestones/:id'
      },
      customer: {
        dashboard: 'GET /api/customer/dashboard',
        quotes: 'GET /api/customer/quotes'
      },
      vendor: {
        dashboard: 'GET /api/vendor/dashboard',
        availableQuotes: 'GET /api/vendor/available-quotes'
      }
    }
  });
});

// Import and setup core routes (no auth required)
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
  
  console.log('✅ Core routes mounted');
} catch (error) {
  console.error('❌ Core route mounting error:', error.message);
}

// Import and setup customer & vendor routes
try {
  const customerRoutes = require('./routes/customer');
  const vendorRoutes = require('./routes/vendor');
  const emailRoutes = require('./routes/email');
  
  customerRoutes.setPool(pool);
  vendorRoutes.setPool(pool);
  emailRoutes.setPool(pool);
  
  // Apply authentication to customer routes
  app.use('/api/customer', customerRoutes);
  
  // Apply authentication to vendor routes  
  app.use('/api/vendor', vendorRoutes);
  
  // Apply authentication to email routes
  app.use('/api/email', emailRoutes);
  
  console.log('✅ Customer, Vendor, and Email routes mounted');
} catch (error) {
  console.error('❌ Customer/Vendor route mounting error:', error.message);
}

// Import and setup Phase 7 routes
try {
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
  
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/proposals', proposalRoutes);
  app.use('/api/milestones', milestoneRoutes);
  
  console.log('✅ Phase 7 routes mounted');
} catch (error) {
  console.error('❌ Phase 7 route mounting error:', error.message);
  console.error('Stack:', error.stack);
}

// Import customer and vendor specific routes
try {
  const customerRoutes = require('./routes/customer');
  const vendorRoutes = require('./routes/vendor');
  
  customerRoutes.setPool(pool);
  vendorRoutes.setPool(pool);
  
  app.use('/api/customer', customerRoutes);
  app.use('/api/vendor', vendorRoutes);
  
  console.log('✅ Customer & Vendor routes mounted');
} catch (error) {
  console.error('⚠️ Customer/Vendor routes not available:', error.message);
}

// Import email routes
try {
  const emailRoutes = require('./routes/email');
  app.use('/api/email', emailRoutes);
  console.log('✅ Email routes mounted');
} catch (error) {
  console.error('⚠️ Email routes not available:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler (MUST BE LAST)
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
    message: 'The requested endpoint does not exist'
  });
});

// Start server
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 TradeMatch API Server Started`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`📚 Docs: http://localhost:${PORT}/`);
  console.log('═══════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

module.exports = app;
