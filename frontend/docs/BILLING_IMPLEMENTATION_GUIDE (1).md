# TradeMatch Vendor Dashboard - Billing Page Implementation Guide

## Overview

This document provides complete technical specifications for implementing the TradeMatch Vendor Dashboard Billing page, including the prepaid credit system, lead fee pricing, and revenue protection mechanisms.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prepaid Credit System](#prepaid-credit-system)
3. [Lead Fee Pricing Model](#lead-fee-pricing-model)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Stripe Integration](#stripe-integration)
7. [Revenue Protection Logic](#revenue-protection-logic)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Vendor Dashboard UI                       │
│              (billing.html - Client Side)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express API Server                         │
│  • Balance Management  • Subscriptions  • Transactions       │
└────────────┬──────────────────────┬─────────────────────────┘
             │                      │
             ▼                      ▼
┌────────────────────┐   ┌─────────────────────┐
│   PostgreSQL       │   │   Stripe API        │
│   • vendors        │   │   • Checkout        │
│   • subscriptions  │   │   • Webhooks        │
│   • ledger         │   │   • Portal          │
└────────────────────┘   └─────────────────────┘
             │
             ▼
┌────────────────────┐
│   Redis Cache      │
│   • Balance        │
│   • Locks          │
└────────────────────┘
```

### Key Design Principles

1. **Prepaid Model**: Vendors must have sufficient balance BEFORE receiving leads
2. **Atomic Operations**: Balance changes are atomic to prevent race conditions
3. **Audit Trail**: Every transaction recorded in ledger for reconciliation
4. **Revenue Protection**: System prevents lead delivery if payment fails
5. **Fail-Safe**: If in doubt, don't deliver (protects TradeMatch revenue)

---

## Prepaid Credit System

### How It Works

The prepaid credit system ensures TradeMatch never delivers leads to vendors who haven't paid. This is critical for revenue protection.

#### Flow Diagram

```
Customer Posts Job
        │
        ▼
Job Matching Algorithm
        │
        ▼
Identify 3-5 Suitable Vendors
        │
        ▼
FOR EACH Vendor:
├─► Check Balance >= Lead Fee?
│   ├─► YES ─► Deduct Fee ─► Deliver Lead ─► Record in Ledger
│   └─► NO ──► Skip Vendor ─► Log Event ─► Send Low Balance Alert
│
└─► Next Vendor
```

#### Code Example (Backend)

```javascript
// Lead delivery with balance check
async function deliverLeadToVendor(leadId, vendorId, leadFee) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Lock vendor row for update
    const vendorResult = await client.query(
      'SELECT impressions_balance, auto_pause FROM vendors WHERE id = $1 FOR UPDATE',
      [vendorId]
    );
    
    const vendor = vendorResult.rows[0];
    
    // 2. Check if vendor has sufficient balance
    if (vendor.impressions_balance < leadFee) {
      await client.query('ROLLBACK');
      
      // Log skip event
      await logImpressionEvent(vendorId, leadId, 'skipped_insufficient_balance', { 
        required: leadFee, 
        available: vendor.impressions_balance 
      });
      
      // Send low balance alert if not already paused
      if (!vendor.auto_pause) {
        await sendLowBalanceAlert(vendorId);
      }
      
      return { delivered: false, reason: 'insufficient_balance' };
    }
    
    // 3. Deduct lead fee
    const newBalance = vendor.impressions_balance - leadFee;
    
    await client.query(
      'UPDATE vendors SET impressions_balance = $1, updated_at = NOW() WHERE id = $2',
      [newBalance, vendorId]
    );
    
    // 4. Record in ledger
    await client.query(`
      INSERT INTO impressions_ledger 
        (id, vendor_id, event_type, amount, balance_after, ref_type, ref_id, created_at)
      VALUES 
        ($1, $2, 'debit', $3, $4, 'lead', $5, NOW())
    `, [generateId(), vendorId, leadFee, newBalance, leadId]);
    
    // 5. Check if should auto-pause (balance = 0)
    if (newBalance <= 0) {
      await client.query(
        'UPDATE vendors SET auto_pause = true, auto_pause_reason = $1 WHERE id = $2',
        ['balance_exhausted', vendorId]
      );
      await sendBalanceExhaustedAlert(vendorId);
    }
    
    // 6. Commit transaction
    await client.query('COMMIT');
    
    // 7. Update Redis cache
    await redisClient.decrby(`vendor:${vendorId}:balance`, leadFee);
    
    // 8. Actually deliver the lead (send notification, create record)
    await createLeadDelivery(leadId, vendorId);
    
    return { delivered: true, newBalance };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

#### Critical Rules

1. **NEVER deliver a lead before deducting the fee**
2. **NEVER assume payment will succeed - check first**
3. **ALWAYS use database transactions for atomicity**
4. **ALWAYS record in ledger (audit trail)**
5. **If Redis is down, fall back to database (slower but safe)**

---

## Lead Fee Pricing Model

### Dynamic Pricing Table

Lead fees are calculated based on:
1. **Estimated job budget** (customer provides or system estimates)
2. **Number of competing vendors** (fewer vendors = higher value per lead)
3. **Maximum fee cap** (£50.00 to remain competitive)

#### Pricing Tiers

| Job Budget       | Vendors | Base Fee | Notes                           |
|------------------|---------|----------|---------------------------------|
| £0 - £500        | 3-5     | £8.00    | Small jobs (fix, service)       |
| £500 - £1,000    | 3-5     | £12.00   | Medium jobs (bathroom, kitchen) |
| £1,000 - £2,500  | 3-5     | £18.00   | Larger renovations              |
| £2,500 - £5,000  | 3-4     | £25.00   | Major work (extension start)    |
| £5,000 - £10,000 | 3-4     | £35.00   | Large projects                  |
| £10,000 - £25,000| 2-3     | £45.00   | Very large projects             |
| £25,000+         | 2-3     | £50.00   | **CAPPED** at £50               |

#### Fee Calculation Algorithm

```javascript
function calculateLeadFee(jobBudget, vendorCount) {
  let baseFee;
  
  // Determine base fee from budget tier
  if (jobBudget < 500) {
    baseFee = 8.00;
  } else if (jobBudget < 1000) {
    baseFee = 12.00;
  } else if (jobBudget < 2500) {
    baseFee = 18.00;
  } else if (jobBudget < 5000) {
    baseFee = 25.00;
  } else if (jobBudget < 10000) {
    baseFee = 35.00;
  } else if (jobBudget < 25000) {
    baseFee = 45.00;
  } else {
    baseFee = 50.00; // Cap at £50
  }
  
  // Adjust for vendor scarcity (fewer vendors = higher value)
  let scarcityMultiplier = 1.0;
  
  if (vendorCount === 1) {
    scarcityMultiplier = 1.5; // 50% premium for exclusive lead
  } else if (vendorCount === 2) {
    scarcityMultiplier = 1.25; // 25% premium
  } else if (vendorCount >= 6) {
    scarcityMultiplier = 0.9; // 10% discount for saturated leads
  }
  
  const finalFee = Math.min(baseFee * scarcityMultiplier, 50.00); // Never exceed £50
  
  return Math.round(finalFee * 100) / 100; // Round to 2 decimals
}

// Example usage:
const fee1 = calculateLeadFee(3000, 3); // £25.00 (medium job, 3 vendors)
const fee2 = calculateLeadFee(15000, 2); // £50.00 (large job, 2 vendors, capped)
const fee3 = calculateLeadFee(750, 1); // £18.00 (£12 base × 1.5 scarcity)
```

### Revenue Projections

**Conservative Scenario** (1,000 active vendors):
- Average 20 leads/vendor/month
- Average lead fee: £15
- Gross lead revenue: £300,000/month (£3.6M annual)

**Growth Scenario** (5,000 active vendors):
- Average 25 leads/vendor/month
- Average lead fee: £17
- Gross lead revenue: £2,125,000/month (£25.5M annual)

**Plus subscription revenue:**
- Pro plans: 40% attach × £19.99 = ~£40K/mo
- Verified badges: 50% attach × £4.99 = ~£12K/mo
- Postcode expansions: 25% attach × avg £20 = ~£25K/mo

**Total Monthly Revenue @ 5K vendors: £2.2M**

---

## API Endpoints

### Balance Management

#### GET /api/billing/balance

**Description**: Get current vendor balance

**Auth**: Vendor JWT

**Response**:
```json
{
  "balance": 87.50,
  "currency": "GBP",
  "auto_pause": false,
  "last_updated": "2026-02-03T10:30:00Z",
  "minimum_required": 8.00,
  "can_receive_leads": true
}
```

**Errors**:
- `401 Unauthorized` - Invalid or expired JWT
- `404 Not Found` - Vendor not found

---

#### POST /api/billing/topup

**Description**: Create Stripe Checkout session for balance top-up

**Auth**: Vendor JWT

**Request**:
```json
{
  "amount": 50.00,
  "success_url": "https://app.tradematch.co.uk/billing?topup=success",
  "cancel_url": "https://app.tradematch.co.uk/billing?topup=cancelled"
}
```

**Response**:
```json
{
  "checkout_session_id": "cs_test_xxx",
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_xxx"
}
```

**Backend Implementation**:
```javascript
app.post('/api/billing/topup', authenticateVendor, async (req, res) => {
  const { amount, success_url, cancel_url } = req.body;
  const vendorId = req.vendor.id;
  
  // Validate amount
  if (amount < 10 || amount > 1000) {
    return res.status(400).json({ error: 'Amount must be between £10 and £1000' });
  }
  
  // Get vendor Stripe customer ID
  const vendor = await db.query(
    'SELECT stripe_customer_id FROM subscriptions WHERE vendor_id = $1',
    [vendorId]
  );
  
  let customerId = vendor.rows[0]?.stripe_customer_id;
  
  // Create Stripe customer if doesn't exist
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.vendor.email,
      metadata: { vendor_id: vendorId }
    });
    customerId = customer.id;
    
    await db.query(
      'INSERT INTO subscriptions (vendor_id, stripe_customer_id) VALUES ($1, $2)',
      [vendorId, customerId]
    );
  }
  
  // Create Checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: {
          name: 'Balance Top-Up',
          description: `Add £${amount} to your TradeMatch balance`
        },
        unit_amount: Math.round(amount * 100) // Convert to pence
      },
      quantity: 1
    }],
    success_url: success_url,
    cancel_url: cancel_url,
    metadata: {
      vendor_id: vendorId,
      type: 'balance_topup',
      amount: amount.toString()
    }
  });
  
  res.json({
    checkout_session_id: session.id,
    checkout_url: session.url
  });
});
```

---

#### POST /api/billing/auto-topup

**Description**: Configure automatic top-up settings

**Auth**: Vendor JWT

**Request**:
```json
{
  "enabled": true,
  "threshold": 25.00,
  "amount": 50.00,
  "payment_method_id": "pm_xxx"
}
```

**Response**:
```json
{
  "success": true,
  "config": {
    "enabled": true,
    "threshold": 25.00,
    "amount": 50.00
  }
}
```

**Backend Logic**:
```javascript
app.post('/api/billing/auto-topup', authenticateVendor, async (req, res) => {
  const { enabled, threshold, amount, payment_method_id } = req.body;
  const vendorId = req.vendor.id;
  
  // Validate
  if (threshold < 10 || threshold > 100) {
    return res.status(400).json({ error: 'Threshold must be £10-£100' });
  }
  
  if (amount < 20 || amount > 500) {
    return res.status(400).json({ error: 'Amount must be £20-£500' });
  }
  
  // Update vendor record
  await db.query(`
    UPDATE vendors 
    SET 
      auto_topup_enabled = $1,
      auto_topup_threshold = $2,
      auto_topup_amount = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [enabled, threshold, amount, vendorId]);
  
  // If enabled, save payment method as default
  if (enabled && payment_method_id) {
    const subscription = await db.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE vendor_id = $1',
      [vendorId]
    );
    
    const customerId = subscription.rows[0]?.stripe_customer_id;
    
    if (customerId) {
      await stripe.paymentMethods.attach(payment_method_id, {
        customer: customerId
      });
      
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });
    }
  }
  
  res.json({
    success: true,
    config: { enabled, threshold, amount }
  });
});
```

---

### Transaction History

#### GET /api/billing/transactions

**Description**: Get paginated transaction history

**Auth**: Vendor JWT

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)
- `type` (all|lead|subscription|topup|refund)
- `start_date` (ISO 8601)
- `end_date` (ISO 8601)

**Response**:
```json
{
  "transactions": [
    {
      "id": "txn_001",
      "date": "2026-02-03T14:30:00Z",
      "type": "lead",
      "description": "Kitchen renovation - E2 4RT",
      "amount": -18.00,
      "balance_after": 69.50,
      "status": "paid",
      "invoice_id": "inv_001",
      "metadata": {
        "lead_id": "lead_abc123",
        "job_budget": 3500
      }
    },
    {
      "id": "txn_002",
      "date": "2026-02-02T09:15:00Z",
      "type": "topup",
      "description": "Balance top-up",
      "amount": 50.00,
      "balance_after": 87.50,
      "status": "paid",
      "invoice_id": "inv_002",
      "metadata": {
        "stripe_payment_intent": "pi_xyz789"
      }
    }
  ],
  "total": 123,
  "has_more": true
}
```

---

#### GET /api/billing/monthly-summary

**Description**: Get current month spending summary

**Auth**: Vendor JWT

**Query Params**:
- `month` (YYYY-MM format, defaults to current month)

**Response**:
```json
{
  "month": "2026-02",
  "leads_count": 23,
  "total_spend": 187.50,
  "avg_cost_per_lead": 8.15,
  "by_budget_tier": {
    "small": { "count": 12, "total": 96.00 },
    "medium": { "count": 8, "total": 144.00 },
    "large": { "count": 3, "total": 105.00 }
  },
  "top_up_total": 100.00,
  "subscription_charges": 24.98
}
```

---

### Subscriptions

#### GET /api/subscriptions/current

**Description**: Get current subscription details

**Auth**: Vendor JWT

**Response**:
```json
{
  "plan": "pro",
  "status": "active",
  "amount": 19.99,
  "currency": "GBP",
  "billing_period": "monthly",
  "current_period_start": "2026-02-01",
  "current_period_end": "2026-03-01",
  "cancel_at_period_end": false,
  "addons": [
    {
      "type": "verified_badge",
      "amount": 4.99,
      "status": "active"
    }
  ],
  "stripe_subscription_id": "sub_xxx",
  "customer_portal_url": "https://billing.stripe.com/p/session/xxx"
}
```

---

## Database Schema

### New Tables for Billing

```sql
-- Payments table (prepaid credit ledger)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- topup/subscription/refund
  amount INTEGER NOT NULL, -- in pence (GBP × 100)
  status TEXT NOT NULL, -- pending/paid/failed/refunded
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_vendor ON payments(vendor_id);
CREATE INDEX idx_payments_stripe_pi ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- Auto top-up configuration (add columns to vendors table)
ALTER TABLE vendors ADD COLUMN auto_topup_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE vendors ADD COLUMN auto_topup_threshold INTEGER DEFAULT 2500; -- £25.00 in pence
ALTER TABLE vendors ADD COLUMN auto_topup_amount INTEGER DEFAULT 5000; -- £50.00 in pence

