/**
 * Lead Pricing Service
 * 
 * Calculates fair, transparent pricing for leads based on:
 * - Job value (budget)
 * - Category/trade type
 * - Location (premium areas)
 * - Lead quality score
 * 
 * TradeMatch Pricing Philosophy:
 * - Cheaper than MyBuilder (30-40% less)
 * - Quality-based (premium leads cost more, worth more)
 * - Transparent (no hidden fees)
 * - Refundable (bad leads get full refund)
 */

class LeadPricingService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Calculate lead price for a quote
     * @param {Object} quote - Quote details
     * @param {number} qualityScore - Lead quality score (0-100)
     * @returns {Object} Pricing breakdown
     */
    async calculateLeadPrice(quote, qualityScore) {
        // 1. Get base price from budget tier
        const basePrice = await this.getBasePriceFromBudget(quote.budgetMin, quote.budgetMax);
        
        // 2. Apply category multiplier
        const categoryMultiplier = await this.getCategoryMultiplier(quote.serviceType);
        
        // 3. Apply location multiplier
        const locationMultiplier = await this.getLocationMultiplier(quote.postcode);
        
        // 4. Apply quality adjustment (-20% to +30% based on score)
        const qualityMultiplier = this.getQualityMultiplier(qualityScore);
        
        // Calculate final price
        const rawPrice = basePrice * categoryMultiplier * locationMultiplier * qualityMultiplier;
        const finalPrice = this.roundPrice(rawPrice);
        
        // Apply price floor and ceiling
        const cappedPrice = Math.max(2.50, Math.min(finalPrice, 25.00));
        
        return {
            finalPrice: cappedPrice,
            breakdown: {
                basePrice: basePrice.toFixed(2),
                categoryMultiplier,
                locationMultiplier,
                qualityMultiplier,
                rawPrice: rawPrice.toFixed(2)
            },
            currency: 'GBP',
            refundable: true,
            refundPolicy: 'Full refund if lead is invalid or customer unresponsive'
        };
    }

    /**
     * Get base price from pricing tiers based on job budget
     */
    async getBasePriceFromBudget(budgetMin, budgetMax) {
        try {
            // Use average budget if both provided
            const budget = budgetMax && budgetMin 
                ? (budgetMax + budgetMin) / 2 
                : budgetMax || budgetMin || 500;

            const result = await this.pool.query(
                `SELECT base_price FROM lead_pricing_tiers
                 WHERE min_budget <= $1 
                   AND (max_budget IS NULL OR max_budget >= $1)
                 ORDER BY min_budget DESC
                 LIMIT 1`,
                [budget]
            );

            if (result.rows.length > 0) {
                return parseFloat(result.rows[0].base_price);
            }

            // Default fallback
            return 5.00;
        } catch (err) {
            console.error('Error getting base price:', err);
            return 5.00; // Safe default
        }
    }

    /**
     * Get category pricing multiplier
     */
    async getCategoryMultiplier(category) {
        try {
            const result = await this.pool.query(
                'SELECT multiplier FROM category_pricing_multipliers WHERE category = $1',
                [category]
            );

            if (result.rows.length > 0) {
                return parseFloat(result.rows[0].multiplier);
            }

            return 1.0; // Default: no multiplier
        } catch (err) {
            console.error('Error getting category multiplier:', err);
            return 1.0;
        }
    }

    /**
     * Get location pricing multiplier (premium areas cost more)
     */
    async getLocationMultiplier(postcode) {
        if (!postcode) return 1.0;

        try {
            // Extract postcode prefix (e.g., "SW" from "SW1A 1AA")
            const prefix = postcode.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
            
            if (!prefix) return 1.0;

            const result = await this.pool.query(
                'SELECT multiplier FROM location_pricing_zones WHERE postcode_prefix = $1',
                [prefix]
            );

            if (result.rows.length > 0) {
                return parseFloat(result.rows[0].multiplier);
            }

            return 1.0; // Standard area
        } catch (err) {
            console.error('Error getting location multiplier:', err);
            return 1.0;
        }
    }

    /**
     * Quality-based pricing adjustment
     * - Premium leads (80-100): +30%
     * - Standard leads (60-79): No change
     * - Basic leads (0-59): -20%
     */
    getQualityMultiplier(qualityScore) {
        if (qualityScore >= 80) return 1.30; // Premium: worth more to vendors
        if (qualityScore >= 60) return 1.00; // Standard: base price
        return 0.80; // Basic: discounted
    }

    /**
     * Round price to nearest 50p increment for clean pricing
     */
    roundPrice(price) {
        return Math.round(price * 2) / 2; // Round to nearest 0.50
    }

    /**
     * Calculate refund amount based on reason
     */
    calculateRefundAmount(leadCost, reason) {
        const refundPolicies = {
            'customer_unresponsive': 1.00,  // 100% refund
            'invalid_contact': 1.00,        // 100% refund
            'duplicate_lead': 1.00,         // 100% refund
            'job_cancelled': 0.50,          // 50% refund (customer did post)
            'customer_dispute': 0.75,       // 75% refund
            'poor_quality': 0.50            // 50% refund
        };

        const refundPercentage = refundPolicies[reason] || 0;
        return leadCost * refundPercentage;
    }

    /**
     * Get pricing comparison vs MyBuilder
     * MyBuilder charges £10-30 per lead with no quality guarantee
     */
    getCompetitorComparison(ourPrice) {
        const myBuilderAverage = 18.00;
        const savings = myBuilderAverage - ourPrice;
        const savingsPercent = ((savings / myBuilderAverage) * 100).toFixed(0);

        return {
            competitor: 'MyBuilder',
            theirAverage: myBuilderAverage,
            ourPrice,
            savings: savings.toFixed(2),
            savingsPercent: `${savingsPercent}%`,
            message: `Save £${savings.toFixed(2)} (${savingsPercent}%) vs MyBuilder`
        };
    }

    /**
     * Calculate credits package pricing
     * Bulk discounts for larger purchases
     */
    getCreditPackages() {
        return [
            {
                credits: 25,
                price: 25.00,
                pricePerCredit: 1.00,
                discount: 0,
                popular: false
            },
            {
                credits: 50,
                price: 47.50,
                pricePerCredit: 0.95,
                discount: 5,
                popular: true
            },
            {
                credits: 100,
                price: 90.00,
                pricePerCredit: 0.90,
                discount: 10,
                popular: false
            },
            {
                credits: 250,
                price: 212.50,
                pricePerCredit: 0.85,
                discount: 15,
                popular: false
            }
        ];
    }

    /**
     * Estimate ROI for vendor
     * Based on average conversion rates and job values
     */
    estimateROI(leadCost, avgJobValue, conversionRate = 0.15) {
        const expectedRevenue = avgJobValue * conversionRate;
        const roi = ((expectedRevenue - leadCost) / leadCost) * 100;
        
        return {
            leadCost,
            expectedRevenue: expectedRevenue.toFixed(2),
            roi: roi.toFixed(0) + '%',
            breakEvenConversion: ((leadCost / avgJobValue) * 100).toFixed(1) + '%',
            message: conversionRate >= 0.10 
                ? 'Good ROI expected' 
                : 'Consider improving bid quality'
        };
    }
}

module.exports = LeadPricingService;
