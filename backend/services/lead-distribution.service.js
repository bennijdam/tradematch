/**
 * Lead Distribution Service
 * 
 * Smart vendor matching and lead distribution
 * 
 * Key Differentiators vs MyBuilder:
 * - Limited to 3-5 vendors per quote (vs unlimited)
 * - Smart matching based on location, specialty, performance
 * - Fair rotation (prevents same vendors getting all leads)
 * - Credit-based access (vendors must have credits)
 * - Performance-weighted scoring
 */

const geolib = require('geolib'); // For distance calculations
const axios = require('axios'); // For HTTP requests to email service

class LeadDistributionService {
    constructor(pool) {
        this.pool = pool;
        this.MAX_VENDORS_PER_LEAD = 5;
        this.MIN_VENDORS_PER_LEAD = 3;
    }

    /**
     * Find and distribute lead to best-matched vendors
     * @param {Object} quote - Quote details
     * @param {number} qualityScore - Lead quality score
     * @param {number} leadCost - Cost per lead
     * @returns {Array} List of vendors who received the lead
     */
    async distributeLead(quote, qualityScore, leadCost) {
        try {
            // 1. Find all potential vendor matches
            const candidates = await this.findCandidateVendors(quote, qualityScore);
            
            if (candidates.length === 0) {
                console.log('⚠️ No vendors found matching criteria');
                return [];
            }

            // 2. Score each vendor for this specific lead
            const scoredCandidates = await Promise.all(
                candidates.map(v => this.scoreVendorMatch(v, quote, qualityScore))
            );

            // 3. Sort by match score (highest first)
            scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);

            // 4. Select top N vendors (3-5 based on lead quality)
            const vendorCount = this.determineVendorCount(qualityScore);
            const selectedVendors = scoredCandidates.slice(0, vendorCount);

            // 5. Record distribution and notify vendors
            const distributions = [];
            for (let i = 0; i < selectedVendors.length; i++) {
                const vendor = selectedVendors[i];
                const distribution = await this.recordDistribution(
                    quote.id,
                    vendor,
                    i + 1, // priority rank (1-5)
                    leadCost
                );
                distributions.push(distribution);
            }

            console.log(`✅ Lead ${quote.id} distributed to ${distributions.length} vendors`);
            return distributions;

        } catch (err) {
            console.error('Error distributing lead:', err);
            return [];
        }
    }

    /**
     * Find candidate vendors who match basic criteria
     */
    async findCandidateVendors(quote, qualityScore) {
        try {
            const result = await this.pool.query(
                                `SELECT DISTINCT 
                                        u.id,
                                        u.name,
                                        u.email,
                                        u.postcode,
                                        u.services,
                                        vcs.current_balance AS balance,
                                        vp.min_budget,
                                        vp.max_budget,
                                        vp.max_distance_miles,
                                        vp.min_quality_score,
                                        vm.reputation_score,
                                        vm.win_rate,
                                        vm.avg_customer_rating,
                                        vm.avg_response_time_hours
                                FROM users u
                                LEFT JOIN vendor_credit_summary vcs ON u.id = vcs.vendor_id
                                LEFT JOIN vendor_lead_preferences vp ON u.id = vp.vendor_id
                                LEFT JOIN vendor_performance_metrics vm ON u.id = vm.vendor_id
                                WHERE u.user_type = 'vendor'
                                    AND u.email_verified = TRUE
                                    AND COALESCE(vcs.current_balance, 0) >= $1
                                    AND (vp.min_quality_score IS NULL OR $2 >= vp.min_quality_score)
                                    AND (
                                        u.services IS NULL 
                                        OR u.services LIKE $3 
                                        OR $4 = ANY(string_to_array(u.services, ','))
                                    )
                                ORDER BY vm.reputation_score DESC NULLS LAST
                                LIMIT 50`,
                [
                    5.00, // Minimum credit balance required
                    qualityScore,
                    `%${quote.serviceType}%`,
                    quote.serviceType
                ]
            );

            return result.rows;
        } catch (err) {
            console.error('Error finding candidate vendors:', err);
            return [];
        }
    }

    /**
     * Score how well a vendor matches this specific lead
     * Score components (each 0-20 points, total 100):
     * - Distance match (20)
     * - Specialty match (20)
     * - Budget match (20)
     * - Performance history (20)
     * - Fair rotation (20)
     */
    async scoreVendorMatch(vendor, quote, qualityScore) {
        let matchScore = 0;

        // 1. Distance Score (0-20)
        const distanceScore = await this.scoreDistance(vendor, quote);
        matchScore += distanceScore;

        // 2. Specialty Match (0-20)
        const specialtyScore = this.scoreSpecialty(vendor, quote);
        matchScore += specialtyScore;

        // 3. Budget Match (0-20)
        const budgetScore = this.scoreBudgetMatch(vendor, quote);
        matchScore += budgetScore;

        // 4. Performance Score (0-20)
        const performanceScore = this.scorePerformance(vendor);
        matchScore += performanceScore;

        // 5. Fair Rotation Score (0-20)
        const rotationScore = await this.scoreRotation(vendor.id);
        matchScore += rotationScore;

        return {
            vendorId: vendor.id,
            vendorName: vendor.name,
            matchScore,
            breakdown: {
                distance: distanceScore,
                specialty: specialtyScore,
                budget: budgetScore,
                performance: performanceScore,
                rotation: rotationScore
            },
            distanceMiles: vendor.distanceMiles || 0,
            credits: vendor.balance || 0
        };
    }

    /**
     * Score based on distance (closer is better)
     */
    async scoreDistance(vendor, quote) {
        // If no location data, give neutral score
        if (!vendor.postcode || !quote.postcode) {
            return 10;
        }

        try {
            // Simple postcode prefix matching for now
            const vendorPrefix = vendor.postcode.substring(0, 3).toUpperCase();
            const quotePrefix = quote.postcode.substring(0, 3).toUpperCase();

            if (vendorPrefix === quotePrefix) {
                return 20; // Same area
            }

            // Check first 2 characters (broader area)
            if (vendorPrefix.substring(0, 2) === quotePrefix.substring(0, 2)) {
                return 15; // Same region
            }

            return 5; // Different area (still possible if vendor set wide radius)
        } catch (err) {
            return 10;
        }
    }

    /**
     * Score specialty match
     */
    scoreSpecialty(vendor, quote) {
        if (!vendor.services) return 10;

        const services = vendor.services.toLowerCase();
        const requested = quote.serviceType.toLowerCase();

        // Exact match
        if (services.includes(requested)) {
            return 20;
        }

        // Related services (e.g., "electrician" matches "electrical")
        const relatedMatches = {
            'plumbing': ['plumber', 'heating', 'boiler'],
            'electrical': ['electrician', 'electric'],
            'building': ['builder', 'construction', 'renovation'],
            'carpentry': ['carpenter', 'joiner', 'joinery']
        };

        for (const [key, related] of Object.entries(relatedMatches)) {
            if (requested.includes(key) && related.some(r => services.includes(r))) {
                return 15;
            }
        }

        return 5; // Generic match
    }

    /**
     * Score budget match (vendor preferences vs job budget)
     */
    scoreBudgetMatch(vendor, quote) {
        const jobBudget = quote.budgetMax || quote.budgetMin || 0;
        
        if (jobBudget === 0) return 10; // No budget info

        // Check vendor preferences
        if (vendor.min_budget && jobBudget < vendor.min_budget) {
            return 0; // Job too small for vendor
        }

        if (vendor.max_budget && jobBudget > vendor.max_budget) {
            return 5; // Job too large (but not disqualifying)
        }

        // Job is within vendor's preferred range
        return 20;
    }

    /**
     * Score vendor's past performance
     */
    scorePerformance(vendor) {
        let score = 0;
        const reputation = vendor.reputation_score || 50;
        const winRate = parseFloat(vendor.win_rate || 0);
        const avgRating = parseFloat(vendor.avg_customer_rating || 0);
        const avgResponseTimeHours = parseFloat(vendor.avg_response_time_hours || 999);

        // Reputation (0-100) scaled to 0-10
        const repScore = (reputation / 100) * 10;

        // Win rate (0-100%) scaled to 0-5
        const winScore = (winRate / 100) * 5;

        score += repScore + winScore;

        // Rating scoring
        if (avgRating >= 4.5) score += 7;
        else if (avgRating >= 4.0) score += 5;
        else if (avgRating >= 3.5) score += 3;

        // Response time scoring (hours)
        if (avgResponseTimeHours <= 1) score += 5;       // Under 1 hour
        else if (avgResponseTimeHours <= 4) score += 3;  // Under 4 hours
        else if (avgResponseTimeHours <= 24) score += 1; // Under 1 day

        return Math.min(score, 20);
    }

    /**
     * Fair rotation score (prevents same vendors getting all leads)
     */
    async scoreRotation(vendorId) {
        try {
            // Count leads received in last 7 days
            const result = await this.pool.query(
                `SELECT COUNT(*) as recent_count
                 FROM lead_distributions
                 WHERE vendor_id = $1
                   AND notified_at > NOW() - INTERVAL '7 days'`,
                [vendorId]
            );

            const recentLeads = parseInt(result.rows[0]?.recent_count || 0);

            // Score decreases with more recent leads (fair rotation)
            if (recentLeads === 0) return 20; // No recent leads
            if (recentLeads <= 2) return 15;
            if (recentLeads <= 5) return 10;
            if (recentLeads <= 10) return 5;
            return 0; // Too many recent leads, give others a chance
        } catch (err) {
            return 10;
        }
    }

    /**
     * Determine how many vendors should receive this lead
     * Higher quality = more vendors (more competition = better for customer)
     */
    determineVendorCount(qualityScore) {
        if (qualityScore >= 80) return 5; // Premium leads: 5 vendors
        if (qualityScore >= 60) return 4; // Standard: 4 vendors
        return 3; // Basic: 3 vendors
    }

    /**
     * Record lead distribution in database
     */
    /**
     * Record lead distribution (PREVIEW MODE - no charge yet)
     * Vendor must explicitly ACCEPT before being charged
     */
    async recordDistribution(quoteId, vendor, priorityRank, leadCost) {
        try {
            const existing = await this.pool.query(
                'SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
                [quoteId, vendor.vendorId]
            );

            if (existing.rows.length > 0) {
                return existing.rows[0];
            }

            // Set expiration to 24 hours from now
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            const creditsCharged = Math.max(1, Math.round(leadCost));

            const result = await this.pool.query(
                `INSERT INTO lead_distributions (
                    quote_id, vendor_id, match_score, distance_miles,
                    distribution_order, credits_charged, 
                    lead_state, expires_at, distributed_at,
                    payment_charged
                ) VALUES ($1, $2, $3, $4, $5, $6, 'offered', $7, CURRENT_TIMESTAMP, FALSE)
                RETURNING *`,
                [
                    quoteId,
                    vendor.vendorId,
                    vendor.matchScore,
                    vendor.distanceMiles,
                    priorityRank,
                    creditsCharged,
                    expiresAt
                ]
            );

            if (result.rows.length > 0) {
                // Get quote details for preview generation
                const quoteDetails = await this.pool.query(
                    `SELECT q.*, u.email as vendor_email, u.name as vendor_name
                     FROM quotes q
                     JOIN users u ON u.id = $1
                     WHERE q.id = $2`,
                    [vendor.vendorId, quoteId]
                );

                if (quoteDetails.rows.length > 0) {
                    const quote = quoteDetails.rows[0];
                    
                    // Generate lead preview (hide customer contact info)
                    const preview = {
                        category: quote.category || quote.service || 'General Service',
                        area: this.hidePostcode(quote.postcode), // Show sector only (e.g., "SW1A 1")
                        budgetRange: quote.budget ? `£${quote.budget}` : 'Not specified',
                        timeframe: quote.timeframe || 'As soon as possible',
                        qualityScore: vendor.matchScore || 75,
                        qualityTier: this.getQualityTier(vendor.matchScore || 75)
                    };

                    // Send preview email notification
                    try {
                        const backendUrl = process.env.BACKEND_URL
                            || process.env.BASE_URL
                            || `http://localhost:${process.env.PORT || 3001}`;

                        const emailResponse = await axios.post(
                            `${backendUrl}/api/email/lead-preview-notification`,
                            {
                                vendorId: vendor.vendorId,
                                vendorEmail: quote.vendor_email,
                                quoteId: quoteId,
                                leadPrice: creditsCharged,
                                matchScore: vendor.matchScore,
                                preview: preview
                            }
                        );

                        console.log(`📧 Preview email sent to ${quote.vendor_name} (${quote.vendor_email})`);
                    } catch (emailErr) {
                        const status = emailErr.response?.status;
                        const data = emailErr.response?.data;
                        console.error(`⚠️ Failed to send preview email to vendor ${vendor.vendorId}:`, {
                            message: emailErr.message,
                            status,
                            data
                        });
                        // Don't fail the distribution if email fails - lead is still offered
                    }
                }

                console.log(`📨 Lead ${quoteId} offered to vendor ${vendor.vendorId} (credits ${creditsCharged}, expires in 24h)`);
            }

            return result.rows[0];
        } catch (err) {
            if (err && err.code === '23505') {
                try {
                    const existing = await this.pool.query(
                        'SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
                        [quoteId, vendor.vendorId]
                    );
                    return existing.rows[0] || null;
                } catch (fetchError) {
                    console.error('Error fetching existing distribution after duplicate:', fetchError);
                }
            }
            console.error('Error recording distribution:', err);
            return null;
        }
    }

    /**
     * Hide full postcode - show sector only (e.g., "SW1A 1" instead of "SW1A 1AA")
     */
    hidePostcode(postcode) {
        if (!postcode) return 'Unknown area';
        
        // Extract postcode sector (first part + space + first digit)
        // Example: "SW1A 1AA" -> "SW1A 1"
        const parts = postcode.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0]} ${parts[1].charAt(0)}**`;
        }
        return `${postcode.substring(0, Math.min(4, postcode.length))}**`;
    }

    /**
     * Determine quality tier from score
     */
    getQualityTier(score) {
        if (score >= 85) return 'premium';
        if (score >= 70) return 'standard';
        return 'basic';
    }

    /**
     * Charge vendor for accessing lead
     */
    async chargeVendorForLead(vendorId, quoteId, leadCost) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Deduct credits from vendor
            const deductResult = await client.query(
                `UPDATE vendor_credits 
                 SET balance = balance - $1,
                     total_spent = total_spent + $1,
                     updated_at = NOW()
                 WHERE vendor_id = $2 AND balance >= $1
                 RETURNING balance`,
                [leadCost, vendorId]
            );

            if (deductResult.rows.length === 0) {
                throw new Error('Insufficient credits');
            }

            const newBalance = deductResult.rows[0].balance;

            // 2. Record transaction
            await client.query(
                `INSERT INTO credit_transactions (
                    vendor_id, transaction_type, amount, balance_after,
                    reference_id, description
                ) VALUES ($1, 'lead_access', $2, $3, $4, $5)`,
                [
                    vendorId,
                    -leadCost,
                    newBalance,
                    quoteId,
                    `Lead access fee for quote ${quoteId}`
                ]
            );

            // 3. Mark distribution as charged
            await client.query(
                `UPDATE lead_distributions 
                 SET charged = TRUE, viewed_at = NOW()
                 WHERE quote_id = $1 AND vendor_id = $2`,
                [quoteId, vendorId]
            );

            await client.query('COMMIT');

            console.log(`✅ Charged vendor ${vendorId} £${leadCost} for lead ${quoteId}`);
            return { success: true, newBalance };

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Error charging vendor:', err);
            return { success: false, error: err.message };
        } finally {
            client.release();
        }
    }
}

module.exports = LeadDistributionService;