-- Monthly summaries cache (performance optimization)
CREATE TABLE vendor_monthly_summaries (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of month (2026-02-01)
  leads_count INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0, -- in pence
  total_topped_up INTEGER NOT NULL DEFAULT 0, -- in pence
  avg_lead_fee INTEGER NOT NULL DEFAULT 0, -- in pence
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_monthly_summaries_vendor_month ON vendor_monthly_summaries(vendor_id, month);
```

### Updated Ledger Schema

```sql
-- Enhance impressions_ledger to support both credit and lead fees
ALTER TABLE impressions_ledger 
  ADD COLUMN amount_gbp NUMERIC(10,2), -- Amount in GBP (for display)
  ADD COLUMN transaction_type TEXT; -- 'impression_debit', 'balance_credit', 'lead_fee'

-- Example records:
-- Old impression system: { event_type: 'debit', amount: 1, ref_type: 'lead' }
-- New balance system: { event_type: 'debit', amount: 1800, amount_gbp: 18.00, transaction_type: 'lead_fee' }
-- Top-up: { event_type: 'credit', amount: 5000, amount_gbp: 50.00, transaction_type: 'balance_credit' }
```

---

## Stripe Integration

### Webhooks

```javascript
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
      
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
      
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
      
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object);
      break;
  }
  
  res.json({ received: true });
});

