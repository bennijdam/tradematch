const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
    // Create payment intent
    async createPaymentIntent({ amount, currency = 'gbp', metadata = {} }) {
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
                payment_method_types: ['card', 'link', 'apple_pay', 'google_pay'],
            });
            
            return paymentIntent;
        } catch (error) {
            console.error('Stripe payment intent error:', error);
            throw error;
        }
    }
    
    // Retrieve payment intent
    async retrievePaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Stripe retrieve error:', error);
            throw error;
        }
    }
    
    // Create transfer to vendor
    async createTransfer({ amount, destination, metadata = {} }) {
        try {
            const transfer = await stripe.transfers.create({
                amount,
                currency: 'gbp',
                destination,
                metadata,
            });
            
            return transfer;
        } catch (error) {
            console.error('Stripe transfer error:', error);
            throw error;
        }
    }
    
    // Create connected account for vendor
    async createConnectedAccount({ email, businessName, userId }) {
        try {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'GB',
                email,
                business_profile: {
                    name: businessName,
                },
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: {
                    userId,
                },
            });
            
            return account;
        } catch (error) {
            console.error('Stripe connected account error:', error);
            throw error;
        }
    }
    
    // Create account link for onboarding
    async createAccountLink(accountId) {
        try {
            const accountLink = await stripe.accountLinks.create({
                account: accountId,
                refresh_url: `${process.env.FRONTEND_URL}/vendor/onboarding-refresh`,
                return_url: `${process.env.FRONTEND_URL}/vendor/onboarding-complete`,
                type: 'account_onboarding',
            });
            
            return accountLink;
        } catch (error) {
            console.error('Stripe account link error:', error);
            throw error;
        }
    }
    
    // Process webhook event
    async processWebhook(event) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentFailed(event.data.object);
                break;
            case 'transfer.completed':
                await this.handleTransferCompleted(event.data.object);
                break;
            case 'account.updated':
                await this.handleAccountUpdated(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    }
    
    // Handle successful payment
    async handlePaymentSucceeded(paymentIntent) {
        try {
            // Update database
            await pool.query(
                `UPDATE payments 
                 SET status = 'completed', paid_at = CURRENT_TIMESTAMP
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
            );
            
            console.log(`Payment succeeded: ${paymentIntent.id}`);
        } catch (error) {
            console.error('Handle payment succeeded error:', error);
        }
    }
    
    // Handle failed payment
    async handlePaymentFailed(paymentIntent) {
        try {
            await pool.query(
                `UPDATE payments 
                 SET status = 'failed'
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
            );
            
            console.log(`Payment failed: ${paymentIntent.id}`);
        } catch (error) {
            console.error('Handle payment failed error:', error);
        }
    }
    
    // Handle completed transfer
    async handleTransferCompleted(transfer) {
        try {
            await pool.query(
                `UPDATE escrow_releases 
                 SET status = 'completed', released_at = CURRENT_TIMESTAMP
                 WHERE stripe_transfer_id = $1`,
                [transfer.id]
            );
            
            console.log(`Transfer completed: ${transfer.id}`);
        } catch (error) {
            console.error('Handle transfer completed error:', error);
        }
    }
    
    // Handle account updated
    async handleAccountUpdated(account) {
        try {
            await pool.query(
                `UPDATE users 
                 SET stripe_account_status = $1, stripe_account_id = $2
                 WHERE stripe_account_id = $2`,
                [account.payouts_enabled ? 'verified' : 'pending', account.id]
            );
            
            console.log(`Account updated: ${account.id}, status: ${account.payouts_enabled ? 'verified' : 'pending'}`);
        } catch (error) {
            console.error('Handle account updated error:', error);
        }
    }
    
    // Get payment methods
    async getPaymentMethods(customerId) {
        try {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });
            
            return paymentMethods.data;
        } catch (error) {
            console.error('Get payment methods error:', error);
            throw error;
        }
    }
    
    // Create refund
    async createRefund({ paymentIntentId, amount, reason }) {
        try {
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount,
                reason,
            });
            
            return refund;
        } catch (error) {
            console.error('Create refund error:', error);
            throw error;
        }
    }
}

module.exports = new StripeService();