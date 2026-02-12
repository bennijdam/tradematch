/**
 * Lead System Integration Service
 * 
 * Orchestrates the complete flow when a new quote is created:
 * 1. Score the lead (qualification)
 * 2. Calculate the cost (pricing)
 * 3. Distribute to vendors (matching)
 * 4. Send notifications
 * 5. Record analytics
 */

const axios = require('axios');
const LeadQualificationService = require('./lead-qualification.service');
const LeadPricingService = require('./lead-pricing.service');
const LeadDistributionService = require('./lead-distribution.service');

class LeadSystemIntegrationService {
    constructor(pool, emailService) {
        this.pool = pool;
        this.emailService = emailService;
        this.qualificationService = new LeadQualificationService(pool);
        this.pricingService = new LeadPricingService(pool);
        this.distributionService = new LeadDistributionService(pool);
        this.leadAnalyticsColumns = null;
    }

    async getLeadAnalyticsColumns() {
        if (this.leadAnalyticsColumns) return this.leadAnalyticsColumns;

        try {
            const result = await this.pool.query(
                `SELECT column_name
                 FROM information_schema.columns
                 WHERE table_name = 'lead_analytics_daily'`
            );
            this.leadAnalyticsColumns = new Set(result.rows.map((row) => row.column_name));
        } catch (error) {
            console.warn('Lead analytics column lookup failed:', error.message);
            this.leadAnalyticsColumns = new Set();
        }

        return this.leadAnalyticsColumns;
    }

    /**
     * Process a new quote through the complete lead system
     * Called from quote creation endpoint
     */
    async processNewLead(quote, customer) {
        try {
            console.log(`🔄 Processing new lead: Quote #${quote.id}`);

            // Step 1: Qualify the lead
            console.log('  📊 Step 1: Qualifying lead...');
            const qualificationScore = await this.qualificationService.scoreQuote(quote, customer);
            await this.qualificationService.saveQualificationScore(quote.id, qualificationScore);
            
            console.log(`  ✅ Lead qualified: ${qualificationScore.overall}/100 (${qualificationScore.tier})`);

            // Step 2: Calculate lead cost
            console.log('  💰 Step 2: Calculating price...');
            const pricingData = await this.pricingService.calculateLeadPrice(
                quote,
                qualificationScore.overall
            );
            
            console.log(`  ✅ Lead priced at £${pricingData.finalPrice}`);

            // Step 3: Distribute lead to vendors
            console.log('  🎯 Step 3: Distributing to vendors...');
            const distributions = await this.distributionService.distributeLead(
                quote,
                qualificationScore.overall,
                pricingData.finalPrice
            );

            if (distributions.length === 0) {
                console.warn(`  ⚠️ No vendors available for this lead`);
                return {
                    success: false,
                    message: 'No qualified vendors available',
                    quote_id: quote.id,
                    qualification: qualificationScore,
                    pricing: pricingData,
                    distributions: []
                };
            }

            console.log(`  ✅ Lead distributed to ${distributions.length} vendors`);

            // Step 4: Send notifications to vendors
            console.log('  📧 Step 4: Sending vendor notifications...');
            const notificationResults = await this.notifyVendors(
                quote,
                customer,
                qualificationScore,
                pricingData,
                distributions
            );

            // Step 5: Send confirmation to customer
            console.log('  📧 Sending customer confirmation...');
            await this.notifyCustomer(quote, customer, distributions.length);

            // Step 6: Record analytics event
            console.log('  📈 Step 6: Recording analytics...');
            await this.recordLeadCreatedAnalytics(quote, qualificationScore, pricingData, distributions.length);

            console.log(`✅ Lead processing complete: Quote #${quote.id}`);

            return {
                success: true,
                quote_id: quote.id,
                qualification: qualificationScore,
                pricing: pricingData,
                distributions: distributions,
                notifications: notificationResults
            };

        } catch (error) {
            console.error('❌ Error processing lead:', error);
            return {
                success: false,
                error: error.message,
                quote_id: quote.id
            };
        }
    }

