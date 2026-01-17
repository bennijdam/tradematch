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
  app.use('/api/milestones', milestoneRoutes);
  
  console.log('✅ Phase 7 routes mounted');
} catch (error) {
  console.error('❌ Phase 7 route mounting error:', error.message);
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