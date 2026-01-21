const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Stripe Webhook Endpoint
 * POST /api/webhooks/stripe
 * 
 * IMPORTANT: This endpoint must use raw body, not JSON parsed body
 * Configure in main server.js before express.json() middleware
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
        logger.warn('Stripe webhook: Missing signature');
        return res.status(400).json({ error: 'Missing stripe signature' });
    }

    let event;

    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        logger.info('Stripe webhook received', { type: event.type, id: event.id });
    } catch (err) {
        logger.error('Stripe webhook signature verification failed', { error: err.message });
        return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
                
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
                
            case 'customer.created':
                logger.info('Customer created', { customerId: event.data.object.id });
                break;
                
            case 'payment_method.attached':
                logger.info('Payment method attached', { 
                    paymentMethodId: event.data.object.id 
                });
                break;

            default:
                logger.info('Unhandled webhook event type', { type: event.type });
        }

        // Return a 200 response to acknowledge receipt of the event
        res.json({ received: true, type: event.type });
        
    } catch (error) {
        logger.error('Error processing webhook', { 
            type: event.type, 
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    logger.info('Payment intent succeeded', { 
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100
    });

    try {
        // Update payment status in database
        const result = await pool.query(
            `UPDATE payments 
             SET status = 'completed', 
                 stripe_charge_id = $1,
                 paid_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_payment_intent_id = $2
             RETURNING *`,
            [paymentIntent.latest_charge, paymentIntent.id]
        );

        if (result.rows.length > 0) {
            const payment = result.rows[0];
            logger.info('Payment record updated', { 
                paymentId: payment.id,
                quoteId: payment.quote_id
            });

            // TODO: Send email notifications to customer and vendor
            // TODO: Update quote status
            // TODO: Trigger any post-payment workflows
            
        } else {
            logger.warn('Payment record not found for payment intent', {
                paymentIntentId: paymentIntent.id
            });
        }

    } catch (error) {
        logger.error('Error updating payment record', { 
            error: error.message,
            paymentIntentId: paymentIntent.id
        });
        throw error;
    }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
    logger.warn('Payment intent failed', { 
        paymentIntentId: paymentIntent.id,
        errorMessage: paymentIntent.last_payment_error?.message
    });

    try {
        // Update payment status in database
        await pool.query(
            `UPDATE payments 
             SET status = 'failed',
                 metadata = jsonb_set(
                     COALESCE(metadata, '{}'::jsonb),
                     '{failure_reason}',
                     $1::jsonb
                 ),
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_payment_intent_id = $2`,
            [
                JSON.stringify(paymentIntent.last_payment_error?.message || 'Unknown error'),
                paymentIntent.id
            ]
        );

        logger.info('Payment record marked as failed', {
            paymentIntentId: paymentIntent.id
        });

        // TODO: Send failure notification to customer
        
    } catch (error) {
        logger.error('Error updating failed payment record', { 
            error: error.message,
            paymentIntentId: paymentIntent.id
        });
        throw error;
    }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge) {
    logger.info('Charge refunded', { 
        chargeId: charge.id,
        amount: charge.amount_refunded / 100
    });

    try {
        // Update payment status in database
        await pool.query(
            `UPDATE payments 
             SET status = 'refunded',
                 escrow_status = 'refunded',
                 metadata = jsonb_set(
                     COALESCE(metadata, '{}'::jsonb),
                     '{refund_amount}',
                     $1::jsonb
                 ),
                 updated_at = CURRENT_TIMESTAMP
             WHERE stripe_charge_id = $2`,
            [charge.amount_refunded, charge.id]
        );

        logger.info('Payment record marked as refunded', {
            chargeId: charge.id
        });

        // TODO: Send refund notification to customer and vendor
        
    } catch (error) {
        logger.error('Error updating refunded payment record', { 
            error: error.message,
            chargeId: charge.id
        });
        throw error;
    }
}

module.exports = router;