    /**
     * Send notifications to matched vendors
     */
    async notifyVendors(quote, customer, qualification, pricing, distributions) {
        const results = [];

        for (const dist of distributions) {
            try {
                // Only notify if email service is available
                if (this.emailService && this.emailService.sendVendorNewLead) {
                    await this.emailService.sendVendorNewLead({
                        vendor_id: dist.vendorId,
                        quote_id: quote.id,
                        service_type: quote.serviceType,
                        title: quote.title,
                        location: quote.postcode,
                        budget_min: quote.budgetMin,
                        budget_max: quote.budgetMax,
                        cost: pricing.finalPrice,
                        quality_tier: qualification.tier,
                        match_score: dist.matchScore,
                        customer_name: `${customer.first_name} ${customer.last_name}`,
                        priority: dist.matchScore > 80 ? 'high' : 'standard'
                    });

                    results.push({
                        vendor_id: dist.vendorId,
                        notified: true
                    });
                } else {
                    // Log that notification would have been sent
                    console.log(`📧 Would notify vendor ${dist.vendorId} about lead ${quote.id}`);
                    results.push({
                        vendor_id: dist.vendorId,
                        notified: false,
                        reason: 'email_service_unavailable'
                    });
                }
            } catch (error) {
                console.error(`Error notifying vendor ${dist.vendorId}:`, error);
                results.push({
                    vendor_id: dist.vendorId,
                    notified: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Send confirmation to customer that their lead is posted
     */
    async notifyCustomer(quote, customer, vendorCount) {
        try {
            if (!customer || !customer.id) {
                return;
            }

            if (this.emailService && this.emailService.sendCustomerLeadConfirm) {
                await this.emailService.sendCustomerLeadConfirm({
                    customer_id: customer.id,
                    quote_id: quote.id,
                    service_type: quote.serviceType,
                    vendor_count: vendorCount,
                    posted_at: new Date().toISOString()
                });
            } else {
                const backendUrl = process.env.BACKEND_URL || process.env.BASE_URL || 'http://localhost:5000';
                await axios.post(`${backendUrl}/api/email/lead-customer-confirmation`, {
                    customerId: customer.id,
                    quoteId: quote.id,
                    vendorCount,
                    serviceType: quote.serviceType
                });
            }
        } catch (error) {
            console.error('Error notifying customer:', error);
        }
    }

    /**
     * Record analytics event for dashboard
     */
    async recordLeadCreatedAnalytics(quote, qualification, pricing, vendorCount) {
        try {
            const columns = await this.getLeadAnalyticsColumns();
            if (!columns.has('customer_id')) {
                console.warn('Skipping lead analytics insert: lead_analytics_daily.customer_id missing');
                return;
            }

            const customerId = quote.customer_id || quote.customerId || quote.user_id || null;
            if (!customerId) {
                console.warn('Skipping lead analytics insert: customer id missing on quote');
                return;
            }

            await this.pool.query(
                `INSERT INTO lead_analytics_daily (
                    customer_id, analytics_date, service_type, quality_score, quality_tier,
                    estimated_lead_cost, vendor_count_offered,
                    location, leads_posted, created_at
                ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, 1, NOW())
                ON CONFLICT (customer_id, analytics_date)
                DO UPDATE SET
                    leads_posted = lead_analytics_daily.leads_posted + 1`,
                [
                    customerId,
                    quote.serviceType,
                    qualification.overall,
                    qualification.tier,
                    pricing.finalPrice,
                    vendorCount,
                    quote.postcode
                ]
            );
        } catch (error) {
            console.error('Error recording analytics:', error);
        }
    }

    /**
     * Refund a lead if it's invalid or customer unresponsive
     */
    async refundLead(quoteId, vendorId, reason) {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get distribution record
            const distResult = await client.query(
                `SELECT * FROM lead_distributions 
                 WHERE quote_id = $1 AND vendor_id = $2`,
                [quoteId, vendorId]
            );

            if (distResult.rows.length === 0) {
                throw new Error('Distribution not found');
            }

            const distribution = distResult.rows[0];
            const refundAmount = this.pricingService.calculateRefundAmount(
                distribution.lead_cost,
                reason
            );

            // 2. Refund credits to vendor
            if (refundAmount > 0) {
                await client.query(
                    `UPDATE vendor_credits 
                     SET balance = balance + $1,
                         total_refunded = total_refunded + $1
                     WHERE vendor_id = $2`,
                    [refundAmount, vendorId]
                );

                // 3. Record refund transaction
                await client.query(
                    `INSERT INTO credit_transactions (
                        vendor_id, transaction_type, amount, 
                        reference_id, description
                    ) VALUES ($1, 'lead_refund', $2, $3, $4)`,
                    [
                        vendorId,
                        refundAmount,
                        quoteId,
                        `Refund for quote ${quoteId}: ${reason}`
                    ]
                );
            }

            // 4. Mark distribution as refunded
            await client.query(
                `UPDATE lead_distributions 
                 SET refunded = TRUE, 
                     refund_amount = $1,
                     refund_reason = $2,
                     refunded_at = NOW()
                 WHERE quote_id = $1 AND vendor_id = $2`,
                [refundAmount, reason, quoteId, vendorId]
            );

            await client.query('COMMIT');

            console.log(`✅ Refunded vendor ${vendorId} £${refundAmount} for lead ${quoteId} (${reason})`);

            return {
                success: true,
                refundAmount,
                reason
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error refunding lead:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get lead system summary for vendor dashboard
     */
    async getLeadSystemSummary(vendorId) {
        try {
            // Get credit balance
            const creditsResult = await this.pool.query(
                'SELECT * FROM vendor_credits WHERE vendor_id = $1',
                [vendorId]
            );

            const credits = creditsResult.rows[0] || {
                balance: 0,
                total_purchased: 0,
                total_spent: 0
            };

            // Get today's available leads
            const availableResult = await this.pool.query(
                `SELECT COUNT(*) as count FROM lead_distributions ld
                 WHERE ld.vendor_id = $1 AND ld.accessed = false AND ld.charged = false
                 AND ld.notified_at > NOW() - INTERVAL '24 hours'`,
                [vendorId]
            );

            const availableLeads = parseInt(availableResult.rows[0]?.count || 0);

            // Get this week's stats
            const weekStatsResult = await this.pool.query(
                `SELECT 
                    COUNT(DISTINCT ld.id) as leads_accessed,
                    COUNT(DISTINCT b.id) as bids_submitted,
                    COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'accepted') as jobs_won,
                    SUM(ld.lead_cost) as total_spent
                 FROM lead_distributions ld
                 LEFT JOIN bids b ON ld.quote_id = b.quote_id AND b.vendor_id = $1
                 WHERE ld.vendor_id = $1 AND ld.accessed = true
                 AND ld.accessed_at > NOW() - INTERVAL '7 days'`,
                [vendorId]
            );

            const weekStats = weekStatsResult.rows[0] || {
                leads_accessed: 0,
                bids_submitted: 0,
                jobs_won: 0,
                total_spent: 0
            };

            return {
                credits: {
                    available: credits.balance,
                    totalPurchased: credits.total_purchased,
                    totalSpent: credits.total_spent
                },
                leads: {
                    availableToday: availableLeads,
                    accessedThisWeek: parseInt(weekStats.leads_accessed),
                    bidsThisWeek: parseInt(weekStats.bids_submitted),
                    winsThisWeek: parseInt(weekStats.jobs_won),
                    spentThisWeek: parseFloat(weekStats.total_spent || 0)
                }
            };
        } catch (error) {
            console.error('Error getting lead summary:', error);
            return null;
        }
    }
}

module.exports = LeadSystemIntegrationService;