async function handlePaymentSucceeded(paymentIntent) {
  const vendorId = paymentIntent.metadata.vendor_id;
  const type = paymentIntent.metadata.type; // 'balance_topup' or 'auto_topup'
  const amount = parseFloat(paymentIntent.metadata.amount);
  
  // Check idempotency (prevent double-credit)
  const existing = await db.query(
    'SELECT id FROM payments WHERE stripe_payment_intent_id = $1',
    [paymentIntent.id]
  );
  
  if (existing.rows.length > 0) {
    console.log('Payment already processed:', paymentIntent.id);
    return;
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Get current balance
    const vendorResult = await client.query(
      'SELECT impressions_balance FROM vendors WHERE id = $1 FOR UPDATE',
      [vendorId]
    );
    
    const currentBalance = vendorResult.rows[0].impressions_balance;
    const amountInPence = Math.round(amount * 100);
    const newBalance = currentBalance + amountInPence;
    
    // 2. Update vendor balance
    await client.query(
      'UPDATE vendors SET impressions_balance = $1, auto_pause = false, updated_at = NOW() WHERE id = $2',
      [newBalance, vendorId]
    );
    
    // 3. Record payment
    await client.query(`
      INSERT INTO payments 
        (id, vendor_id, type, amount, status, stripe_payment_intent_id, description, created_at)
      VALUES 
        ($1, $2, $3, $4, 'paid', $5, $6, NOW())
    `, [
      generateId(),
      vendorId,
      type,
      amountInPence,
      paymentIntent.id,
      `Balance top-up: £${amount}`
    ]);
    
    // 4. Record in ledger
    await client.query(`
      INSERT INTO impressions_ledger 
        (id, vendor_id, event_type, amount, balance_after, ref_type, ref_id, amount_gbp, transaction_type, created_at)
      VALUES 
        ($1, $2, 'credit', $3, $4, 'topup', $5, $6, 'balance_credit', NOW())
    `, [
      generateId(),
      vendorId,
      amountInPence,
      newBalance,
      paymentIntent.id,
      amount
    ]);
    
    await client.query('COMMIT');
    
    // 5. Update Redis
    await redisClient.set(`vendor:${vendorId}:balance`, newBalance);
    
    // 6. Send confirmation email
    await sendTopUpConfirmation(vendorId, amount, newBalance / 100);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    client.release();
  }
}
```

---

## Revenue Protection Logic

### Critical Safeguards

#### 1. Pre-Delivery Balance Check

```javascript
// NEVER deliver a lead without checking balance first
async function canDeliverLead(vendorId, leadFee) {
  // Try Redis first (fast)
  let balance = await redisClient.get(`vendor:${vendorId}:balance`);
  
  // Fallback to database if Redis unavailable
  if (balance === null) {
    const result = await db.query(
      'SELECT impressions_balance, auto_pause FROM vendors WHERE id = $1',
      [vendorId]
    );
    balance = result.rows[0]?.impressions_balance || 0;
  }
  
  return parseInt(balance) >= leadFee;
}
```

#### 2. Atomic Deduction

```javascript
// Use database transactions to ensure atomicity
await client.query('BEGIN');
// Lock vendor row
await client.query('SELECT ... FOR UPDATE');
// Check balance
// Deduct fee
// Record in ledger
await client.query('COMMIT');
```

#### 3. Auto-Pause on Zero Balance

```javascript
// Automatically pause vendors with £0 balance
if (newBalance <= 0) {
  await db.query(
    'UPDATE vendors SET auto_pause = true, auto_pause_reason = $1 WHERE id = $2',
    ['balance_exhausted', vendorId]
  );
  
  // Send urgent email
  await sendEmail({
    to: vendor.email,
    subject: '⚠ TradeMatch: Your balance is £0 - Top up to receive leads',
    template: 'balance_exhausted',
    data: { vendorName: vendor.name }
  });
}
```

#### 4. Fraud Detection

```javascript
// Monitor suspicious patterns
async function detectSuspiciousActivity(vendorId) {
  // Check for rapid balance draining
  const recentDebits = await db.query(`
    SELECT COUNT(*), SUM(amount) 
    FROM impressions_ledger 
    WHERE vendor_id = $1 
      AND event_type = 'debit' 
      AND created_at > NOW() - INTERVAL '1 hour'
  `, [vendorId]);
  
  if (recentDebits.rows[0].count > 50) {
    // Flag for admin review
    await flagVendorForReview(vendorId, 'rapid_balance_drain');
  }
  
  // Check for failed payment attempts
  const failedPayments = await db.query(`
    SELECT COUNT(*) 
    FROM payments 
    WHERE vendor_id = $1 
      AND status = 'failed' 
      AND created_at > NOW() - INTERVAL '7 days'
  `, [vendorId]);
  
  if (failedPayments.rows[0].count > 3) {
    // Disable auto top-up
    await db.query(
      'UPDATE vendors SET auto_topup_enabled = false WHERE id = $1',
      [vendorId]
    );
  }
}
```

---

## Security Considerations

### 1. Authentication

- All billing endpoints require valid JWT token
- Token must include `vendor_id` claim
- Tokens expire after 24 hours

### 2. Rate Limiting

```javascript
// Limit top-up requests to prevent abuse
const topUpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 top-ups per hour
  message: 'Too many top-up requests, please try again later'
});

