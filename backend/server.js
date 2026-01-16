/**
 * TradeMatch Backend API - Minimal Working Version
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.set("trust proxy", 1);
app.use(cors({
    origin: process.env.CORS_ORIGINS || "*",
    credentials: true,
}));
app.use(express.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Simple health check FIRST - before any other middleware
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

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "🚀 TradeMatch API is running",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me"
      },
      quotes: {
        create: "POST /api/quotes",
        list: "GET /api/quotes",
        get: "GET /api/quotes/:id",
        update: "PUT /api/quotes/:id",
        delete: "DELETE /api/quotes/:id"
      }
    }
  });
});

// Import and mount other routes
try {
    const authRoutes = require('./routes/auth');
    const quoteRoutes = require('./routes/quotes');

    authRoutes.setPool(pool);
    quoteRoutes.setPool(pool);

    app.use('/api/auth', authRoutes);
    app.use('/api/quotes', quoteRoutes);
    console.log('✅ Auth and Quotes routes mounted');
} catch (error) {
    console.error('❌ Route mounting error:', error.message);
}

// 404 handler (LAST)
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;