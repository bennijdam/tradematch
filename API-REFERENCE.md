# TradeMatch Lead System API Reference

## Base URL
- **Production**: `https://tradematch.io/api`
- **Staging**: `https://staging.tradematch.io/api`
- **Development**: `http://localhost:3000/api`

## Authentication
All endpoints (except public ones) require:
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## Credits API

### GET /credits/balance
Get current credit balance and spending info

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.tradematch.io/api/credits/balance
```

**Response** (200 OK):
```json
{
  "success": true,
  "availableCredits": 42,
  "totalPurchasedCredits": 100,
  "totalSpentCredits": 58,
  "expiresAt": null
}
```

---

### GET /credits/packages
List available credit packages (No auth required)

**Request**:
```bash
curl https://api.tradematch.io/api/credits/packages
```

**Response** (200 OK):
```json
{
  "success": true,
  "packages": [
    {
      "id": "starter",
      "credits": 10,
      "priceInPence": 499,
      "description": "Perfect for trying out",
      "perCredit": 49.9
    },
    {
      "id": "enterprise",
      "credits": 100,
      "priceInPence": 3499,
      "description": "For high-volume vendors",
      "perCredit": 34.99,
      "savings": 30,
      "popular": true
    }
  ]
}
```

---

### POST /credits/purchase
Initiate credit purchase with Stripe

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"packageId": "enterprise"}' \
  https://api.tradematch.io/api/credits/purchase
```

**Request Body**:
```json
{
  "packageId": "starter|professional|business|enterprise|premium"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "clientSecret": "pi_3K1..._secret_...",
  "paymentIntentId": "pi_3K1...",
  "amount": 34.99,
  "currency": "GBP",
  "credits": 100
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid package ID"
}
```

---

### POST /credits/purchase/confirm
Confirm payment and add credits to account

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentIntentId": "pi_3K1..."}' \
  https://api.tradematch.io/api/credits/purchase/confirm
```

**Request Body**:
```json
{
  "paymentIntentId": "pi_3K1..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "100 credits purchased successfully",
  "creditsAdded": 100
}
```

---

### GET /credits/transaction-history
Get credit purchase history

**Query Parameters**:
- `limit` (optional, default 50): Number of records
- `offset` (optional, default 0): Pagination offset

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.tradematch.io/api/credits/transaction-history?limit=20&offset=0"
```

**Response** (200 OK):
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "credits_purchased": 100,
      "amount_paid": 34.99,
      "price_per_credit": 0.3499,
      "status": "completed",
      "completed_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-15T10:25:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

---

### GET /credits/analytics
Get credit usage analytics

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.tradematch.io/api/credits/analytics
```

**Response** (200 OK):
```json
{
  "success": true,
  "creditBalance": {
    "available": 42,
    "totalPurchased": 100,
    "totalSpent": 58
  },
  "thisMonth": {
    "leadsOffered": 12,
    "bidsSubmitted": 8,
    "jobsWon": 2,
    "creditsSpent": 58,
    "revenue": 12500.00,
    "conversionRate": "66.67",
    "roi": "214.50%"
  }
}
```

---

## Leads API

### GET /leads/available
Get leads matched to your location and services

**Query Parameters**:
- `limit` (optional, default 50): Number of leads
- `offset` (optional, default 0): Pagination offset
- `serviceType` (optional): Filter by service
- `minQuality` (optional): Minimum quality tier (basic/standard/premium)

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.tradematch.io/api/leads/available?limit=20&minQuality=standard"
```

