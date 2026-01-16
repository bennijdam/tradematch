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
app.set("trust proxy", 1); // Required for Render / reverse proxy

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
    rejectUnauthorized: false, // Required for Neon
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
 * ROUTES
 * ===============================
 */

// ✅ ROOT ROUTE (IMPORTANT FOR RENDER)
app.get("/", (req, res) => {
  res.send("🚀 TradeMatch Backend API is running");
});

// ✅ HEALTH CHECK
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

// 404 fallback (optional but clean)
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
  console.log(`║   Port: ${PORT}                      ║`);
  console.log("║   Database: Connected ✅            ║");
  console.log("╚═══════════════════════════════════════╝");
});
