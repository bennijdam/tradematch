#!/bin/bash
# Deploy Error Logging System
# Usage: ./scripts/deploy-error-logging.sh

set -e

echo "🚀 Deploying Error Logging System to TradeMatch"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check environment
echo -e "${YELLOW}Step 1: Checking environment...${NC}"
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    echo "Please set your Neon database URL:"
    echo "export DATABASE_URL='postgresql://...'"
    exit 1
fi
echo -e "${GREEN}✓ DATABASE_URL configured${NC}"

# Step 2: Run database migration
echo -e "${YELLOW}Step 2: Running database migration...${NC}"
if command -v psql &> /dev/null; then
    psql "$DATABASE_URL" -f apps/api/database/migrations/create-error-logs-table.sql
    echo -e "${GREEN}✓ Database migration complete${NC}"
else
    echo -e "${YELLOW}⚠ psql not found. Please install PostgreSQL CLI or run manually:${NC}"
    echo "psql \"$DATABASE_URL\" -f apps/api/database/migrations/create-error-logs-table.sql"
fi

# Step 3: Check if code is committed
echo -e "${YELLOW}Step 3: Checking git status...${NC}"
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✓ All changes committed${NC}"
else
    echo -e "${YELLOW}⚠ Uncommitted changes found. Committing...${NC}"
    git add .
    git commit -m "chore: Pre-deployment changes"
fi

# Step 4: Push to GitHub
echo -e "${YELLOW}Step 4: Pushing to GitHub...${NC}"
git push origin main
echo -e "${GREEN}✓ Code pushed to GitHub${NC}"

# Step 5: Verify deployment
echo -e "${YELLOW}Step 5: Verifying deployment...${NC}"
sleep 5

# Extract base URL from DATABASE_URL or use default
if [[ "$DATABASE_URL" =~ @([^/]+)/ ]]; then
    API_BASE="https://api.tradematch.uk"
else
    API_BASE="http://localhost:3001"
fi

echo "Testing health endpoint..."
if curl -s "${API_BASE}/api/health" > /dev/null; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify API (may still be deploying)${NC}"
fi

echo ""
echo -e "${GREEN}================================================"
echo "✅ Deployment Complete!"
echo "================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Test the system:"
echo "   curl ${API_BASE}/sentry/test-error"
echo ""
echo "2. View errors in admin dashboard:"
echo "   GET ${API_BASE}/api/admin/errors"
echo ""
echo "3. Check error statistics:"
echo "   GET ${API_BASE}/api/admin/errors/stats"
echo ""
echo "4. Monitor trends:"
echo "   GET ${API_BASE}/api/admin/errors/trends?timeRange=7d"
