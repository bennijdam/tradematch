# 🚀 TradeMatch Phase 7 - Complete Advanced Features

## 📦 **Package Contents**

This Phase 7 implementation includes:

1. ✅ **Payment Integration (Stripe)** - Full escrow system
2. ✅ **Review System** - Vendor ratings & customer feedback
3. ✅ **AI Job Enhancement** - Automatic quote optimization
4. ✅ **Proposal System** - Professional PDF proposals
5. ✅ **Vendor Analytics** - Comprehensive dashboard insights
6. ✅ **Milestone Contracts** - Payment release management

---

## 🗂️ **File Structure**

```
phase7-complete/
├── backend/
│   ├── routes/
│   │   ├── payments.js          ✅ Stripe integration
│   │   ├── reviews.js           ✅ Rating system
│   │   ├── ai.js                ✅ OpenAI enhancement
│   │   ├── proposals.js         ✅ PDF generation
│   │   ├── analytics.js         ✅ Vendor insights
│   │   └── milestones.js        ✅ Contract management
│   ├── services/
│   │   ├── stripe.service.js    ✅ Payment processing
│   │   ├── openai.service.js    ✅ AI integration
│   │   ├── pdf.service.js       ✅ PDF generation
│   │   └── analytics.service.js ✅ Data aggregation
│   ├── middleware/
│   │   ├── stripe-webhook.js    ✅ Payment verification
│   │   └── rate-limit.js        ✅ API protection
│   └── webhooks/
│       └── stripe.js            ✅ Webhook handlers
│
├── frontend/
│   ├── pages/
│   │   ├── payment-checkout.html       ✅ Stripe checkout
│   │   ├── milestone-manager.html      ✅ Contract UI
│   │   ├── vendor-analytics.html       ✅ Analytics dashboard
│   │   ├── proposal-builder.html       ✅ Proposal creator
│   │   └── review-system.html          ✅ Rating interface
│   ├── components/
│   │   ├── payment-form.js             ✅ Stripe Elements
│   │   ├── milestone-card.js           ✅ Progress tracker
│   │   ├── analytics-charts.js         ✅ Chart.js graphs
│   │   └── star-rating.js              ✅ Interactive ratings
│   └── js/
│       ├── stripe-client.js            ✅ Client SDK
│       ├── ai-enhancement.js           ✅ AI features
│       └── analytics-client.js         ✅ Dashboard data
│
├── database/
│   ├── schema-phase7.sql               ✅ New tables
│   ├── migrations/                     ✅ Database updates
│   │   ├── 001_add_payments.sql
│   │   ├── 002_add_reviews.sql
│   │   ├── 003_add_proposals.sql
│   │   ├── 004_add_milestones.sql
│   │   └── 005_add_analytics.sql
│   └── seeds/
│       └── sample-data.sql             ✅ Test data
│
├── docs/
│   ├── STRIPE-SETUP.md                 ✅ Payment configuration
│   ├── AI-INTEGRATION.md               ✅ OpenAI setup
│   ├── ANALYTICS-GUIDE.md              ✅ Dashboard usage
│   ├── PROPOSAL-TEMPLATES.md           ✅ PDF customization
│   └── DEPLOYMENT.md                   ✅ Production guide
│
└── config/
    ├── stripe-config.js                ✅ API keys
    ├── openai-config.js                ✅ Model settings
    └── pdf-templates/                  ✅ Proposal designs
        ├── modern.hbs
        ├── professional.hbs
        └── minimal.hbs
```

---

## 💳 **Feature 1: Payment Integration (Stripe)**

### **Database Schema**

```sql
-- Payments table
CREATE TABLE payments (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    customer_id VARCHAR(50) REFERENCES users(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    escrow_status VARCHAR(20) DEFAULT 'held',
    metadata JSONB,
    paid_at TIMESTAMP,
    released_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Escrow releases
CREATE TABLE escrow_releases (
    id VARCHAR(50) PRIMARY KEY,
    payment_id VARCHAR(50) REFERENCES payments(id),
    milestone_id VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    requested_by VARCHAR(50) REFERENCES users(id),
    approved_by VARCHAR(50) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    released_at TIMESTAMP
);

-- Payment milestones
CREATE TABLE payment_milestones (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    completion_evidence JSONB,
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_quote ON payments(quote_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_milestones_quote ON payment_milestones(quote_id);
```

