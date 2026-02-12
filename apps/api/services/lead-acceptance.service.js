/**
 * Lead Acceptance Service
 * 
 * Handles the "Hidden Lead Preview + Accept" model:
 * - Vendors receive lead previews with hidden details
 * - Vendors must explicitly ACCEPT before being charged
 * - Payment happens AFTER acceptance
 * - Optional auto-accept mode (opt-in)
 * - Lead lifecycle management (OFFERED → ACCEPTED/DECLINED/EXPIRED)
 */

const crypto = require('crypto');

class LeadAcceptanceService {
    constructor(pool) {
        this.pool = pool;
        this.LEAD_EXPIRY_HOURS = 24; // Leads expire after 24 hours
    }

    /**
     * Generate lead preview (hides sensitive customer details)
     * Shows only: area, category, budget, timeframe, price
     */
    async generateLeadPreview(quoteId) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    q.id,
                    q.service_type,
                    SUBSTRING(q.postcode FROM 1 FOR POSITION(' ' IN q.postcode)) as postcode_sector,
                    q.budget_min,
                    q.budget_max,
                    q.urgency,
                    q.created_at,
                    lqs.overall_quality_score,
                    lqs.qualification_level
                FROM quotes q
                LEFT JOIN lead_qualification_scores lqs ON q.id = lqs.quote_id
                WHERE q.id = $1
            `, [quoteId]);

            if (result.rows.length === 0) {
                throw new Error('Quote not found');
            }

            const quote = result.rows[0];

            return {
                quoteId: quote.id,
                category: quote.service_type,
                area: quote.postcode_sector || 'Unknown',
                budgetRange: quote.budget_min && quote.budget_max 
                    ? `£${quote.budget_min} - £${quote.budget_max}`
                    : 'Budget not specified',
                timeframe: quote.urgency || 'Flexible',
                qualityScore: quote.overall_quality_score || 'N/A',
                qualityTier: quote.qualification_level || 'standard',
                postedAt: quote.created_at
            };
        } catch (error) {
            console.error('Generate lead preview error:', error);
            throw error;
        }
    }

    /**
     * Check if vendor can accept a lead (balance, limits, etc.)
     */
    async canAcceptLead(vendorId, leadPrice) {
        try {
            // Check credit balance
            const creditResult = await this.pool.query(
                'SELECT available_credits FROM vendor_credits WHERE vendor_id = $1',
                [vendorId]
            );

            if (creditResult.rows.length === 0 || creditResult.rows[0].available_credits < leadPrice) {
                return {
                    canAccept: false,
                    reason: 'Insufficient credits. Please purchase more credits to access this lead.'
                };
            }

            // Check spend limits
            const limitResult = await this.pool.query(
                'SELECT * FROM vendor_spend_limits WHERE vendor_id = $1',
                [vendorId]
            );

            if (limitResult.rows.length > 0) {
                const limits = limitResult.rows[0];
                
                if (limits.daily_spent + leadPrice > limits.daily_spend_limit) {
                    return {
                        canAccept: false,
                        reason: 'Daily spend limit exceeded. Limit will reset tomorrow.'
                    };
                }

                if (limits.weekly_spent + leadPrice > limits.weekly_spend_limit) {
                    return {
                        canAccept: false,
                        reason: 'Weekly spend limit exceeded. Limit will reset next week.'
                    };
                }
            }

            return { canAccept: true };

        } catch (error) {
            console.error('Check acceptance eligibility error:', error);
            throw error;
        }
    }

    /**
     * Vendor accepts a lead
     * 1. Verify lead is still available
     * 2. Check credit balance and limits
     * 3. Charge the lead fee
     * 4. Unlock full job details
     * 5. Update lead state to ACCEPTED
     */
    async acceptLead(quoteId, vendorId, autoAccepted = false) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Get lead distribution record
            const distResult = await client.query(`
                SELECT ld.*, lqs.overall_quality_score
                FROM lead_distributions ld
                LEFT JOIN lead_qualification_scores lqs ON ld.quote_id = lqs.quote_id
                WHERE ld.quote_id = $1 AND ld.vendor_id = $2
            `, [quoteId, vendorId]);

            if (distResult.rows.length === 0) {
                throw new Error('Lead not found or not offered to this vendor');
            }

            const distribution = distResult.rows[0];

            // 2. Check lead state
            if (distribution.lead_state !== 'offered') {
                throw new Error(`Lead is not available (current state: ${distribution.lead_state})`);
            }

            // 3. Check expiration
            if (new Date() > new Date(distribution.expires_at)) {
                await client.query(
                    'UPDATE lead_distributions SET lead_state = $1 WHERE id = $2',
                    ['expired', distribution.id]
                );
                throw new Error('Lead has expired');
            }

            // 4. Check if vendor can accept
            const eligibility = await this.canAcceptLead(vendorId, distribution.credits_charged);
            if (!eligibility.canAccept) {
                throw new Error(eligibility.reason);
            }

            // 5. Charge credits
            await client.query(`
                UPDATE vendor_credits 
                SET available_credits = available_credits - $1,
                    total_spent_credits = total_spent_credits + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE vendor_id = $2
            `, [distribution.credits_charged, vendorId]);

            // 5b. Record finance ledger entry if schema exists
            try {
                const ledgerCheck = await client.query(
                    `SELECT to_regclass('public.finance_ledger_entries') AS table_exists`
                );
                if (ledgerCheck.rows[0]?.table_exists) {
                    const ledgerId = crypto.randomUUID();
                    const idempotencyKey = `lead_acceptance:${quoteId}:${vendorId}`;
                    await client.query(
                        `INSERT INTO finance_ledger_entries
                            (id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_by, idempotency_key, metadata)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                        [
                            ledgerId,
                            null,
                            vendorId,
                            Math.round(parseFloat(distribution.credits_charged) * 100) * -1,
                            'GBP',
                            'credit_consumed',
                            'lead_acceptance',
                            vendorId,
                            idempotencyKey,
                            JSON.stringify({ quoteId, vendorId })
                        ]
                    );
                }
            } catch (ledgerError) {
                console.warn('Finance ledger entry skipped:', ledgerError.message);
            }

            // 6. Update spend limits
            const existingLimits = await client.query(
                'SELECT 1 FROM vendor_spend_limits WHERE vendor_id = $1',
                [vendorId]
            );

            if (existingLimits.rows.length > 0) {
                await client.query(`
                    UPDATE vendor_spend_limits
                    SET daily_spent = daily_spent + $2,
                        weekly_spent = weekly_spent + $2,
                        monthly_spent = monthly_spent + $2,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vendor_id = $1
                `, [vendorId, distribution.credits_charged]);
            } else {
                await client.query(`
                    INSERT INTO vendor_spend_limits (vendor_id, daily_spent, weekly_spent, monthly_spent)
                    VALUES ($1, $2, $2, $2)
                `, [vendorId, distribution.credits_charged]);
            }

            // 7. Update lead distribution to ACCEPTED
            await client.query(`
                UPDATE lead_distributions 
                SET lead_state = 'accepted',
                    accepted_at = CURRENT_TIMESTAMP,
                    payment_charged = TRUE,
                    view_count = view_count + 1,
                    viewed_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [distribution.id]);

            // 8. Log acceptance
            await client.query(`
                INSERT INTO lead_acceptance_log (
                    quote_id, vendor_id, action, lead_state_before, lead_state_after,
                    payment_amount, payment_success, auto_accepted, match_score
                ) VALUES ($1, $2, 'accept', 'offered', 'accepted', $3, TRUE, $4, $5)
            `, [quoteId, vendorId, distribution.credits_charged, autoAccepted, distribution.match_score]);

            // 9. Get full quote details (now unlocked)
            const quoteResult = await client.query(`
                SELECT q.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
                FROM quotes q
                LEFT JOIN users u ON q.customer_id = u.id
                WHERE q.id = $1
            `, [quoteId]);

            await client.query('COMMIT');

            console.log(`✅ Lead ${quoteId} accepted by vendor ${vendorId} (${autoAccepted ? 'auto' : 'manual'})`);

            return {
                success: true,
                message: 'Lead accepted successfully',
                creditsCharged: distribution.credits_charged,
                fullDetails: quoteResult.rows[0] || null
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Accept lead error:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Vendor declines a lead
     * No charge, lead may be offered to next vendor
     */
    async declineLead(quoteId, vendorId, reason = null) {
        try {
            // 1. Get lead distribution
            const distResult = await this.pool.query(
                'SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
                [quoteId, vendorId]
            );

            if (distResult.rows.length === 0) {
                throw new Error('Lead not found');
            }

            const distribution = distResult.rows[0];

            if (distribution.lead_state !== 'offered') {
                throw new Error('Lead cannot be declined (not in offered state)');
            }

            // 2. Update to DECLINED
            await this.pool.query(`
                UPDATE lead_distributions 
                SET lead_state = 'declined',
                    declined_at = CURRENT_TIMESTAMP,
                    declined_reason = $1
                WHERE id = $2
            `, [reason, distribution.id]);

            // 3. Log decline
            await this.pool.query(`
                INSERT INTO lead_acceptance_log (
                    quote_id, vendor_id, action, lead_state_before, lead_state_after,
                    payment_amount, payment_success, reason
                ) VALUES ($1, $2, 'decline', 'offered', 'declined', 0, FALSE, $3)
            `, [quoteId, vendorId, reason]);

            console.log(`❌ Lead ${quoteId} declined by vendor ${vendorId}`);

            return {
                success: true,
                message: 'Lead declined'
            };

        } catch (error) {
            console.error('Decline lead error:', error);
            throw error;
        }
    }

    /**
     * Check auto-accept rules and automatically accept if criteria met
     */
    async checkAutoAcceptRules(quoteId, vendorId, leadPrice, matchScore, distance) {
        try {
            const result = await this.pool.query(`
                SELECT * FROM vendor_auto_accept_rules
                WHERE vendor_id = $1 AND enabled = TRUE
            `, [vendorId]);

            if (result.rows.length === 0) {
                return { shouldAutoAccept: false };
            }

            const rules = result.rows[0];

            // Check all criteria
            const meetsScore = matchScore >= (rules.min_match_score || 0);
            const meetsPrice = !rules.max_lead_price || leadPrice <= rules.max_lead_price;
            const meetsDistance = !rules.max_distance_miles || distance <= rules.max_distance_miles;

            if (meetsScore && meetsPrice && meetsDistance) {
                return {
                    shouldAutoAccept: true,
                    rules: rules
                };
            }

            return { shouldAutoAccept: false };

        } catch (error) {
            console.error('Check auto-accept rules error:', error);
            return { shouldAutoAccept: false };
        }
    }

    /**
     * Expire old leads that weren't accepted
     */
    async expireOldLeads() {
        try {
            const result = await this.pool.query(`
                UPDATE lead_distributions 
                SET lead_state = 'expired'
                WHERE lead_state = 'offered' 
                AND expires_at < CURRENT_TIMESTAMP
                RETURNING id, quote_id, vendor_id
            `);

            if (result.rows.length > 0) {
                console.log(`⏰ Expired ${result.rows.length} old leads`);
            }

            return result.rows;

        } catch (error) {
            console.error('Expire leads error:', error);
            throw error;
        }
    }

    /**
     * Get vendor's offered leads (not yet accepted/declined)
     */
    async getOfferedLeads(vendorId) {
        try {
            const result = await this.pool.query(`
                SELECT 
                    ld.id,
                    ld.quote_id,
                    ld.match_score,
                    ld.distance_miles,
                    ld.credits_charged as lead_price,
                    ld.distribution_order,
                    ld.distributed_at,
                    ld.expires_at,
                    q.service_type,
                    SUBSTRING(q.postcode FROM 1 FOR POSITION(' ' IN q.postcode)) as area,
                    q.budget_min,
                    q.budget_max,
                    q.urgency,
                    lqs.overall_quality_score,
                    lqs.qualification_level
                FROM lead_distributions ld
                JOIN quotes q ON ld.quote_id = q.id
                LEFT JOIN lead_qualification_scores lqs ON q.id = lqs.quote_id
                WHERE ld.vendor_id = $1 
                AND ld.lead_state = 'offered'
                AND ld.expires_at > CURRENT_TIMESTAMP
                ORDER BY ld.distributed_at DESC
            `, [vendorId]);

            return result.rows;

        } catch (error) {
            console.error('Get offered leads error:', error);
            throw error;
        }
    }
}

module.exports = LeadAcceptanceService;
