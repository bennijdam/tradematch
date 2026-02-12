const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

let pool;

/**
 * Stripe Webhook Event Handlers
 * Processes all Stripe webhook events and updates database accordingly
 */

// Set pool reference
const setPool = (p) => { pool = p; };

/**
 * Main webhook handler
 * @param {Object} event - Stripe event object
 */
async function handleWebhookEvent(event) {
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object);
                break;
            case 'payment_intent.canceled':
                await handlePaymentCanceled(event.data.object);
                break;
            case 'transfer.created':
                await handleTransferCreated(event.data.object);
                break;
            case 'transfer.paid':
                await handleTransferPaid(event.data.object);
                break;
            case 'transfer.failed':
                await handleTransferFailed(event.data.object);
                break;
            case 'account.updated':
                await handleAccountUpdated(event.data.object);
                break;
            case 'payout.created':
                await handlePayoutCreated(event.data.object);
                break;
            case 'payout.paid':
                await handlePayoutPaid(event.data.object);
                break;
            case 'payout.failed':
                await handlePayoutFailed(event.data.object);
                break;
            case 'charge.succeeded':
                await handleChargeSucceeded(event.data.object);
                break;
            case 'charge.failed':
                await handleChargeFailed(event.data.object);
                break;
            case 'charge.dispute.created':
                await handleChargeDisputeCreated(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
        throw error;
    }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(paymentIntent) {
    try {
        await pool.query(
            `UPDATE payments 
             SET status = 'paid', 
                 stripe_charge_id = $1,
                 paid_at = CURRENT_TIMESTAMP
             WHERE stripe_payment_intent_id = $2`,
            [paymentIntent.latest_charge, paymentIntent.id]
        );

        await logAnalyticsEvent('payment_succeeded', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency
        });

        console.log(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
        console.error('Handle payment succeeded error:', error);
        throw error;
    }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent) {
    try {
        await pool.query(
            `UPDATE payments 
             SET status = 'failed'
             WHERE stripe_payment_intent_id = $1`,
            [paymentIntent.id]
        );

        await logAnalyticsEvent('payment_failed', {
            paymentIntentId: paymentIntent.id,
            errorCode: paymentIntent.last_payment_error?.code,
            errorMessage: paymentIntent.last_payment_error?.message
        });

        console.log(`Payment failed: ${paymentIntent.id}`);
    } catch (error) {
        console.error('Handle payment failed error:', error);
        throw error;
    }
}

/**
 * Handle canceled payment
 */
async function handlePaymentCanceled(paymentIntent) {
    try {
        await pool.query(
            `UPDATE payments 
             SET status = 'canceled'
             WHERE stripe_payment_intent_id = $1`,
            [paymentIntent.id]
        );

        await logAnalyticsEvent('payment_canceled', {
            paymentIntentId: paymentIntent.id
        });

        console.log(`Payment canceled: ${paymentIntent.id}`);
    } catch (error) {
        console.error('Handle payment canceled error:', error);
        throw error;
    }
}

/**
 * Handle transfer created
 */
async function handleTransferCreated(transfer) {
    try {
        await logAnalyticsEvent('transfer_created', {
            transferId: transfer.id,
            amount: transfer.amount / 100,
            destination: transfer.destination
        });

        console.log(`Transfer created: ${transfer.id}`);
    } catch (error) {
        console.error('Handle transfer created error:', error);
        throw error;
    }
}

/**
 * Handle transfer paid
 */
async function handleTransferPaid(transfer) {
    try {
        await pool.query(
            `UPDATE escrow_releases 
             SET status = 'completed', 
                 released_at = CURRENT_TIMESTAMP
             WHERE metadata::text LIKE $1`,
            [`%transferId":"${transfer.id}"%`]
        );

        await logAnalyticsEvent('transfer_paid', {
            transferId: transfer.id,
            amount: transfer.amount / 100
        });

        console.log(`Transfer paid: ${transfer.id}`);
    } catch (error) {
        console.error('Handle transfer paid error:', error);
        throw error;
    }
}

/**
 * Handle transfer failed
 */