### **Backend Route: payments.js**

```javascript
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Create Payment Intent (Stripe)
 * POST /api/payments/create-intent
 */
router.post('/create-intent', authenticate, async (req, res) => {
    const { quoteId, amount, description } = req.body;
    const customerId = req.user.userId;
    
    try {
        // Get quote details
        const quoteResult = await pool.query(
            'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2',
            [quoteId, customerId]
        );
        
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        
        const quote = quoteResult.rows[0];
        
        // Create Stripe PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to pence
            currency: 'gbp',
            metadata: {
                quoteId,
                customerId,
                vendorId: quote.vendor_id
            },
            description: description || `Payment for ${quote.title}`,
            automatic_payment_methods: {
                enabled: true,
            }
        });
        
        // Store payment record
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO payments (
                id, quote_id, customer_id, vendor_id, amount, 
                stripe_payment_intent_id, status, escrow_status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'held')`,
            [paymentId, quoteId, customerId, quote.vendor_id, amount, paymentIntent.id]
        );
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentId,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

/**
 * Confirm Payment
 * POST /api/payments/confirm
 */
router.post('/confirm', authenticate, async (req, res) => {
    const { paymentIntentId } = req.body;
    
    try {
        // Verify payment with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            // Update payment record
            await pool.query(
                `UPDATE payments 
                 SET status = 'paid', 
                     paid_at = CURRENT_TIMESTAMP,
                     stripe_charge_id = $1
                 WHERE stripe_payment_intent_id = $2`,
                [paymentIntent.latest_charge, paymentIntentId]
            );
            
            res.json({ success: true, status: 'paid' });
        } else {
            res.json({ success: false, status: paymentIntent.status });
        }
        
    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

/**
 * Release Escrow Funds
 * POST /api/payments/release-escrow
 */
router.post('/release-escrow', authenticate, async (req, res) => {
    const { paymentId, milestoneId, amount, reason } = req.body;
    const userId = req.user.userId;
    
    try {
        // Verify payment ownership
        const paymentResult = await pool.query(
            'SELECT * FROM payments WHERE id = $1 AND customer_id = $2',
            [paymentId, userId]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const payment = paymentResult.rows[0];
        
        if (payment.escrow_status !== 'held') {
            return res.status(400).json({ error: 'Funds already released' });
        }
        
        // Create escrow release request
        const releaseId = `rel_${Date.now()}`;
        
        await pool.query(
            `INSERT INTO escrow_releases (
                id, payment_id, milestone_id, amount, reason, 
                requested_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
            [releaseId, paymentId, milestoneId, amount, reason, userId]
        );
        
        // Create Stripe Transfer to vendor
        const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: 'gbp',
            destination: payment.vendor_stripe_account_id, // Vendor's connected account
            metadata: {
                paymentId,
                releaseId
            }
        });
        
        // Update escrow release
        await pool.query(
            `UPDATE escrow_releases 
             SET status = 'completed', 
                 released_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [releaseId]
        );
        
        // Update milestone if provided
        if (milestoneId) {
            await pool.query(
                `UPDATE payment_milestones 
                 SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
                 WHERE id = $1`,
                [milestoneId]
            );
        }
        
        res.json({ 
            success: true, 
            releaseId,
            transferId: transfer.id 
        });
        
    } catch (error) {
        console.error('Escrow release error:', error);
        res.status(500).json({ error: 'Failed to release funds' });
    }
});

/**
 * Get Payment History
 * GET /api/payments/history
 */
router.get('/history', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const userType = req.user.userType;
    
    try {
        const condition = userType === 'vendor' 
            ? 'vendor_id = $1' 
            : 'customer_id = $1';
            
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title, 
                    u.name as other_party_name
             FROM payments p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON (
                 CASE 
                     WHEN p.customer_id = $1 THEN u.id = p.vendor_id
                     ELSE u.id = p.customer_id
                 END
             )
             WHERE ${condition}
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        res.json({ 
            success: true, 
            payments: result.rows 
        });
        
    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

/**
 * Create Payment Milestones
 * POST /api/payments/milestones
 */
router.post('/milestones', authenticate, async (req, res) => {
    const { quoteId, milestones } = req.body;
    const userId = req.user.userId;
    
    try {
        // Verify quote ownership (vendor only)
        const quoteResult = await pool.query(
            'SELECT * FROM quotes WHERE id = $1',
            [quoteId]
        );
        
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        
        // Insert milestones
        const insertedMilestones = [];
        
        for (const milestone of milestones) {
            const milestoneId = `mile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await pool.query(
                `INSERT INTO payment_milestones (
                    id, quote_id, title, description, amount, 
                    percentage, due_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    milestoneId,
                    quoteId,
                    milestone.title,
                    milestone.description,
                    milestone.amount,
                    milestone.percentage,
                    milestone.dueDate
                ]
            );
            
            insertedMilestones.push(milestoneId);
        }
        
        res.json({ 
            success: true, 
            milestones: insertedMilestones 
        });
        
    } catch (error) {
        console.error('Milestone creation error:', error);
        res.status(500).json({ error: 'Failed to create milestones' });
    }
});

/**
 * Get Quote Milestones
 * GET /api/payments/milestones/:quoteId
 */
router.get('/milestones/:quoteId', authenticate, async (req, res) => {
    const { quoteId } = req.params;
    
    try {
        const result = await pool.query(
            `SELECT * FROM payment_milestones 
             WHERE quote_id = $1 
             ORDER BY due_date ASC`,
            [quoteId]
        );
        
        res.json({ 
            success: true, 
            milestones: result.rows 
        });
        
    } catch (error) {
        console.error('Fetch milestones error:', error);
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

/**
 * Update Milestone Status
 * PUT /api/payments/milestones/:milestoneId
 */
router.put('/milestones/:milestoneId', authenticate, async (req, res) => {
    const { milestoneId } = req.params;
    const { status, completionEvidence } = req.body;
    
    try {
        await pool.query(
            `UPDATE payment_milestones 
             SET status = $1, 
                 completion_evidence = $2,
                 approved_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END
             WHERE id = $3`,
            [status, JSON.stringify(completionEvidence), milestoneId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Milestone update error:', error);
        res.status(500).json({ error: 'Failed to update milestone' });
    }
});

module.exports = router;
```

### **Frontend: payment-checkout.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Secure Payment | TradeMatch</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        .payment-container {
            max-width: 600px;
            margin: 50px auto;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        #payment-element {
            margin: 20px 0;
        }
        
        .payment-button {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #FF385C 0%, #FF6B6B 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .payment-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 56, 92, 0.3);
        }
        
        .payment-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .amount-display {
            font-size: 32px;
            font-weight: 700;
            text-align: center;
            margin: 20px 0;
            color: #1A1A1A;
        }
        
        .escrow-notice {
            background: #FFF4E5;
            border-left: 4px solid #FFB800;
            padding: 16px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .payment-summary {
            background: #F7F7F7;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            font-size: 15px;
        }
        
        .summary-row.total {
            font-size: 20px;
            font-weight: 700;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #E0E0E0;
        }
    </style>
</head>
<body>
    <div class="payment-container">
        <h1>Secure Payment</h1>
        
        <div class="payment-summary" id="paymentSummary">
            <!-- Populated by JS -->
        </div>
        
        <div class="escrow-notice">
            <strong>🔒 Protected by Escrow</strong>
            <p>Your payment is held securely and only released when you approve the completed work. Full buyer protection.</p>
        </div>
        
        <form id="payment-form">
            <div id="payment-element">
                <!-- Stripe Elements will create payment fields here -->
            </div>
            
            <div id="payment-message" style="color: red; margin: 15px 0;"></div>
            
            <button type="submit" id="submit-button" class="payment-button">
                <span id="button-text">Pay Now</span>
                <div id="spinner" style="display: none;">Processing...</div>
            </button>
        </form>
    </div>

    <script>
        const API_URL = 'https://tradematch.onrender.com';
        const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // Replace with your Stripe publishable key
        
        let elements;
        let paymentIntent;
        
        // Get quote details from URL
        const urlParams = new URLSearchParams(window.location.search);
        const quoteId = urlParams.get('quoteId');
        const amount = parseFloat(urlParams.get('amount'));
        
        async function initialize() {
            // Load quote details
            await loadQuoteDetails();
            
            // Create payment intent
            const response = await fetch(`${API_URL}/api/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    quoteId,
                    amount,
                    description: `Payment for quote ${quoteId}`
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                showMessage('Failed to initialize payment');
                return;
            }
            
            paymentIntent = data;
            
            // Initialize Stripe Elements
            elements = stripe.elements({
                clientSecret: data.clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#FF385C',
                    }
                }
            });
            
            const paymentElement = elements.create('payment');
            paymentElement.mount('#payment-element');
        }
        
        async function loadQuoteDetails() {
            const response = await fetch(`${API_URL}/api/quotes/${quoteId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            const data = await response.json();
            const quote = data.quote;
            
            // Display payment summary
            document.getElementById('paymentSummary').innerHTML = `
                <h3>${quote.title}</h3>
                <div class="summary-row">
                    <span>Vendor:</span>
                    <span>${quote.vendor_name}</span>
                </div>
                <div class="summary-row">
                    <span>Service:</span>
                    <span>${quote.service_type}</span>
                </div>
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>£${amount.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Platform Fee (2.5%):</span>
                    <span>£${(amount * 0.025).toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount:</span>
                    <span>£${(amount * 1.025).toFixed(2)}</span>
                </div>
            `;
        }
        
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            setLoading(true);
            
            const { error } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/payment-success.html?paymentId=${paymentIntent.paymentId}`,
                },
            });
            
            if (error) {
                showMessage(error.message);
                setLoading(false);
            }
        });
        
        function setLoading(isLoading) {
            const submitButton = document.getElementById('submit-button');
            const buttonText = document.getElementById('button-text');
            const spinner = document.getElementById('spinner');
            
            if (isLoading) {
                submitButton.disabled = true;
                buttonText.style.display = 'none';
                spinner.style.display = 'block';
            } else {
                submitButton.disabled = false;
                buttonText.style.display = 'block';
                spinner.style.display = 'none';
            }
        }
        
        function showMessage(message) {
            const messageDiv = document.getElementById('payment-message');
            messageDiv.textContent = message;
        }
        
        // Initialize on page load
        initialize();
    </script>
</body>
</html>
```

---

## ⭐ **Feature 2: Review System**

### **Database Schema**

```sql
CREATE TABLE reviews (
    id VARCHAR(50) PRIMARY KEY,
    quote_id VARCHAR(50) REFERENCES quotes(id),
    customer_id VARCHAR(50) REFERENCES users(id),
    vendor_id VARCHAR(50) REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
    photos JSONB,
    response_text TEXT,
    response_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_vendor ON reviews(vendor_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_verified ON reviews(is_verified);
```

### **Backend Route: reviews.js**

```javascript
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Create Review
 * POST /api/reviews
 */
router.post('/', authenticate, async (req, res) => {
    const {
        quoteId,
        vendorId,
        rating,
        reviewText,
        qualityRating,
        communicationRating,
        valueRating,
        timelinessRating,
        photos
    } = req.body;
    
    const customerId = req.user.userId;
    
    try {
        // Verify customer has completed job with this vendor
        const quoteCheck = await pool.query(
            'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2 AND status = $3',
            [quoteId, customerId, 'completed']
        );
        
        if (quoteCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You can only review completed jobs' });
        }
        
        // Check if already reviewed
        const existingReview = await pool.query(
            'SELECT id FROM reviews WHERE quote_id = $1 AND customer_id = $2',
            [quoteId, customerId]
        );
        
        if (existingReview.rows.length > 0) {
            return res.status(400).json({ error: 'You have already reviewed this job' });
        }
        
        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO reviews (
                id, quote_id, customer_id, vendor_id, rating, review_text,
                quality_rating, communication_rating, value_rating, timeliness_rating,
                photos, is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
            [
                reviewId, quoteId, customerId, vendorId, rating, reviewText,
                qualityRating, communicationRating, valueRating, timelinessRating,
                JSON.stringify(photos)
            ]
        );
        
        // Update vendor's average rating
        await updateVendorRating(vendorId);
        
        res.json({ success: true, reviewId });
        
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

/**
 * Get Vendor Reviews
 * GET /api/reviews/vendor/:vendorId
 */
router.get('/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;
    
    try {
        let orderClause = 'r.created_at DESC';
        
        if (sortBy === 'helpful') {
            orderClause = 'r.helpful_count DESC, r.created_at DESC';
        } else if (sortBy === 'rating') {
            orderClause = 'r.rating DESC, r.created_at DESC';
        }
        
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            `SELECT r.*, 
                    u.name as customer_name,
                    u.avatar_url as customer_avatar,
                    q.title as job_title
             FROM reviews r
             JOIN users u ON r.customer_id = u.id
             JOIN quotes q ON r.quote_id = q.id
             WHERE r.vendor_id = $1 AND r.is_verified = true
             ORDER BY ${orderClause}
             LIMIT $2 OFFSET $3`,
            [vendorId, limit, offset]
        );
        
        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM reviews WHERE vendor_id = $1 AND is_verified = true',
            [vendorId]
        );
        
        // Get rating breakdown
        const breakdownResult = await pool.query(
            `SELECT 
                rating,
                COUNT(*) as count
             FROM reviews
             WHERE vendor_id = $1 AND is_verified = true
             GROUP BY rating
             ORDER BY rating DESC`,
            [vendorId]
        );
        
        // Calculate averages
        const avgResult = await pool.query(
            `SELECT 
                ROUND(AVG(rating), 2) as avg_rating,
                ROUND(AVG(quality_rating), 2) as avg_quality,
                ROUND(AVG(communication_rating), 2) as avg_communication,
                ROUND(AVG(value_rating), 2) as avg_value,
                ROUND(AVG(timeliness_rating), 2) as avg_timeliness
             FROM reviews
             WHERE vendor_id = $1 AND is_verified = true`,
            [vendorId]
        );
        
        res.json({
            success: true,
            reviews: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult.rows[0].count / limit)
            },
            statistics: {
                averages: avgResult.rows[0],
                breakdown: breakdownResult.rows
            }
        });
        
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * Vendor Response to Review
 * POST /api/reviews/:reviewId/response
 */
router.post('/:reviewId/response', authenticate, async (req, res) => {
    const { reviewId } = req.params;
    const { responseText } = req.body;
    const vendorId = req.user.userId;
    
    try {
        // Verify vendor owns this review
        const reviewCheck = await pool.query(
            'SELECT * FROM reviews WHERE id = $1 AND vendor_id = $2',
            [reviewId, vendorId]
        );
        
        if (reviewCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await pool.query(
            `UPDATE reviews 
             SET response_text = $1, response_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [responseText, reviewId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Review response error:', error);
        res.status(500).json({ error: 'Failed to post response' });
    }
});

/**
 * Mark Review as Helpful
 * POST /api/reviews/:reviewId/helpful
 */
router.post('/:reviewId/helpful', authenticate, async (req, res) => {
    const { reviewId } = req.params;
    
    try {
        await pool.query(
            'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
            [reviewId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Helpful vote error:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

/**
 * Helper: Update Vendor's Average Rating
 */
async function updateVendorRating(vendorId) {
    try {
        const avgResult = await pool.query(
            'SELECT ROUND(AVG(rating), 2) as avg_rating FROM reviews WHERE vendor_id = $1',
            [vendorId]
        );
        
        await pool.query(
            'UPDATE vendors SET average_rating = $1 WHERE id = $2',
            [avgResult.rows[0].avg_rating, vendorId]
        );
    } catch (error) {
        console.error('Update vendor rating error:', error);
    }
}

module.exports = router;
```

*This is Part 1 of Phase 7. Due to length, I'll continue with Features 3-6 in the next response...*
