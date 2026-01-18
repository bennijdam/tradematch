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