app.post('/api/billing/topup', topUpLimiter, authenticateVendor, ...);
```

### 3. Amount Validation

```javascript
// Always validate amounts server-side
function validateAmount(amount) {
  if (typeof amount !== 'number') return false;
  if (amount < 10 || amount > 1000) return false;
  if (!Number.isFinite(amount)) return false;
  if (amount !== Math.round(amount * 100) / 100) return false; // Max 2 decimals
  return true;
}
```

### 4. Stripe Webhook Verification

```javascript
// ALWAYS verify Stripe webhook signatures
const event = stripe.webhooks.constructEvent(
  req.body,
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 5. SQL Injection Prevention

```javascript
// ALWAYS use parameterized queries
// ❌ NEVER:
await db.query(`SELECT * FROM vendors WHERE id = '${vendorId}'`);

// ✅ ALWAYS:
await db.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
```

---

## Testing Strategy

### Unit Tests

```javascript
describe('Lead Fee Calculation', () => {
  test('should calculate fee for small job', () => {
    expect(calculateLeadFee(300, 4)).toBe(8.00);
  });
  
  test('should apply scarcity multiplier for exclusive lead', () => {
    expect(calculateLeadFee(1500, 1)).toBe(27.00); // £18 × 1.5
  });
  
  test('should cap fee at £50', () => {
    expect(calculateLeadFee(100000, 1)).toBe(50.00);
  });
});

describe('Balance Check', () => {
  test('should prevent delivery if balance insufficient', async () => {
    const result = await deliverLeadToVendor('lead_1', 'vendor_low_balance', 18.00);
    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('insufficient_balance');
  });
  
  test('should deliver if balance sufficient', async () => {
    const result = await deliverLeadToVendor('lead_2', 'vendor_high_balance', 18.00);
    expect(result.delivered).toBe(true);
  });
});
```

### Integration Tests

```javascript
describe('Stripe Webhook Integration', () => {
  test('should credit balance on payment success', async () => {
    const paymentIntent = createMockPaymentIntent({
      amount: 5000, // £50
      metadata: { vendor_id: 'vendor_test', type: 'balance_topup', amount: '50' }
    });
    
    await handlePaymentSucceeded(paymentIntent);
    
    const balance = await getVendorBalance('vendor_test');
    expect(balance).toBe(5000); // 50 × 100 pence
  });
  
  test('should not double-credit on duplicate webhook', async () => {
    // Send same webhook twice
    await handlePaymentSucceeded(paymentIntent);
    await handlePaymentSucceeded(paymentIntent);
    
    const balance = await getVendorBalance('vendor_test');
    expect(balance).toBe(5000); // Still £50, not £100
  });
});
```

### Load Tests

```javascript
// Test concurrent lead deliveries (race condition detection)
describe('Concurrent Lead Delivery', () => {
  test('should handle 100 concurrent leads without balance errors', async () => {
    const vendor = await createTestVendor({ balance: 100000 }); // £1000
    
    const leads = Array(100).fill(null).map((_, i) => ({
      id: `lead_${i}`,
      fee: 1000 // £10 each
    }));
    
    // Deliver all 100 leads concurrently
    const results = await Promise.all(
      leads.map(lead => deliverLeadToVendor(lead.id, vendor.id, lead.fee))
    );
    
    // All should succeed
    expect(results.filter(r => r.delivered).length).toBe(100);
    
    // Final balance should be exactly £0
    const finalBalance = await getVendorBalance(vendor.id);
    expect(finalBalance).toBe(0);
    
    // Ledger should have exactly 100 entries
    const ledgerCount = await countLedgerEntries(vendor.id);
    expect(ledgerCount).toBe(100);
  });
});
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Revenue Metrics**
   - Daily/weekly/monthly lead fee revenue
   - Average lead fee
   - Lead delivery rate (delivered vs skipped)
   - Balance top-up conversion rate

2. **System Health**
   - Failed payment rate
   - Auto top-up success rate
   - Balance check latency (p50, p95, p99)
   - Redis cache hit rate

3. **Vendor Behavior**
   - % vendors with auto top-up enabled
   - Average balance maintained
   - Time to first top-up after signup
   - Churn rate by balance level

### Alert Thresholds

```yaml
alerts:
  - name: high_failed_payment_rate
    condition: failed_payments > 5% of total
    severity: high
    action: notify_ops_team
  
  - name: redis_cache_down
    condition: redis_unavailable > 1 minute
    severity: critical
    action: failover_to_database
  
  - name: balance_check_slow
    condition: p95_latency > 500ms
    severity: medium
    action: investigate_database_performance
  
  - name: revenue_drop
    condition: daily_revenue < 80% of 7day_average
    severity: high
    action: notify_finance_team
```

---

## Appendix: Revenue Model Comparison

### Option A: Impression-Based (Legacy)

- Vendors buy impressions
- Each lead delivery costs 1 impression
- Flat cost regardless of job value
- **Problem**: Large jobs and small jobs cost the same

### Option B: Pay-Per-Lead (Current)

- Vendors prepay balance
- Lead fee scales with job budget
- Maximum £50 cap
- **Advantage**: Fair pricing, higher revenue for valuable leads

### Revenue Comparison (1,000 vendors):

| Model       | Avg Price | Leads/Month | Revenue/Month |
|-------------|-----------|-------------|---------------|
| Impression  | £2.50     | 20,000      | £50,000       |
| Pay-Per-Lead| £15.00    | 20,000      | £300,000      |

**Pay-per-lead generates 6× more revenue** while being fairer to vendors.

---

## Summary

This billing system implements:

✅ **Prepaid credit model** - Vendors must pay before receiving leads
✅ **Dynamic pricing** - Fees scale with job value (£8-£50)
✅ **Revenue protection** - Balance checked before every lead delivery
✅ **Atomic operations** - Database transactions prevent race conditions
✅ **Complete audit trail** - Every transaction recorded in ledger
✅ **Auto top-up** - Optional convenience feature to maintain balance
✅ **Stripe integration** - Secure payment processing via Stripe Checkout
✅ **Fail-safe design** - If in doubt, don't deliver (protects revenue)

**This system ensures TradeMatch never delivers unpaid leads while providing a transparent, fair pricing model for vendors.**
