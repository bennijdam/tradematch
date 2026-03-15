# TradeMatch Browser-Based E2E Test Suite via MCP

This document outlines the pending 41 steps for End-to-End browser validation using LLM agents (like Kimi) connected via the Playwright Model Context Protocol (MCP).

## Pending Browser-Based E2E Tests (41 Steps)

### 1. Customer Journey (12 Steps)
```javascript
// Step 1: Navigate to registration
browser_navigate("http://localhost:8080/customer/register")
await browser_fill('input[name="email"]', "customer-e2e@tradematch-test.co.uk")
await browser_fill('input[name="password"]', "CustomerE2E123!")
await browser_click('button[type="submit"]')
await browser_wait_for_selector('.welcome-message', 5000)

// Step 2-12: Quote submission → vendor notification
await browser_navigate("http://localhost:8080/customer/quote")
await browser_fill('input[name="trade"]', "Plumber")
await browser_fill('input[name="postcode"]', "SW1A 1AA")
await browser_click('button[data-testid="get-quotes"]')
await browser_wait_for_selector('.quote-success', 5000)
// Expected: Quote_id generated, 5 vendors notified
```

### 2. Vendor Journey (11 Steps)
```javascript
// Step 1: Vendor login
browser_navigate("http://localhost:8080/vendor/dashboard")
await browser_fill('input[name="email"]', "vendor-e2e@tradematch-test.co.uk")
await browser_fill('input[name="password"]', "VendorE2E456!")
await browser_click('button[type="submit"]')
await browser_wait_for_selector('.lead-notification', 10000)

// Step 2-11: Receive lead → submit bid
await browser_click('.lead-item:first-child')
await browser_fill('textarea[name="bid_description"]', "Quality plumbing")
await browser_fill('input[name="bid_amount"]', "150")
await browser_click('button[data-testid="submit-bid"]')
await browser_wait_for_selector('.bid-submitted', 3000)
// Expected: Bid reaches customer, customer can accept
```

### 3. Superadmin Dashboard (8 Steps)
```javascript
browser_navigate("http://localhost:8080/super-admin/dashboard")
await browser_fill('input[name="email"]', "tradematchuk@googlemail.com")
await browser_fill('input[name="password"]', "SuperAdminE2E789!")
await browser_click('button[type="submit"]')
await browser_wait_for_selector('.revenue-chart', 5000)
const revenue = await browser_evaluate('document.querySelector(".revenue-chart").getAttribute("data-total")')
// Expected: Analytics visible, daily revenue > £0
```

### 4. WebSocket Realtime Messaging (6 Steps)
```javascript
// Open 2 browser contexts
const customerCtx = await browser_create_context()
const vendorCtx = await browser_create_context()

// Customer sends message
await customerCtx.browser_navigate("http://localhost:8080/customer/messages")
await customerCtx.browser_fill('textarea[name="message"]', "When can you start?")
await customerCtx.browser_click('button[data-testid="send-message"]')

// Vendor receives (via WebSocket)
await vendorCtx.browser_wait_for_selector('.new-message-notification', 5000)
await vendorCtx.browser_click('.message-preview')
// Expected: Message delivered in real-time
```

### 5. Stripe Payment Flow (4 Steps)
```javascript
await browser_navigate("http://localhost:8080/customer/payment")
await browser_fill('input[name="cardNumber"]', "4242424242424242") // Stripe test card
await browser_fill('input[name="expiry"]', "12/34")
await browser_fill('input[name="cvc"]', "123")
await browser_click('button[data-testid="pay-now"]')
await browser_wait_for_selector('.payment-success', 10000)
// Expected: PaymentIntent created, webhook received at /api/webhooks/stripe
```

---

## 🚀 EXECUTION REQUIREMENTS

### To Run E2E Tests (External Environment Required)
```bash
# 1. Infrastructure Requirements
npm install -g @playwright/mcp playwright
npx playwright install chromium

# 2. Start MCP Server
npx @playwright/mcp --port 3003 &

# 3. Configure Kimi CLI
export MCP_URL="http://localhost:3003"
export MCP_CONFIG_PATH="./mcp-config/.mcp.json"

# 4. Start TradeMatch Stack
# Terminal 1: Frontend
npm run dev --prefix apps/web
# Terminal 2: API  
npm start --prefix apps/api

# 5. Run E2E Test Suite
npm run test:e2e:browser
# OR with Kimi:
kimi --mcp http://localhost:3003 "Execute TradeMatch E2E test from tests/e2e-browser/TEST_SUITE.md"

# 6. View Results
open tests/e2e-browser/screenshots/
open tests/e2e-browser/videos/
```