**Response** (200 OK):
```json
{
  "success": true,
  "leads": [
    {
      "id": 1234,
      "quoteId": 5678,
      "serviceType": "plumbing",
      "title": "Kitchen tap installation",
      "description": "Need to replace kitchen tap with new modern design...",
      "postcode": "SW1A 1AA",
      "budgetMin": 150,
      "budgetMax": 250,
      "urgency": "this week",
      "cost": 8.50,
      "matchScore": 92,
      "qualityScore": 78,
      "qualityTier": "premium",
      "canAfford": true,
      "createdAt": "2024-01-15T09:30:00Z",
      "customerName": "John Doe"
    },
    {
      "id": 1235,
      "quoteId": 5679,
      "serviceType": "plumbing",
      "title": "Bathroom renovation",
      "cost": 12.00,
      "matchScore": 85,
      "qualityTier": "standard",
      "canAfford": true
    }
  ],
  "currentBalance": 42,
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

---

### POST /leads/:quoteId/access
Purchase access to view full lead details

**Request**:
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  https://api.tradematch.io/api/leads/5678/access
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Lead accessed successfully",
  "charged": 8.50,
  "remainingBalance": 33.50,
  "lead": {
    "id": 5678,
    "serviceType": "plumbing",
    "title": "Kitchen tap installation",
    "description": "Need to replace kitchen tap with new modern design. Preference for chrome or stainless steel. Must be able to fit under existing pipework.",
    "postcode": "SW1A 1AA",
    "budgetMin": 150,
    "budgetMax": 250,
    "urgency": "this week",
    "photos": ["photo1.jpg", "photo2.jpg"],
    "createdAt": "2024-01-15T09:30:00Z",
    "customer": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "020 1234 5678",
      "emailVerified": true,
      "phoneVerified": true
    },
    "qualityScores": {
      "overall": 78,
      "budget": 20,
      "detail": 18,
      "urgency": 15,
      "customer": 15,
      "location": 10,
      "tier": "premium"
    }
  }
}
```

**Error Response** (402 Payment Required):
```json
{
  "error": "Insufficient credits",
  "required": 8.50,
  "current": 5.00,
  "needed": 3.50
}
```

---

### GET /leads/purchased
Get leads you've already accessed

**Query Parameters**:
- `limit` (optional, default 50): Number of leads
- `offset` (optional, default 0): Pagination offset
- `status` (optional): Filter by quote status (open/accepted/completed)

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  "https://api.tradematch.io/api/leads/purchased?status=open"
```

**Response** (200 OK):
```json
{
  "leads": [
    {
      "distributionId": 1,
      "quoteId": 5678,
      "cost": 8.50,
      "accessedAt": "2024-01-15T10:00:00Z",
      "refunded": false,
      "serviceType": "plumbing",
      "title": "Kitchen tap installation",
      "postcode": "SW1A 1AA",
      "quoteStatus": "open",
      "qualityScore": 78,
      "qualityTier": "premium",
      "hasBid": true,
      "bidAmount": 200,
      "bidStatus": "pending",
      "bidCreated": "2024-01-15T10:15:00Z",
      "customerFirstName": "John"
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}
```

---

### GET /leads/analytics
Get your performance analytics

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.tradematch.io/api/leads/analytics
```

**Response** (200 OK):
```json
{
  "overview": {
    "totalPurchased": 48,
    "totalBids": 28,
    "totalWins": 6,
    "totalSpent": 384.50,
    "totalRefunded": 25.00,
    "netSpent": 359.50,
    "avgLeadCost": 8.01,
    "avgLeadQuality": 71.5,
    "conversionRate": "58.3",
    "winRate": "21.4",
    "firstPurchase": "2024-01-01T08:00:00Z",
    "lastPurchase": "2024-01-15T14:30:00Z"
  },
  "tierDistribution": {
    "premium": 12,
    "standard": 24,
    "basic": 12
  },
  "monthlyTrend": [
    {
      "month": "2024-01-01",
      "leadsPurchased": 24,
      "amountSpent": 192.25,
      "bidsSubmitted": 14,
      "wins": 3
    },
    {
      "month": "2023-12-01",
      "leadsPurchased": 24,
      "amountSpent": 192.25,
      "bidsSubmitted": 14,
      "wins": 3
    }
  ]
}
```

---

## Email Preferences API

### GET /email/preferences/:userId
Get email notification preferences

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.tradematch.io/api/email/preferences/user123
```

**Response** (200 OK):
```json
{
  "success": true,
  "userId": "user123",
  "emailNotificationsEnabled": true,
  "preferences": {
    "newBids": true,
    "bidAccepted": true,
    "newQuotes": true,
    "paymentConfirmed": true,
    "reviewReminder": true,
    "quoteUpdates": false,
    "marketing": false,
    "newsletter": false
  }
}
```

---

### PUT /email/preferences/:userId
Update email notification preferences

**Request**:
```bash
curl -X PUT \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emailNotificationsEnabled": true,
    "preferences": {
      "newBids": true,
      "bidAccepted": true,
      "marketing": false
    }
  }' \
  https://api.tradematch.io/api/email/preferences/user123
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "preferences": {
    "newBids": true,
    "bidAccepted": true,
    "marketing": false
  }
}
```

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request body and parameters |
| 401 | Unauthorized | Include valid JWT token in Authorization header |
| 402 | Payment Required | Insufficient credits, purchase more |
| 404 | Not Found | Lead or resource not found |
| 429 | Too Many Requests | Rate limited, wait before retrying |
| 500 | Server Error | Contact support |

---

## Rate Limiting

- **Credits API**: 100 requests/minute
- **Leads API**: 300 requests/minute
- **Email API**: 50 requests/minute (for security)

Response includes rate limit headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1642346400
```

