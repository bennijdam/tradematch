const StripeService = require('../services/stripe.service');
const stripeService = new StripeService();

/**
 * Stripe Webhook Middleware
 * Verifies and processes incoming Stripe webhooks
 */
const stripeWebhook = async (req, res, next) => {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    if (!signature) {
        return res.status(400).json({ error: 'Stripe signature is required' });
    }

    try {
        // Verify webhook signature
        const verificationResult = await stripeService.verifyWebhook(payload, signature);
        
        if (!verificationResult.success) {
            return res.status(400).json({ error: 'Invalid webhook signature' });
        }

        const event = verificationResult.event;
        
        // Attach event to request for further processing
        req.stripeEvent = event;
        
        console.log(`Webhook received: ${event.type}`);
        
        next();
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(400).json({ error: 'Webhook processing failed' });
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
        
        // Get payment details for email notifications
        const paymentResult = await pool.query(`
          SELECT p.*, q.title as quote_title, q.service_type,
                 v.name as vendor_name, v.email as vendor_email,
                 c.name as customer_name, c.email as customer_email
          FROM payments p
          JOIN quotes q ON p.quote_id = q.id
          JOIN users v ON p.vendor_id = v.id
          JOIN users c ON q.customer_id = c.id
          WHERE p.stripe_payment_intent_id = $1
        `, [paymentIntent.id]);
        
        // Send email notifications
        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0];
          const EmailService = require('../services/email.service');
          const emailService = new EmailService();
          
          if (emailService) {
            // Send confirmation to vendor
            await emailService.sendEmail({
              to: payment.vendor_email,
              subject: `💰 Payment Released - ${payment.service_type} Project`,
              html: `
                <h2>✅ Payment Released!</h2>
                <p>Hi ${payment.vendor_name},</p>
                <p>Payment of £${(payment.amount / 100).toFixed(2)} has been successfully released to you for ${payment.service_type} project.</p>
                
                <div style="background: #059669; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>🎉 Project Complete!</h3>
                  <ul>
                    <li>✅ Funds transferred to your account</li>
                    <li>✅ Project marked as completed</li>
                    <li>📝 Leave a review opportunity available</li>
                    <li>⭐ Both parties can now leave reviews</li>
                  </ul>
                </div>
                
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>📞 Next Steps:</h3>
                  <ul>
                    <li>You can continue working on your next projects</li>
                    <li>${payment.customer_name} can use TradeMatch for future projects</li>
                    <li>Both parties benefit from positive reviews</li>
                  </ul>
                </div>
                
                <p><strong>Payment Details:</strong></p>
                <ul>
                  <li>Amount: £${(payment.amount / 100).toFixed(2)}</li>
                  <li>Quote ID: ${payment.quote_id}</li>
                  <li>Service: ${payment.service_type}</li>
                </ul>
                  
                <p>Thank you for using TradeMatch for your business!</p>
                <p>Best regards,<br>The TradeMatch Team</p>
              `,
              text: `Payment of £${(payment.amount / 100).toFixed(2)} released to you for ${payment.service_type} project.`
            });
            
            // Send confirmation to customer
            await emailService.sendEmail({
              to: payment.customer_email,
              subject: `✅ Project Completed - ${payment.service_type} Project`,
              html: `
                <h2>✅ Payment Released!</h2>
                <p>Hi ${payment.customer_name},</p>
                <p>Payment of £${(payment.amount / 100).toFixed(2)} has been successfully released to ${payment.vendor_name} for ${payment.service_type} project.</p>
                
                <div style="background: #059669; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>🎉 Project Complete!</h3>
                  <ul>
                    <li>✅ Funds transferred to vendor</li>
                    <li>✅ Project marked as completed</li>
                    <li>📝 Leave a review for ${payment.vendor_name}</li>
                    <li>⭐ Both parties can now leave reviews</li>
                  </ul>
                </div>
                
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>📞 Next Steps:</h3>
                  <ul>
                    <li>${payment.vendor_name} can continue working on their next projects</li>
                    <li>${payment.customer_name} can use TradeMatch for future projects</li>
                    <li>Both parties benefit from positive reviews</li>
                  </ul>
                </div>
                
                <p><strong>Payment Details:</strong></p>
                <ul>
                  <li>Amount: £${(payment.amount / 100).toFixed(2)}</li>
                  <li>Quote ID: ${payment.quote_id}</li>
                  <li>Service: ${payment.service_type}</li>
                </ul>
                  
                <p>Thank you for using TradeMatch for your project needs!</p>
                <p>Best regards,<br>The TradeMatch Team</p>
              `,
              text: `${payment.vendor_name} has been paid and your ${payment.service_type} project is marked as complete.`
            });
            
            console.log(`📧 Payment completion emails sent for payment ${paymentIntent.id}`);
          }
        }
        
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