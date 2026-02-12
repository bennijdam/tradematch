const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

let cachedReviewsColumns = null;
let cachedVendorsColumns = null;

const getReviewsColumns = async () => {
    if (cachedReviewsColumns) return cachedReviewsColumns;
    try {
        const result = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'`
        );
        cachedReviewsColumns = new Set(result.rows.map((row) => row.column_name));
    } catch (error) {
        console.warn('Reviews column lookup failed:', error.message);
        cachedReviewsColumns = new Set();
    }
    return cachedReviewsColumns;
};

const getVendorsColumns = async () => {
    if (cachedVendorsColumns) return cachedVendorsColumns;
    try {
        const result = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors'`
        );
        cachedVendorsColumns = new Set(result.rows.map((row) => row.column_name));
    } catch (error) {
        console.warn('Vendors column lookup failed:', error.message);
        cachedVendorsColumns = new Set();
    }
    return cachedVendorsColumns;
};

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
            `SELECT * FROM quotes
             WHERE id = $1 AND customer_id = $2 AND status = ANY($3::text[])`,
            [quoteId, customerId, ['completed', 'closed', 'in_progress']]
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

        const columnResult = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'`
        );
        const columnSet = new Set(columnResult.rows.map((row) => row.column_name));

        const insertColumns = ['id', 'quote_id', 'customer_id', 'vendor_id', 'rating'];
        const insertValues = [reviewId, quoteId, customerId, vendorId, rating];

        if (columnSet.has('review_text')) {
            insertColumns.push('review_text');
            insertValues.push(reviewText);
        } else if (columnSet.has('feedback')) {
            insertColumns.push('feedback');
            insertValues.push(reviewText);
        }

        if (columnSet.has('quality_rating')) {
            insertColumns.push('quality_rating');
            insertValues.push(qualityRating);
        }
        if (columnSet.has('communication_rating')) {
            insertColumns.push('communication_rating');
            insertValues.push(communicationRating);
        }
        if (columnSet.has('value_rating')) {
            insertColumns.push('value_rating');
            insertValues.push(valueRating);
        }
        if (columnSet.has('timeliness_rating')) {
            insertColumns.push('timeliness_rating');
            insertValues.push(timelinessRating);
        }
        if (columnSet.has('photos')) {
            insertColumns.push('photos');
            insertValues.push(JSON.stringify(photos));
        }
        if (columnSet.has('is_verified')) {
            insertColumns.push('is_verified');
            insertValues.push(true);
        }

        const placeholders = insertValues.map((_, idx) => `$${idx + 1}`);

        await pool.query(
            `INSERT INTO reviews (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`,
            insertValues
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
        const reviewsColumns = await getReviewsColumns();
        let orderClause = 'r.created_at DESC';
        
        if (sortBy === 'helpful') {
            orderClause = 'r.helpful_count DESC, r.created_at DESC';
        } else if (sortBy === 'rating') {
            orderClause = 'r.rating DESC, r.created_at DESC';
        }
        
        const offset = (page - 1) * limit;
        
        const reviewFilters = ['r.vendor_id = $1'];
        if (reviewsColumns.has('is_verified')) {
            reviewFilters.push('r.is_verified = true');
        }

        const result = await pool.query(
            `SELECT r.*, 
                    u.name as customer_name,
                    u.avatar_url as customer_avatar,
                    q.title as job_title
             FROM reviews r
             JOIN users u ON r.customer_id = u.id
             JOIN quotes q ON r.quote_id = q.id
             WHERE ${reviewFilters.join(' AND ')}
             ORDER BY ${orderClause}
             LIMIT $2 OFFSET $3`,
            [vendorId, limit, offset]
        );
        
        // Get total count
        const countFilters = ['vendor_id = $1'];
        if (reviewsColumns.has('is_verified')) {
            countFilters.push('is_verified = true');
        }

        const countResult = await pool.query(
            `SELECT COUNT(*) FROM reviews WHERE ${countFilters.join(' AND ')}`,
            [vendorId]
        );
        
        // Get rating breakdown
        const breakdownResult = await pool.query(
            `SELECT 
                rating,
                COUNT(*) as count
             FROM reviews
             WHERE ${countFilters.join(' AND ')}
             GROUP BY rating
             ORDER BY rating DESC`,
            [vendorId]
        );
        
        // Calculate averages
        const avgFields = [
            'ROUND(AVG(rating), 2) as avg_rating'
        ];
        if (reviewsColumns.has('quality_rating')) avgFields.push('ROUND(AVG(quality_rating), 2) as avg_quality');
        if (reviewsColumns.has('communication_rating')) avgFields.push('ROUND(AVG(communication_rating), 2) as avg_communication');
        if (reviewsColumns.has('value_rating')) avgFields.push('ROUND(AVG(value_rating), 2) as avg_value');
        if (reviewsColumns.has('timeliness_rating')) avgFields.push('ROUND(AVG(timeliness_rating), 2) as avg_timeliness');

        const avgResult = await pool.query(
            `SELECT ${avgFields.join(', ')}
             FROM reviews
             WHERE ${countFilters.join(' AND ')}`,
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
        const vendorsColumns = await getVendorsColumns();
        if (!vendorsColumns.has('average_rating')) {
            return;
        }

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