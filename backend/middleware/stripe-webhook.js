const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe webhook middleware
const stripeWebhook = async (req, res, next) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.log(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
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
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
};

// Handle successful payment
async function handlePaymentSucceeded(paymentIntent) {
    try {
        const pool = require('../database').pool;
        
        // Update payment status
        await pool.query(
            `UPDATE payments 
             SET status = 'completed', 
                 stripe_charge_id = $1,
                 paid_at = CURRENT_TIMESTAMP
             WHERE stripe_payment_intent_id = $2`,
            [paymentIntent.charges.data[0]?.id, paymentIntent.id]
        );
        
        // Log event
        await logAnalyticsEvent('payment_completed', {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency
        });
        
        console.log(`Payment succeeded: ${paymentIntent.id}`);
    } catch (error) {
        console.error('Handle payment succeeded error:', error);
    }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent) {
    try {
        const pool = require('../database').pool;
        
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
    }
}

// Handle canceled payment
async function handlePaymentCanceled(paymentIntent) {
    try {
        const pool = require('../database').pool;
        
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
    }
}

// Handle transfer created
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
    }
}

// Handle transfer paid
async function handleTransferPaid(transfer) {
    try {
        const pool = require('../database').pool;
        
        await pool.query(
            `UPDATE escrow_releases 
             SET status = 'completed', released_at = CURRENT_TIMESTAMP
             WHERE stripe_transfer_id = $1`,
            [transfer.id]
        );
        
        await logAnalyticsEvent('transfer_paid', {
            transferId: transfer.id,
            amount: transfer.amount / 100
        });
        
        console.log(`Transfer paid: ${transfer.id}`);
    } catch (error) {
        console.error('Handle transfer paid error:', error);
    }
}

// Handle transfer failed
async function handleTransferFailed(transfer) {
    try {
        await logAnalyticsEvent('transfer_failed', {
            transferId: transfer.id,
            errorCode: transfer.failure_code,
            errorMessage: transfer.failure_message
        });
        
        console.log(`Transfer failed: ${transfer.id}`);
    } catch (error) {
        console.error('Handle transfer failed error:', error);
    }
}

// Handle account updated
async function handleAccountUpdated(account) {
    try {
        const pool = require('../database').pool;
        
        await pool.query(
            `UPDATE users 
             SET stripe_account_status = $1,
                 stripe_account_details = $2
             WHERE stripe_account_id = $3`,
            [account.payouts_enabled ? 'verified' : 'pending', 
             JSON.stringify(account), account.id]
        );
        
        await logAnalyticsEvent('account_updated', {
            accountId: account.id,
            payoutsEnabled: account.payouts_enabled,
            chargesEnabled: account.charges_enabled
        });
        
        console.log(`Account updated: ${account.id}`);
    } catch (error) {
        console.error('Handle account updated error:', error);
    }
}

// Handle payout created
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
    }
}

// Handle payout paid
async function handlePayoutPaid(payout) {
    try {
        await logAnalyticsEvent('payout_paid', {
            payoutId: payout.id,
            amount: payout.amount / 100
        });
        
        console.log(`Payout paid: ${payout.id}`);
    } catch (error) {
        console.error('Handle payout paid error:', error);
    }
}

// Handle payout failed
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
    }
}

// Log analytics events
async function logAnalyticsEvent(eventType, data) {
    try {
        const pool = require('../database').pool;
        
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

module.exports = stripeWebhook;