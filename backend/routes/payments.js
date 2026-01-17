const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

let pool;
router.setPool = (p) => { pool = p; };

// Simple authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/payments - Get payment history
router.get('/', authenticate, async (req, res) => {
    const userId = req.user.userId;
    const userType = req.user.userType;
    
    try {
        const condition = userType === 'vendor' ? 'vendor_id = $1' : 'customer_id = $1';
        
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title
             FROM payments p
             LEFT JOIN quotes q ON p.quote_id = q.id
             WHERE ${condition}
             ORDER BY p.created_at DESC
             LIMIT 50`,
            [userId]
        );
        
        res.json({
            success: true,
            payments: result.rows
        });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// POST /api/payments - Create payment intent
router.post('/create-intent', authenticate, async (req, res) => {
    const { amount, quoteId, customerId, vendorId } = req.body;
    
    try {
        // Create payment intent with your Stripe test key
        const paymentIntent = {
            id: `pi_${Date.now()}`,
            amount: amount * 100, // Convert to cents
            currency: 'gbp',
            metadata: {
                quoteId,
                customerId,
                vendorId
            }
        };
        
        res.json({
            success: true,
            clientSecret: 'pk_test_your_key_here', // Test mode key
            paymentIntent
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// POST /api/payments/confirm - Confirm payment
router.post('/confirm', authenticate, async (req, res) => {
    const { paymentIntentId, paymentId } = req.body;
    
    try {
        // Store payment record
        const paymentRecordId = `pay_${Date.now()}`;
        await pool.query(
            `INSERT INTO payments (id, quote_id, customer_id, vendor_id, amount, currency, status, stripe_payment_intent_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
            [paymentRecordId, quoteId, req.user.userId, vendorId, amount, 'gbp', 'completed', paymentIntentId]
        );
        
        res.json({
            success: true,
            status: 'completed',
            paymentId: paymentRecordId
        });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

module.exports = router;