#!/bin/bash
# Security Scan Script for TradeMatch
# Usage: ./scripts/security-scan.sh

echo "🔒 TradeMatch Security Scan"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

VULNERABILITIES=0
WARNINGS=0

# Function to check for sensitive patterns
check_sensitive_files() {
    echo -e "${YELLOW}Checking for sensitive files...${NC}"
    
    # Check for .env files
    if find . -name ".env" -type f | grep -q .; then
        echo -e "${RED}✗ Found .env files in repository${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    else
        echo -e "${GREEN}✓ No .env files in repository${NC}"
    fi
    
    # Check for secrets in code
    echo -e "${YELLOW}Scanning for hardcoded secrets...${NC}"
    if grep -r "password.*=" --include="*.js" --include="*.ts" apps/api/routes/ | grep -v "\.env" | head -5; then
        echo -e "${RED}✗ Potential hardcoded passwords found${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    else
        echo -e "${GREEN}✓ No hardcoded passwords found${NC}"
    fi
    
    # Check for API keys
    if grep -r "api_key\|apikey\|secret_key" --include="*.js" --include="*.ts" . | grep -v "\.env" | grep -v "process.env" | head -5; then
        echo -e "${YELLOW}⚠ Check for hardcoded API keys${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
    
    echo ""
}

# Check rate limiting
check_rate_limiting() {
    echo -e "${YELLOW}Checking rate limiting configuration...${NC}"
    
    if grep -r "apiLimiter\|rate.*limit" --include="*.js" apps/api/ | head -5; then
        echo -e "${GREEN}✓ Rate limiting found${NC}"
    else
        echo -e "${RED}✗ No rate limiting detected${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    fi
    
    echo ""
}

# Check input validation
check_input_validation() {
    echo -e "${YELLOW}Checking input validation...${NC}"
    
    if [ -f "apps/api/middleware/validation.js" ]; then
        echo -e "${GREEN}✓ Validation middleware exists${NC}"
        
        # Check if it's being used in routes
        ROUTES_WITH_VALIDATION=$(grep -l "validate\." apps/api/routes/*.js | wc -l)
        echo -e "${GREEN}✓ Validation used in $ROUTES_WITH_VALIDATION routes${NC}"
    else
        echo -e "${RED}✗ Validation middleware not found${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    fi
    
    echo ""
}

# Check CORS configuration
check_cors() {
    echo -e "${YELLOW}Checking CORS configuration...${NC}"
    
    if grep -r "cors(" --include="*.js" apps/api/ | grep -q "origin"; then
        echo -e "${GREEN}✓ CORS origin configured${NC}"
    else
        echo -e "${RED}✗ CORS not properly configured${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    fi
    
    echo ""
}

# Check for SQL injection prevention
check_sql_injection() {
    echo -e "${YELLOW}Checking SQL injection prevention...${NC}"
    
    # Check for parameterized queries
    if grep -r "\$1.*\$2" --include="*.js" apps/api/ | grep -q "query"; then
        echo -e "${GREEN}✓ Parameterized queries found${NC}"
    fi
    
    # Check for string concatenation in queries
    if grep -r "query.*+.*\+" --include="*.js" apps/api/ | head -3; then
        echo -e "${RED}✗ Potential SQL injection risk (string concatenation)${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    else
        echo -e "${GREEN}✓ No dangerous query concatenation found${NC}"
    fi
    
    echo ""
}

# Check JWT implementation
check_jwt_security() {
    echo -e "${YELLOW}Checking JWT security...${NC}"
    
    if grep -r "jwt.sign\|jwt.verify" --include="*.js" apps/api/ | grep -q "JWT_SECRET"; then
        echo -e "${GREEN}✓ JWT using environment variable${NC}"
    else
        echo -e "${RED}✗ JWT not using environment variable${NC}"
        VULNERABILITIES=$((VULNERABILITIES+1))
    fi
    
    echo ""
}

# Check helmet headers
check_helmet() {
    echo -e "${YELLOW}Checking security headers...${NC}"
    
    if grep -r "helmet(" --include="*.js" apps/api/ | grep -q "helmet"; then
        echo -e "${GREEN}✓ Helmet middleware found${NC}"
    else
        echo -e "${YELLOW}⚠ Helmet not detected${NC}"
        WARNINGS=$((WARNINGS+1))
    fi
    
    echo ""
}

# Run all checks
echo "Starting security scan..."
echo ""

check_sensitive_files
check_rate_limiting
check_input_validation
check_cors
check_sql_injection
check_jwt_security
check_helmet

# Summary
echo "=========================="
echo "📊 Security Scan Summary"
echo "=========================="
echo ""

if [ $VULNERABILITIES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed!${NC}"
elif [ $VULNERABILITIES -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warnings found (review recommended)${NC}"
else
    echo -e "${RED}✗ $VULNERABILITIES vulnerabilities found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warnings${NC}"
    fi
    echo ""
    echo "Please fix vulnerabilities before deploying to production."
    exit 1
fi

echo ""
echo "Scan complete!"
