/**
 * TradeMatch Backend API
 * Express + Neon (Postgres)
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Pool } = require("pg");

// Load environment variables
dotenv.config();

const app = express();

/**
 * ===============================
 * MIDDLEWARE
 * ===============================
 */
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",")
      : "*",
    credentials: true,
  })
);

app.use(express.json());

/**
 * ===============================
 * DATABASE (NEON POSTGRES)
 * ===============================
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Verify DB connection on startup
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Database connected (Neon / Postgres)");
  } catch (err) {
    console.error("❌ Database connection failed:");
    console.error(err.message);
    process.exit(1);
  }
})();

/**
 * ===============================
 * IMPORT ROUTES
 * ===============================
 */
const authRoutes = require('./routes/auth');
const quoteRoutes = require('./routes/quotes');

// Pass pool to routes
authRoutes.setPool(pool);
quoteRoutes.setPool(pool);

/**
 * ===============================
 * ROUTES
 * ===============================
 */

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
    });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/quotes', quoteRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

/**
 * ===============================
 * START SERVER
 * ===============================
 */
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   🚀 TradeMatch API Server Running   ║");
  console.log(`║   Port: ${PORT.toString().padEnd(27)} ║`);
  console.log("║   Database: Connected ✅            ║");
  console.log("╚═══════════════════════════════════════╝");
});