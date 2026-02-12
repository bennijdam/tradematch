/**
 * TradeMatch Backend API - Debug Version
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

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
});

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
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false,
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
try {
    const authRoutes = require('./routes/auth');
    const quoteRoutes = require('./routes/quotes');

    // Pass pool to routes
    authRoutes.setPool(pool);
    quoteRoutes.setPool(pool);

    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/quotes', quoteRoutes);
    console.log('✅ Routes mounted successfully');
} catch (error) {
    console.error('❌ Error mounting routes:', error);
}

/**
 * ===============================
 * ROUTES
 * ===============================
 */

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "🚀 TradeMatch API is running - DEBUG VERSION",
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
  console.log('Health check endpoint called');
  try {
    await pool.query("SELECT 1");
    console.log('Database health check passed');
    res.json({
      status: "ok",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Database health check failed:', err);
    res.status(500).json({
      status: "error",
      database: "not connected",
      error: err.message
    });
  }
});

// Debug route to check all registered routes
app.get("/debug/routes", (req, res) => {
    const routes = [];
    app._router.stack.forEach(function(middleware){
        if(middleware.route){ // routes registered directly on the app
            routes.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if(middleware.name === 'router'){ // router middleware 
            middleware.handle.stack.forEach(function(handler){
                if(handler.route){
                    routes.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    
    res.json({
        message: "Registered routes",
        routes: routes,
        total: routes.length
    });
});

// 404 handler with more info
app.use((req, res) => {
  console.log(`404: Route not found - ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method,
    availableEndpoints: [
      "GET /",
      "GET /api/health", 
      "GET /debug/routes",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "GET /api/auth/me",
      "GET /api/quotes",
      "POST /api/quotes",
      "GET /api/quotes/:id",
      "PUT /api/quotes/:id",
      "DELETE /api/quotes/:id"
    ]
  });
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
    console.log("║   Debug Mode: ON                   ║");
    console.log("╚═══════════════════════════════════════╝");
    console.log(`\n🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🔍 Debug routes: http://localhost:${PORT}/debug/routes`);
    console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});