const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Create Review
 * POST /api/reviews
 */
router.post('/', authenticate, async (req, res) => {
    const {
        quoteId,
        vendorId,
        rating,
        reviewText,
        qualityRating,
        communicationRating,
        valueRating,
        timelinessRating,
        photos
    } = req.body;
    
    const customerId = req.user.userId;
    
    try {
        // Verify customer has completed job with this vendor
        const quoteCheck = await pool.query(
            'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2 AND status = $3',
            [quoteId, customerId, 'completed']
        );
        
        if (quoteCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You can only review completed jobs' });
        }
        
        // Check if already reviewed
        const existingReview = await pool.query(
            'SELECT id FROM reviews WHERE quote_id = $1 AND customer_id = $2',
            [quoteId, customerId]
        );
        
        if (existingReview.rows.length > 0) {
            return res.status(400).json({ error: 'You have already reviewed this job' });
        }
        
        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO reviews (
                id, quote_id, customer_id, vendor_id, rating, review_text,
                quality_rating, communication_rating, value_rating, timeliness_rating,
                photos, is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)`,
            [
                reviewId, quoteId, customerId, vendorId, rating, reviewText,
                qualityRating, communicationRating, valueRating, timelinessRating,
                JSON.stringify(photos)
            ]
        );
        
        // Update vendor's average rating
        await updateVendorRating(vendorId);
        
        res.json({ success: true, reviewId });
        
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

/**
 * Get Vendor Reviews
 * GET /api/reviews/vendor/:vendorId
 */
router.get('/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;
    
    try {
        let orderClause = 'r.created_at DESC';
        
        if (sortBy === 'helpful') {
            orderClause = 'r.helpful_count DESC, r.created_at DESC';
        } else if (sortBy === 'rating') {
            orderClause = 'r.rating DESC, r.created_at DESC';
        }
        
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            `SELECT r.*, 
                    u.name as customer_name,
                    u.avatar_url as customer_avatar,
                    q.title as job_title
             FROM reviews r
             JOIN users u ON r.customer_id = u.id
             JOIN quotes q ON r.quote_id = q.id
             WHERE r.vendor_id = $1 AND r.is_verified = true
             ORDER BY ${orderClause}
             LIMIT $2 OFFSET $3`,
            [vendorId, limit, offset]
        );
        
        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM reviews WHERE vendor_id = $1 AND is_verified = true',
            [vendorId]
        );
        
        // Get rating breakdown
        const breakdownResult = await pool.query(
            `SELECT 
                rating,
                COUNT(*) as count
             FROM reviews
             WHERE vendor_id = $1 AND is_verified = true
             GROUP BY rating
             ORDER BY rating DESC`,
            [vendorId]
        );
        
        // Calculate averages
        const avgResult = await pool.query(
            `SELECT 
                ROUND(AVG(rating), 2) as avg_rating,
                ROUND(AVG(quality_rating), 2) as avg_quality,
                ROUND(AVG(communication_rating), 2) as avg_communication,
                ROUND(AVG(value_rating), 2) as avg_value,
                ROUND(AVG(timeliness_rating), 2) as avg_timeliness
             FROM reviews
             WHERE vendor_id = $1 AND is_verified = true`,
            [vendorId]
        );
        
        res.json({
            success: true,
            reviews: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(countResult.rows[0].count / limit)
            },
            statistics: {
                averages: avgResult.rows[0],
                breakdown: breakdownResult.rows
            }
        });
        
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

/**
 * Vendor Response to Review
 * POST /api/reviews/:reviewId/response
 */
router.post('/:reviewId/response', authenticate, async (req, res) => {
    const { reviewId } = req.params;
    const { responseText } = req.body;
    const vendorId = req.user.userId;
    
    try {
        // Verify vendor owns this review
        const reviewCheck = await pool.query(
            'SELECT * FROM reviews WHERE id = $1 AND vendor_id = $2',
            [reviewId, vendorId]
        );
        
        if (reviewCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await pool.query(
            `UPDATE reviews 
             SET response_text = $1, response_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [responseText, reviewId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Review response error:', error);
        res.status(500).json({ error: 'Failed to post response' });
    }
});

/**
 * Mark Review as Helpful
 * POST /api/reviews/:reviewId/helpful
 */
router.post('/:reviewId/helpful', authenticate, async (req, res) => {
    const { reviewId } = req.params;
    
    try {
        await pool.query(
            'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
            [reviewId]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Helpful vote error:', error);
        res.status(500).json({ error: 'Failed to record vote' });
    }
});

/**
 * Helper: Update Vendor's Average Rating
 */
async function updateVendorRating(vendorId) {
    try {
        const avgResult = await pool.query(
            'SELECT ROUND(AVG(rating), 2) as avg_rating FROM reviews WHERE vendor_id = $1',
            [vendorId]
        );
        
        await pool.query(
            'UPDATE vendors SET average_rating = $1 WHERE id = $2',
            [avgResult.rows[0].avg_rating, vendorId]
        );
    } catch (error) {
        console.error('Update vendor rating error:', error);
    }
}

module.exports = router;