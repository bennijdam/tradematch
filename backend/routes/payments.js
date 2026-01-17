const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe.service');

let pool;
router.setPool = (p) => { pool = p; };

// Create payment intent
router.post('/create-intent', async (req, res) => {
    try {
        const { amount, quoteId, customerId, vendorId } = req.body;
        
        // Create Stripe payment intent
        const paymentIntent = await stripeService.createPaymentIntent({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'gbp',
            metadata: {
                quoteId,
                customerId,
                vendorId
            }
        });
        
        // Store payment record
        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
            `INSERT INTO payments (id, quote_id, customer_id, vendor_id, amount, stripe_payment_intent_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [paymentId, quoteId, customerId, vendorId, amount, paymentIntent.id]
        );
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentId
        });
    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
});

// Confirm payment
router.post('/confirm', async (req, res) => {
    try {
        const { paymentIntentId, paymentId } = req.body;
        
        // Retrieve payment intent from Stripe
        const paymentIntent = await stripeService.retrievePaymentIntent(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            // Update payment record
            await pool.query(
                `UPDATE payments 
                 SET status = 'completed', stripe_charge_id = $1, paid_at = CURRENT_TIMESTAMP
                 WHERE id = $2`,
                [paymentIntent.charges.data[0].id, paymentId]
            );
            
            res.json({ success: true, status: 'completed' });
        } else {
            res.json({ success: false, status: paymentIntent.status });
        }
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
});

// Release escrow
router.post('/release-escrow', async (req, res) => {
    try {
        const { paymentId, amount, reason } = req.body;
        
        // Create escrow release record
        const releaseId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await pool.query(
            `INSERT INTO escrow_releases (id, payment_id, amount, reason, requested_by, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [releaseId, paymentId, amount, reason, req.user?.userId]
        );
        
        // Process transfer to vendor
        const transfer = await stripeService.createTransfer({
            amount: Math.round(amount * 100),
            destination: 'acct_...', // Vendor's Stripe account
            metadata: { paymentId, releaseId }
        });
        
        // Update release record
        await pool.query(
            `UPDATE escrow_releases 
             SET status = 'completed', approved_by = $1, released_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [req.user?.userId, releaseId]
        );
        
        res.json({ success: true, transferId: transfer.id });
    } catch (error) {
        console.error('Release escrow error:', error);
        res.status(500).json({ error: 'Failed to release escrow' });
    }
});

// Get payment history
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            `SELECT p.*, q.title as quote_title, u.name as vendor_name
             FROM payments p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON p.vendor_id = u.id
             WHERE p.customer_id = $1 OR p.vendor_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );
        
        res.json({ success: true, payments: result.rows });
    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

module.exports = router;