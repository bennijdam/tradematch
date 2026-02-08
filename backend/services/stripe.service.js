const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
    constructor() {
        this.stripe = stripe;
    }

    /**
     * Create a Payment Intent
     * @param {Object} paymentData - Payment data
     * @param {number} paymentData.amount - Amount in pounds
     * @param {string} paymentData.currency - Currency code (default: 'gbp')
     * @param {string} paymentData.description - Payment description
     * @param {Object} paymentData.metadata - Additional metadata
     * @returns {Promise<Object>} Payment intent object
     */
    async createPaymentIntent(paymentData) {
        try {
            const { amount, currency = 'gbp', description, metadata = {} } = paymentData;
            
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to pence
                currency,
                description,
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            return {
                success: true,
                paymentIntent
            };
        } catch (error) {
            console.error('Stripe Payment Intent creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Confirm a Payment Intent
     * @param {string} paymentIntentId - Payment Intent ID
     * @returns {Promise<Object>} Payment intent status
     */
    async confirmPayment(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            return {
                success: true,
                status: paymentIntent.status,
                paymentIntent
            };
        } catch (error) {
            console.error('Stripe Payment confirmation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a Transfer to vendor's connected account
     * @param {Object} transferData - Transfer data
     * @param {number} transferData.amount - Amount in pounds
     * @param {string} transferData.destination - Vendor's Stripe account ID
     * @param {Object} transferData.metadata - Additional metadata
     * @returns {Promise<Object>} Transfer object
     */
    async createTransfer(transferData) {
        try {
            const { amount, destination, metadata = {} } = transferData;
            
            const transfer = await this.stripe.transfers.create({
                amount: Math.round(amount * 100), // Convert to pence
                currency: 'gbp',
                destination,
                metadata,
            });

            return {
                success: true,
                transfer
            };
        } catch (error) {
            console.error('Stripe Transfer creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a Connected Account for vendor
     * @param {Object} accountData - Vendor account data
     * @param {string} accountData.email - Vendor email
     * @param {string} accountData.country - Vendor country (default: 'GB')
     * @param {Object} accountData.businessProfile - Business profile information
     * @returns {Promise<Object>} Connected account object
     */
    async createConnectedAccount(accountData) {
        try {
            const { email, country = 'GB', businessProfile = {} } = accountData;
            
            const account = await this.stripe.accounts.create({
                type: 'express',
                country,
                email,
                business_profile: {
                    name: businessProfile.name || email,
                    ...businessProfile
                },
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            return {
                success: true,
                account
            };
        } catch (error) {
            console.error('Stripe Connected Account creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create Account Link for vendor onboarding
     * @param {string} accountId - Stripe account ID
     * @param {string} returnUrl - Return URL after onboarding
     * @param {string} refreshUrl - Refresh URL if session expires
     * @returns {Promise<Object>} Account link object
     */
    async createAccountLink(accountId, returnUrl, refreshUrl) {
        try {
            const accountLink = await this.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding',
            });

            return {
                success: true,
                accountLink
            };
        } catch (error) {
            console.error('Stripe Account Link creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retrieve Charge details
     * @param {string} chargeId - Stripe charge ID
     * @returns {Promise<Object>} Charge object
     */
    async retrieveCharge(chargeId) {
        try {
            const charge = await this.stripe.charges.retrieve(chargeId);
            
            return {
                success: true,
                charge
            };
        } catch (error) {
            console.error('Stripe Charge retrieval error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retrieve Stripe account details
     * @param {string} accountId - Stripe account ID
     * @returns {Promise<Object>} Account object
     */
    async retrieveAccount(accountId) {
        try {
            const account = await this.stripe.accounts.retrieve(accountId);

            return {
                success: true,
                account
            };
        } catch (error) {
            console.error('Stripe Account retrieval error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a Refund
     * @param {Object} refundData - Refund data
     * @param {string} refundData.chargeId - Charge ID to refund
     * @param {number} refundData.amount - Amount to refund in pounds
     * @param {string} refundData.reason - Refund reason
     * @returns {Promise<Object>} Refund object
     */
    async createRefund(refundData) {
        try {
            const { chargeId, amount, reason } = refundData;
            
            const refundData = {
                charge: chargeId,
                reason
            };

            if (amount) {
                refundData.amount = Math.round(amount * 100); // Convert to pence
            }

            const refund = await this.stripe.refunds.create(refundData);

            return {
                success: true,
                refund
            };
        } catch (error) {
            console.error('Stripe Refund creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get Account Balance
     * @returns {Promise<Object>} Balance object
     */
    async getBalance() {
        try {
            const balance = await this.stripe.balance.retrieve();
            
            return {
                success: true,
                balance
            };
        } catch (error) {
            console.error('Stripe Balance retrieval error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Webhook signature verification
     * @param {string} payload - Raw request body
     * @param {string} signature - Stripe signature header
     * @returns {Promise<Object>} Event object
     */
    async verifyWebhook(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );

            return {
                success: true,
                event
            };
        } catch (error) {
            console.error('Stripe webhook verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create Customer
     * @param {Object} customerData - Customer data
     * @param {string} customerData.email - Customer email
     * @param {string} customerData.name - Customer name
     * @param {Object} customerData.metadata - Additional metadata
     * @returns {Promise<Object>} Customer object
     */
    async createCustomer(customerData) {
        try {
            const { email, name, metadata = {} } = customerData;
            
            const customer = await this.stripe.customers.create({
                email,
                name,
                metadata,
            });

            return {
                success: true,
                customer
            };
        } catch (error) {
            console.error('Stripe Customer creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = StripeService;