/**
 * Lead Qualification Service
 * 
 * Scores leads 0-100 based on multiple quality factors
 * TradeMatch Premium: Only high-quality leads distributed to vendors
 */

class LeadQualificationService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Score a lead across multiple dimensions
     * @param {Object} quote - The quote/job posting
     * @param {Object} customer - Customer details
     * @returns {Object} Qualification scores and tier
     */
    async scoreQuote(quote, customer) {
        const scores = {
            budget: this.scoreBudget(quote),
            detail: this.scoreDetail(quote),
            urgency: this.scoreUrgency(quote),
            customer: await this.scoreCustomer(customer),
            location: this.scoreLocation(quote)
        };

        const overall = Object.values(scores).reduce((sum, score) => sum + score, 0);
        const tier = this.determineQualityTier(overall);

        return {
            overall,
            ...scores,
            tier,
            metadata: {
                hasBudget: !!quote.budgetMin || !!quote.budgetMax,
                hasPhotos: (quote.photos && quote.photos.length > 0),
                descriptionLength: quote.description?.length || 0,
                customerVerified: customer.email_verified || false
            }
        };
    }

    /**
     * Budget Score (0-20 points)
     * - Has both min/max budget: 20pts
     * - Has one budget figure: 15pts
     * - Has budget range text: 10pts
     * - No budget: 0pts
     */
    scoreBudget(quote) {
        if (quote.budgetMin && quote.budgetMax) {
            // Full range provided
            const range = quote.budgetMax - quote.budgetMin;
            const midpoint = (quote.budgetMax + quote.budgetMin) / 2;
            
            // Bonus for reasonable range (not too wide)
            const rangeRatio = range / midpoint;
            if (rangeRatio < 0.5) return 20; // Tight range
            if (rangeRatio < 1.0) return 18; // Reasonable range
            return 15; // Wide range
        }
        
        if (quote.budgetMin || quote.budgetMax) {
            return 15; // One budget figure
        }
        
        if (quote.budgetDescription || quote.description?.includes('£')) {
            return 10; // Some budget indication in text
        }
        
        return 0; // No budget information
    }

    /**
     * Detail Score (0-20 points)
     * - Photos included: +5pts
     * - Long description (>300 chars): +10pts
     * - Medium description (100-300): +7pts
     * - Short description (<100): +3pts
     * - Specific requirements listed: +5pts
     */
    scoreDetail(quote) {
        let score = 0;
        
        // Photos
        if (quote.photos && quote.photos.length > 0) {
            score += 5;
        }
        
        // Description quality
        const descLength = quote.description?.length || 0;
        if (descLength > 300) {
            score += 10;
        } else if (descLength > 100) {
            score += 7;
        } else if (descLength > 30) {
            score += 3;
        }
        
        // Specific details (measurements, materials, timeline)
        const hasSpecifics = this.containsSpecifics(quote.description);
        if (hasSpecifics) {
            score += 5;
        }
        
        return Math.min(score, 20);
    }

    /**
     * Urgency Score (0-20 points)
     * - Emergency/ASAP: 20pts
     * - This week: 18pts
     * - This month: 15pts
     * - Flexible: 12pts
     * - No urgency specified: 10pts
     */
    scoreUrgency(quote) {
        const urgency = quote.urgency?.toLowerCase();
        
        if (!urgency) return 10;
        
        if (urgency.includes('emergency') || urgency.includes('asap') || urgency.includes('urgent')) {
            return 20;
        }
        
        if (urgency.includes('week')) {
            return 18;
        }
        
        if (urgency.includes('month')) {
            return 15;
        }
        
        return 12; // Flexible
    }

    /**
     * Customer Score (0-20 points)
     * - Email verified: +10pts
     * - Phone verified: +5pts
     * - Previous jobs completed: +3pts per job (max 5)
     * - High response rate (>80%): +5pts
     */
    async scoreCustomer(customer) {
        let score = 0;
        
        // Email verification
        if (customer.email_verified) {
            score += 10;
        }
        
        // Phone verification
        if (customer.phone_verified) {
            score += 5;
        }
        
        // Job history
        try {
            const historyResult = await this.pool.query(
                `SELECT COUNT(*) as job_count 
                 FROM quotes 
                 WHERE customer_id = $1 AND status = 'closed'`,
                [customer.id]
            );
            
            const jobCount = parseInt(historyResult.rows[0]?.job_count || 0);
            score += Math.min(jobCount * 3, 5);
        } catch (err) {
            console.error('Error fetching customer history:', err);
        }
        
        return Math.min(score, 20);
    }

    /**
     * Location Score (0-20 points)
     * - Full postcode: 20pts
     * - Partial postcode: 15pts
     * - City/area only: 10pts
     * - No location: 0pts
     */
    scoreLocation(quote) {
        const postcode = quote.postcode;
        
        if (!postcode) return 0;
        
        // Full UK postcode format (e.g., SW1A 1AA)
        const fullPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i;
        if (fullPostcodeRegex.test(postcode.replace(/\s/g, ''))) {
            return 20;
        }
        
        // Partial postcode (e.g., SW1A)
        const partialPostcodeRegex = /^[A-Z]{1,2}\d{1,2}[A-Z]?$/i;
        if (partialPostcodeRegex.test(postcode.replace(/\s/g, ''))) {
            return 15;
        }
        
        // Some location provided
        if (postcode.length > 2) {
            return 10;
        }
        
        return 0;
    }

    /**
     * Determine quality tier based on overall score
     */
    determineQualityTier(overall) {
        if (overall >= 80) return 'premium';
        if (overall >= 60) return 'standard';
        return 'basic';
    }

    /**
     * Check if description contains specific details
     */
    containsSpecifics(description) {
        if (!description) return false;
        
        const specificIndicators = [
            /\d+\s*(m|meter|metre|cm|foot|feet|inch)/i, // Measurements
            /\d+\s*(sq|square)/i, // Area
            /(plaster|tile|brick|wood|concrete|steel)/i, // Materials
            /(monday|tuesday|wednesday|thursday|friday|january|february|march)/i, // Dates
            /(\d+)\s*(bedroom|bathroom|room|floor|storey)/i // Property specs
        ];
        
        return specificIndicators.some(regex => regex.test(description));
    }

    /**
     * Save qualification score to database
     */
    async saveQualificationScore(quoteId, scoreData) {
        try {
            const result = await this.pool.query(
                `INSERT INTO lead_qualification_scores (
                    quote_id, overall_score, budget_score, detail_score, 
                    urgency_score, customer_score, location_score,
                    has_budget, has_photos, description_length, 
                    customer_verified, quality_tier
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (quote_id) 
                DO UPDATE SET
                    overall_score = EXCLUDED.overall_score,
                    budget_score = EXCLUDED.budget_score,
                    detail_score = EXCLUDED.detail_score,
                    urgency_score = EXCLUDED.urgency_score,
                    customer_score = EXCLUDED.customer_score,
                    location_score = EXCLUDED.location_score,
                    has_budget = EXCLUDED.has_budget,
                    has_photos = EXCLUDED.has_photos,
                    description_length = EXCLUDED.description_length,
                    customer_verified = EXCLUDED.customer_verified,
                    quality_tier = EXCLUDED.quality_tier,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *`,
                [
                    quoteId,
                    scoreData.overall,
                    scoreData.budget,
                    scoreData.detail,
                    scoreData.urgency,
                    scoreData.customer,
                    scoreData.location,
                    scoreData.metadata.hasBudget,
                    scoreData.metadata.hasPhotos,
                    scoreData.metadata.descriptionLength,
                    scoreData.metadata.customerVerified,
                    scoreData.tier
                ]
            );

            return result.rows[0];
        } catch (err) {
            console.error('Error saving qualification score:', err);
            throw err;
        }
    }

    /**
     * Get quality score for a quote
     */
    async getQuoteScore(quoteId) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM lead_qualification_scores WHERE quote_id = $1',
                [quoteId]
            );
            return result.rows[0] || null;
        } catch (err) {
            console.error('Error fetching quote score:', err);
            return null;
        }
    }
}

module.exports = LeadQualificationService;