async function handleTransferFailed(transfer) {
    try {
        await pool.query(
            `UPDATE escrow_releases 
             SET status = 'failed'
             WHERE metadata::text LIKE $1`,
            [`%transferId":"${transfer.id}"%`]
        );

        await logAnalyticsEvent('transfer_failed', {
            transferId: transfer.id,
            errorCode: transfer.failure_code,
            errorMessage: transfer.failure_message
        });

        console.log(`Transfer failed: ${transfer.id}`);
    } catch (error) {
        console.error('Handle transfer failed error:', error);
        throw error;
    }
}

/**
 * Handle account updated
 */
async function handleAccountUpdated(account) {
    try {
        await pool.query(
            `UPDATE users 
             SET stripe_account_status = $1,
                 stripe_account_details = $2
             WHERE stripe_account_id = $3`,
            [
                account.payouts_enabled ? 'verified' : 'pending',
                JSON.stringify(account),
                account.id
            ]
        );

        await logAnalyticsEvent('account_updated', {
            accountId: account.id,
            payoutsEnabled: account.payouts_enabled,
            chargesEnabled: account.charges_enabled
        });

        console.log(`Account updated: ${account.id}`);
    } catch (error) {
        console.error('Handle account updated error:', error);
        throw error;
    }
}

/**
 * Handle payout created
 */
async function handlePayoutCreated(payout) {
    try {
        await logAnalyticsEvent('payout_created', {
            payoutId: payout.id,
            amount: payout.amount / 100,
            arrivalDate: payout.arrival_date
        });

        console.log(`Payout created: ${payout.id}`);
    } catch (error) {
        console.error('Handle payout created error:', error);
        throw error;
    }
}

/**
 * Handle payout paid
 */
async function handlePayoutPaid(payout) {
    try {
        await logAnalyticsEvent('payout_paid', {
            payoutId: payout.id,
            amount: payout.amount / 100
        });

        console.log(`Payout paid: ${payout.id}`);
    } catch (error) {
        console.error('Handle payout paid error:', error);
        throw error;
    }
}

/**
 * Handle payout failed
 */
async function handlePayoutFailed(payout) {
    try {
        await logAnalyticsEvent('payout_failed', {
            payoutId: payout.id,
            errorCode: payout.failure_code,
            errorMessage: payout.failure_message
        });

        console.log(`Payout failed: ${payout.id}`);
    } catch (error) {
        console.error('Handle payout failed error:', error);
        throw error;
    }
}

/**
 * Handle charge succeeded
 */
async function handleChargeSucceeded(charge) {
    try {
        await logAnalyticsEvent('charge_succeeded', {
            chargeId: charge.id,
            amount: charge.amount / 100,
            currency: charge.currency,
            paymentIntentId: charge.payment_intent
        });

        console.log(`Charge succeeded: ${charge.id}`);
    } catch (error) {
        console.error('Handle charge succeeded error:', error);
        throw error;
    }
}

/**
 * Handle charge failed
 */
async function handleChargeFailed(charge) {
    try {
        await logAnalyticsEvent('charge_failed', {
            chargeId: charge.id,
            errorCode: charge.failure_code,
            errorMessage: charge.failure_message,
            paymentIntentId: charge.payment_intent
        });

        console.log(`Charge failed: ${charge.id}`);
    } catch (error) {
        console.error('Handle charge failed error:', error);
        throw error;
    }
}

/**
 * Handle charge dispute created
 */
async function handleChargeDisputeCreated(dispute) {
    try {
        await pool.query(
            `UPDATE payments 
             SET status = 'disputed'
             WHERE stripe_charge_id = $1`,
            [dispute.charge]
        );

        await logAnalyticsEvent('charge_dispute_created', {
            disputeId: dispute.id,
            chargeId: dispute.charge,
            amount: dispute.amount / 100,
            reason: dispute.reason
        });

        console.log(`Charge dispute created: ${dispute.id}`);
    } catch (error) {
        console.error('Handle charge dispute created error:', error);
        throw error;
    }
}

/**
 * Log analytics events
 */
async function logAnalyticsEvent(eventType, data) {
    try {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO analytics_events (id, event_type, data, created_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
            [eventId, eventType, JSON.stringify(data)]
        );
    } catch (error) {
        console.error('Log analytics event error:', error);
    }
}

module.exports = {
    handleWebhookEvent,
    setPool
};