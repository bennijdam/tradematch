const express = require('express');
const router = express.Router();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../config/logger');

let pool;
router.setPool = (p) => { pool = p; };

async function recordWebhookEvent(event) {
    const result = await pool.query(
        `INSERT INTO finance_webhook_events (event_id, event_type, related_stripe_object)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.id, event.type, event.data?.object?.id || null]
    );
    return result.rowCount === 1;
}

async function ledgerEntryExists(stripeRef, entryType) {
    const result = await pool.query(
        `SELECT 1 FROM finance_ledger_entries WHERE related_stripe_object = $1 AND entry_type = $2 LIMIT 1`,
        [stripeRef, entryType]
    );
    return result.rows.length > 0;
}

async function createLedgerEntry({
    userId,
    amountCents,
    currency = 'GBP',
    entryType,
    reasonCode,
    stripeRef = null,
    metadata = {}
}) {
    const id = require('crypto').randomUUID();
    await pool.query(
        `INSERT INTO finance_ledger_entries
            (id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_by, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, stripeRef, userId, amountCents, currency, entryType, reasonCode, 'system', JSON.stringify(metadata)]
    );
    return id;
}

async function ensureVendorCredits(vendorId) {
    const result = await pool.query(
        `SELECT id FROM vendor_credits WHERE vendor_id = $1`,
        [vendorId]
    );

    if (result.rows.length === 0) {
        await pool.query(
            `INSERT INTO vendor_credits (vendor_id, available_credits, total_purchased_credits, total_spent_credits)
             VALUES ($1, 0, 0, 0)` ,
            [vendorId]
        );
    }
}

