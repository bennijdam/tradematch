#!/bin/bash

# 🚀 TradeMatch Installation Script
# Sets up the complete project structure and dependencies

echo "╔═══════════════════════════════════════╗"
echo "║   🚀 TradeMatch Installation Script   ║"
echo "╚═════════════════════════════════════════╝"

# Check if we're in the right directory
if [ ! -d "apps/api" ] || [ ! -d "public" ]; then
    echo "❌ Error: Run this script from the tradematch root directory"
    exit 1
fi

echo "✅ Directory structure verified"
echo ""

# Frontend Setup
echo "📱 Setting up Frontend..."
cd public

# Update index.html to include scripts
if [ -f "index.html" ]; then
    echo "✅ Updating index.html with script includes..."
    # Check if scripts are already included
    if ! grep -q "js/api.js" index.html; then
        echo "Adding script includes to index.html..."
        # Add script includes before closing </body>
        sed -i '/<\/body>/i\    <script src="js/api.js"><\/script>\n    <script src="js/auth.js"><\/script>\n    <script src="js/quotes.js"><\/script>' index.html
    fi
    echo "✅ Frontend scripts configured"
else
    echo "❌ index.html not found in public/"
    exit 1
fi

# Backend Setup
echo ""
echo "🔧 Setting up Backend..."
cd ../apps/api

# Install Node.js dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ Dependencies installed successfully"
    else
        echo "❌ Failed to install dependencies"
        exit 1
    fi
else
    echo "❌ package.json not found in apps/api/"
    exit 1
fi

echo ""
echo "🗄️ Database Setup"
echo "Please ensure you have:"
echo "1. A Neon (PostgreSQL) database created"
echo "2. DATABASE_URL environment variable set in Render"
echo "3. Run: psql YOUR_DATABASE_URL -f apps/api/database-schema.sql"
echo ""

# Environment Variables Setup
echo "⚙️ Environment Variables Required:"
echo "Add these to your Render dashboard:"
echo ""
echo "DATABASE_URL=your_neon_database_url"
echo "JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters"
echo "JWT_EXPIRY=7d"
echo "CORS_ORIGINS=https://tradematch.vercel.app,http://localhost:3000"
echo ""

# Check if .env example exists
if [ ! -f ".env.example" ]; then
    echo "📝 Creating .env.example file..."
    cat > .env.example << EOL
# TradeMatch Backend Environment Variables
# Copy this file to .env and fill in your values

DATABASE_URL=your_neon_database_url_here
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRY=7d
CORS_ORIGINS=https://tradematch.vercel.app,http://localhost:3000
EOL
    echo "✅ .env.example created"
fi

echo ""
echo "🌐 Deployment Ready!"
echo ""
echo "Frontend (Vercel):"
echo "  git add . && git commit -m \"Setup TradeMatch installation\" && git push origin main"
echo ""
echo "Backend (Render):"
echo "  1. Push to GitHub"
echo "  2. Connect repository to Render"
echo "  3. Set environment variables in Render dashboard"
echo ""
echo "Testing URLs after deployment:"
echo "  📱 Frontend: https://tradematch.vercel.app"
echo "  🧪 API Tests: https://tradematch.vercel.app/api-test.html"
echo "  🔍 Quote Engine: https://tradematch.vercel.app/quote-engine.html"
echo "  🔧 Backend API: https://tradematch.onrender.com"
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   ✅ Installation Complete!   ║"
echo "╚═══════════════════════════════════════╝"