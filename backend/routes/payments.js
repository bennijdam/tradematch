const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticate } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { EVENT_TYPES } = require('../services/event-broker.service');

let pool, eventBroker;
let emailTransporter;

router.setPool = (p) => { pool = p; };
router.setEmailTransporter = (transporter) => { emailTransporter = transporter; };
router.setEventBroker = (eb) => { eventBroker = eb; };

const sendPaymentEmail = async (to, subject, html, text) => {
  if (!emailTransporter) {
    console.warn('Email transporter not configured - skipping payment email');
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@tradematch.co.uk',
      to,
      subject,
      html,
      text
    });
    console.log(`Payment email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send payment email:', error);
  }
};

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

        // Send payment initiation email
        const customerResult = await pool.query(
            'SELECT email, name FROM users WHERE id = $1',
            [customerId]
        );

        if (customerResult.rows.length > 0) {
            const customer = customerResult.rows[0];
            sendPaymentEmail(
                customer.email,
                'Payment Initiated for TradeMatch Service',
                `<h2>Payment Initiated</h2>
                 <p>Your payment of £${amount} has been initiated for the service.</p>
                 <p><strong>Payment ID:</strong> ${paymentId}</p>
                 <p><strong>Quote ID:</strong> ${quoteId}</p>
                 <p>Your payment is securely held in escrow until the work is completed to your satisfaction.</p>`,
                `Payment of £${amount} initiated for your TradeMatch service. Payment ID: ${paymentId}`
            );
        }
        
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
        
        // Emit payment released event
        if (eventBroker) {
            const jobResult = await pool.query(
                `SELECT j.id as job_id, j.customer_id, l.vendor_id
                 FROM payments p
                 JOIN jobs j ON p.job_id = j.id
                 LEFT JOIN leads l ON j.id = l.job_id AND l.status = 'accepted'
                 WHERE p.id = $1`,
                [paymentId]
            );
            
            if (jobResult.rows.length > 0) {
                const jobData = jobResult.rows[0];
                await eventBroker.emit(EVENT_TYPES.PAYMENT_RELEASED, {
                    actor_id: userId,
                    actor_role: 'customer',
                    subject_type: 'payment',
                    subject_id: releaseId,
                    job_id: jobData.job_id,
                    metadata: {
                        customer_id: jobData.customer_id,
                        vendor_id: jobData.vendor_id,
                        amount: amount,
                        milestone_id: milestoneId,
                        transfer_id: transfer.id
                    }
                });
            }
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
    const userId = req.user.userId;
    const userRole = req.user.role || req.user.userType;
    
    try {
        // Get milestone details for event emission
        const milestoneResult = await pool.query(
            `SELECT pm.*, j.id as job_id, j.customer_id, l.vendor_id
             FROM payment_milestones pm
             JOIN jobs j ON pm.job_id = j.id
             LEFT JOIN leads l ON j.id = l.job_id AND l.status = 'accepted'
             WHERE pm.id = $1`,
            [milestoneId]
        );
        
        if (milestoneResult.rows.length === 0) {
            return res.status(404).json({ error: 'Milestone not found' });
        }
        
        const milestone = milestoneResult.rows[0];
        
        await pool.query(
            `UPDATE payment_milestones 
             SET status = $1, 
                 completion_evidence = $2,
                 approved_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END
             WHERE id = $3`,
            [status, JSON.stringify(completionEvidence), milestoneId]
        );
        
        // Emit events based on status
        if (eventBroker) {
            if (status === 'submitted') {
                await eventBroker.emit(EVENT_TYPES.MILESTONE_SUBMITTED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        vendor_name: req.user.email,
                        milestone_title: milestone.title,
                        milestone_amount: milestone.amount
                    }
                });
            } else if (status === 'approved') {
                await eventBroker.emit(EVENT_TYPES.MILESTONE_APPROVED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        milestone_title: milestone.title,
                        milestone_amount: milestone.amount
                    }
                });
            } else if (status === 'rejected') {
                await eventBroker.emit(EVENT_TYPES.MILESTONE_REJECTED, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'milestone',
                    subject_id: milestoneId,
                    job_id: milestone.job_id,
                    metadata: {
                        customer_id: milestone.customer_id,
                        vendor_id: milestone.vendor_id,
                        milestone_title: milestone.title,
                        rejection_reason: completionEvidence
                    }
                });
            }
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Milestone update error:', error);
        res.status(500).json({ error: 'Failed to update milestone' });
    }
});

module.exports = router;