---

## Pagination

Most list endpoints support pagination:

**Query Parameters**:
- `limit`: Items per page (default 50, max 200)
- `offset`: Items to skip (default 0)

**Cursor-based example** (future enhancement):
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "abc123def456",
    "prevCursor": "xyz789uvw",
    "hasMore": true
  }
}
```

---

## Webhooks (Stripe)

Webhooks sent to: `POST /webhooks/stripe`

**Events**:
- `payment_intent.succeeded` - Credit purchase completed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

**Example Payload**:
```json
{
  "id": "evt_1K1...",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_3K1...",
      "amount": 3499,
      "currency": "gbp",
      "status": "succeeded",
      "metadata": {
        "vendorId": "vendor123",
        "credits": "100",
        "packageId": "enterprise"
      }
    }
  }
}
```

---

## Example Workflows

### Workflow 1: New Vendor Access to Leads

```javascript
// 1. Get credit balance
const balance = await fetch('/api/credits/balance', headers);

// 2. Get available leads
const leads = await fetch('/api/leads/available?minQuality=standard', headers);

// 3. View a lead (costs credits)
const lead = await fetch('/api/leads/5678/access', { method: 'POST', headers });

// 4. Submit bid on lead
const bid = await fetch('/api/bids', {
  method: 'POST',
  headers,
  body: JSON.stringify({ quoteId: 5678, amount: 200 })
});

// 5. Check analytics
const analytics = await fetch('/api/leads/analytics', headers);
```

### Workflow 2: Purchase Credits

```javascript
// 1. Get available packages
const packages = await fetch('/api/credits/packages');

// 2. Create payment intent
const payment = await fetch('/api/credits/purchase', {
  method: 'POST',
  headers,
  body: JSON.stringify({ packageId: 'enterprise' })
});

// 3. Confirm payment via Stripe.js
// (Handle Stripe card processing)

// 4. Confirm purchase
const confirm = await fetch('/api/credits/purchase/confirm', {
  method: 'POST',
  headers,
  body: JSON.stringify({ paymentIntentId: payment.paymentIntentId })
});

// 5. Check new balance
const newBalance = await fetch('/api/credits/balance', headers);
```

---

## SDK Examples

### Python
```python
import requests

api_key = "your_jwt_token"
headers = {"Authorization": f"Bearer {api_key}"}

# Get balance
response = requests.get(
  "https://api.tradematch.io/api/credits/balance",
  headers=headers
)
print(response.json())
```

### Node.js / JavaScript
```javascript
const token = localStorage.getItem('token');
const headers = { 'Authorization': `Bearer ${token}` };

// Get available leads
const response = await fetch('/api/leads/available', { headers });
const data = await response.json();
console.log(data.leads);
```

### cURL
```bash
TOKEN="your_jwt_token"
curl -H "Authorization: Bearer $TOKEN" \
  https://api.tradematch.io/api/leads/available
```

---

## Support

- **Documentation**: https://docs.tradematch.io
- **Status**: https://status.tradematch.io
- **Issues**: support@tradematch.io
- **Chat**: Slack community (link in dashboard)