async function finalizeCreditPurchase({ vendorId, credits, amountCents, stripeRef, metadata }) {
    await ensureVendorCredits(vendorId);

    await pool.query(
        `UPDATE vendor_credits
         SET available_credits = available_credits + $1,
             total_purchased_credits = total_purchased_credits + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [credits, vendorId]
    );

    const exists = await ledgerEntryExists(stripeRef, 'credit_purchase');
    if (!exists) {
        await createLedgerEntry({
            userId: vendorId,
            amountCents,
            currency: 'GBP',
            entryType: 'credit_purchase',
            reasonCode: 'credits_purchase',
            stripeRef,
            metadata
        });
    }
}

async function applyVendorScoreEvent(vendorId, delta, reason) {
    await pool.query(
        `INSERT INTO finance_vendor_scores (vendor_id, score)
         VALUES ($1, 100)
         ON CONFLICT (vendor_id) DO NOTHING`,
        [vendorId]
    );

    await pool.query(
        `UPDATE finance_vendor_scores
         SET score = GREATEST(0, score + $1), updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [delta, vendorId]
    );

    await pool.query(
        `INSERT INTO finance_score_events (id, vendor_id, delta, reason)
         VALUES ($1, $2, $3, $4)`,
        [require('crypto').randomUUID(), vendorId, delta, reason]
    );
}

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

    // Idempotency: record event and skip if already processed
    const firstTime = await recordWebhookEvent(event);
    if (!firstTime) {
        logger.info('Stripe webhook duplicate ignored', { type: event.type, id: event.id });
        return res.json({ received: true, type: event.type, duplicate: true });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case 'checkout.session.expired':
                await handleCheckoutSessionExpired(event.data.object);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
                
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
                
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;

            case 'charge.dispute.created':
                await handleChargeDispute(event.data.object);
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
        // First, try to reconcile credit purchases (platform fees)
        if (paymentIntent.metadata?.purchase_type === 'credit_purchase') {
            const credits = parseInt(paymentIntent.metadata.credits || '0', 10);
            const vendorId = paymentIntent.metadata.vendor_id;
            if (vendorId && credits > 0) {
                await pool.query(
                    `UPDATE credit_purchases
                     SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                     WHERE stripe_payment_intent_id = $1` ,
                    [paymentIntent.id]
                );

                await finalizeCreditPurchase({
                    vendorId,
                    credits,
                    amountCents: paymentIntent.amount,
                    stripeRef: paymentIntent.id,
                    metadata: {
                        packageId: paymentIntent.metadata.package_id || null,
                        purchaseType: 'credit_purchase'
                    }
                });
                return;
            }
        }

        // Otherwise, update payment status in database (legacy job payments)
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
            // Send payment confirmation email to customer
            try {
                const apiUrl = process.env.API_URL || 'http://localhost:5001';
                // Lookup vendor name
                const vendorRes = await pool.query('SELECT name FROM users WHERE id = $1', [payment.vendor_id]);
                const vendorName = vendorRes.rows[0]?.name || 'Tradesperson';
                const amountPounds = (payment.amount || 0) / 100;

                await axios.post(`${apiUrl}/api/email/payment-confirmation`, {
                    customerId: payment.customer_id,
                    amount: amountPounds,
                    reference: paymentIntent.id,
                    vendorName
                }, { timeout: 5000 });
                logger.info('Payment confirmation email queued');
            } catch (emailErr) {
                logger.error('Failed to queue payment confirmation email', { error: emailErr.message });
            }

            // Optionally update quote status
            await pool.query(
                'UPDATE quotes SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                ['in_progress', payment.quote_id]
            );
            
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
        if (paymentIntent.metadata?.purchase_type === 'credit_purchase') {
            await pool.query(
                `UPDATE credit_purchases
                 SET status = 'failed', updated_at = CURRENT_TIMESTAMP
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
            );
            return;
        }

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

async function handleCheckoutSessionCompleted(session) {
    logger.info('Checkout session completed', { sessionId: session.id });

    if (session.mode !== 'payment') return;
    if (session.metadata?.purchase_type !== 'credit_purchase') return;

    const vendorId = session.metadata.vendor_id;
    const credits = parseInt(session.metadata.credits || '0', 10);
    const amountCents = session.amount_total || 0;
    const paymentIntentId = session.payment_intent;

    if (!vendorId || credits <= 0) return;

    await pool.query(
        `UPDATE credit_purchases
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
             stripe_payment_intent_id = COALESCE(stripe_payment_intent_id, $1),
             stripe_checkout_session_id = $2,
             stripe_customer_id = COALESCE(stripe_customer_id, $3)
         WHERE stripe_checkout_session_id = $2` ,
        [paymentIntentId, session.id, session.customer || null]
    );

    await finalizeCreditPurchase({
        vendorId,
        credits,
        amountCents,
        stripeRef: paymentIntentId || session.id,
        metadata: {
            packageId: session.metadata.package_id || null,
            checkoutSessionId: session.id
        }
    });
}

async function handleCheckoutSessionExpired(session) {
    if (session.mode !== 'payment') return;
    if (session.metadata?.purchase_type !== 'credit_purchase') return;

    await pool.query(
        `UPDATE credit_purchases
         SET status = 'failed', updated_at = CURRENT_TIMESTAMP
         WHERE stripe_checkout_session_id = $1`,
        [session.id]
    );
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
        const refundAmountCents = charge.amount_refunded || 0;
        const isPartial = refundAmountCents > 0 && refundAmountCents < charge.amount;

        // Fetch payment for linkage
        const paymentResult = await pool.query(
            `SELECT id, customer_id, vendor_id, stripe_payment_intent_id
             FROM payments
             WHERE stripe_charge_id = $1`,
            [charge.id]
        );
        const payment = paymentResult.rows[0];

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

        // Update finance_refunds if exists
        if (payment?.stripe_payment_intent_id) {
            await pool.query(
                `UPDATE finance_refunds
                 SET status = 'succeeded', stripe_refund_id = $1
                 WHERE stripe_payment_intent_id = $2`,
                [charge.refunds?.data?.[0]?.id || null, payment.stripe_payment_intent_id]
            );
        }

        // Ledger entries (platform perspective)
        await createLedgerEntry({
            userId: payment?.customer_id || null,
            amountCents: -refundAmountCents,
            currency: charge.currency?.toUpperCase() || 'GBP',
            entryType: 'refund_succeeded',
            reasonCode: isPartial ? 'partial_refund' : 'full_refund',
            stripeRef: charge.id,
            metadata: { paymentId: payment?.id || null }
        });

        // Vendor score adjustment
        if (payment?.vendor_id) {
            const delta = isPartial ? -1 : -2;
            await applyVendorScoreEvent(payment.vendor_id, delta, isPartial ? 'partial_refund' : 'refund');
        }

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

/**
 * Handle charge dispute (chargeback)
 */
async function handleChargeDispute(dispute) {
    logger.warn('Charge dispute created', {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100
    });

    try {
        const paymentResult = await pool.query(
            `SELECT id, customer_id, vendor_id, stripe_payment_intent_id
             FROM payments
             WHERE stripe_charge_id = $1`,
            [dispute.charge]
        );
        const payment = paymentResult.rows[0];

        await createLedgerEntry({
            userId: payment?.customer_id || null,
            amountCents: -(dispute.amount || 0),
            currency: dispute.currency?.toUpperCase() || 'GBP',
            entryType: 'chargeback',
            reasonCode: 'chargeback',
            stripeRef: dispute.id,
            metadata: { paymentId: payment?.id || null }
        });

        if (payment?.vendor_id) {
            await applyVendorScoreEvent(payment.vendor_id, -10, 'chargeback');
        }
    } catch (error) {
        logger.error('Error processing dispute', {
            error: error.message,
            disputeId: dispute.id
        });
        throw error;
    }
}

module.exports = router;
