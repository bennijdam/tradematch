# TradeMatch Backend API

Express.js + Neon (PostgreSQL) backend for TradeMatch platform.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
cp .env.example .env
# Edit .env with your database URL
```

### 3. Import Database Schema
```bash
# Using Neon SQL Editor:
# 1. Go to https://console.neon.tech
# 2. Open SQL Editor
# 3. Copy contents of database-schema.sql
# 4. Run the query
```

### 4. Run Server
```bash
# Development
node server.js

# Or with nodemon (if installed)
npm run dev
```

## 🌐 Deployment to Render

### Option 1: Via Render Dashboard
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment**: Node
5. Add environment variables:
   - `DATABASE_URL`: Your Neon connection string
   - `JWT_SECRET`: Generate with crypto
   - `CORS_ORIGINS`: Your frontend URL
6. Click "Create Web Service"

### Option 2: Via GitHub (Auto-deploy)
1. Push your code to GitHub
2. Render auto-detects changes
3. Auto-deploys on every push to main branch

## 📝 Environment Variables Required

**MUST HAVE:**
- `DATABASE_URL` - Neon PostgreSQL connection string
- `JWT_SECRET` - For authentication (generate securely)

**OPTIONAL:**
- `PORT` - Auto-set by Render (default: 3001)
- `CORS_ORIGINS` - Frontend URLs (comma-separated)
- `STRIPE_SECRET_KEY` - For payments
- `CLAUDE_API_KEY` - For AI features

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "uptime": 12.34,
  "timestamp": "2026-01-16T..."
}
```

## 📊 Database

- **Database**: Neon (PostgreSQL)
- **Schema**: database-schema.sql
- **Tables**: 18 tables
- **Features**: 
  - User authentication
  - Quote management
  - Payment milestones
  - Messaging system
  - Reviews & ratings

## 🔌 API Endpoints

### Current Endpoints:
- `GET /` - Root (health message)
- `GET /api/health` - Health check with DB status

### Coming Soon (Phase 7):
- `/api/auth/*` - Authentication
- `/api/quotes/*` - Quote management
- `/api/bids/*` - Bid management
- `/api/payments/*` - Payment processing
- `/api/messages/*` - Messaging

## 🐛 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL is correct
- Verify Neon database is running
- Check SSL settings in connection string

### "Port already in use"
- Change PORT in .env
- Kill process on that port: `lsof -ti:3001 | xargs kill`

### "Module not found"
- Run `npm install`
- Delete node_modules and reinstall

## 📚 Documentation

- [Deployment Guide](../docs/DEPLOYMENT-GUIDE-BEGINNER.md)
- [Phase 7 Features](../docs/PHASE-7-IMPLEMENTATION-GUIDE.md)
- [Database Schema](./database-schema.sql)

## 🔐 Security

- JWT authentication
- Password hashing with bcrypt
- SQL injection protection (parameterized queries)
- CORS configured
- Rate limiting ready
- Environment variables for secrets

## 📞 Support

- GitHub Issues: https://github.com/yourusername/tradematch/issues
- Email: dev@tradematch.com

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Database**: PostgreSQL (Neon)
