const express = require('express');
const router = express.Router();

let pool;
router.setPool = (p) => { pool = p; };

// Submit review
router.post('/submit', async (req, res) => {
    try {
        const { 
            quoteId, 
            vendorId, 
            customerId, 
            rating, 
            title, 
            comment,
            workQuality,
            communication,
            timeliness,
            value
        } = req.body;
        
        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Check if user already reviewed this vendor
        const existingReview = await pool.query(
            'SELECT id FROM reviews WHERE quote_id = $1 AND customer_id = $2',
            [quoteId, customerId]
        );
        
        if (existingReview.rows.length > 0) {
            return res.status(400).json({ error: 'You have already reviewed this vendor' });
        }
        
        // Insert review
        await pool.query(
            `INSERT INTO reviews (id, vendor_id, customer_id, quote_id, rating, title, comment, 
                                work_quality, communication, timeliness, value, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'published')`,
            [reviewId, vendorId, customerId, quoteId, rating, title, comment,
             workQuality, communication, timeliness, value]
        );
        
        // Update vendor average rating
        await updateVendorRating(vendorId);
        
        res.json({
            success: true,
            reviewId,
            message: 'Review submitted successfully'
        });
    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// Vendor response to review
router.post('/respond', async (req, res) => {
    try {
        const { reviewId, vendorId, responseText } = req.body;
        
        await pool.query(
            `UPDATE reviews 
             SET response_text = $1, response_at = CURRENT_TIMESTAMP 
             WHERE id = $2 AND vendor_id = $3`,
            [responseText, reviewId, vendorId]
        );
        
        res.json({
            success: true,
            message: 'Response added successfully'
        });
    } catch (error) {
        console.error('Respond to review error:', error);
        res.status(500).json({ error: 'Failed to add response' });
    }
});

// Get vendor reviews
router.get('/vendor/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        const result = await pool.query(
            `SELECT r.*, u.name as customer_name, u.avatar as customer_avatar
             FROM reviews r
             JOIN users u ON r.customer_id = u.id
             WHERE r.vendor_id = $1 AND r.status = 'published'
             ORDER BY r.created_at DESC
             LIMIT $2 OFFSET $3`,
            [vendorId, limit, offset]
        );
        
        // Get rating breakdown
        const ratingStats = await pool.query(
            `SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
                COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
                COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
             FROM reviews 
             WHERE vendor_id = $1 AND status = 'published'`,
            [vendorId]
        );
        
        res.json({
            success: true,
            reviews: result.rows,
            stats: ratingStats.rows[0],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: ratingStats.rows[0]?.total_reviews || 0
            }
        });
    } catch (error) {
        console.error('Get vendor reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Get customer's reviews
router.get('/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        
        const result = await pool.query(
            `SELECT r.*, u.name as vendor_name, u.company as vendor_company
             FROM reviews r
             JOIN users u ON r.vendor_id = u.id
             WHERE r.customer_id = $1
             ORDER BY r.created_at DESC`,
            [customerId]
        );
        
        res.json({ success: true, reviews: result.rows });
    } catch (error) {
        console.error('Get customer reviews error:', error);
        res.status(500).json({ error: 'Failed to get reviews' });
    }
});

// Mark review as helpful
router.post('/helpful', async (req, res) => {
    try {
        const { reviewId, userId } = req.body;
        
        // Check if already marked helpful
        const existing = await pool.query(
            'SELECT id FROM review_helpful WHERE review_id = $1 AND user_id = $2',
            [reviewId, userId]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Already marked as helpful' });
        }
        
        await pool.query(
            `INSERT INTO review_helpful (review_id, user_id) VALUES ($1, $2)`,
            [reviewId, userId]
        );
        
        await pool.query(
            'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
            [reviewId]
        );
        
        res.json({ success: true, message: 'Marked as helpful' });
    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({ error: 'Failed to mark as helpful' });
    }
});

// Update vendor rating helper function
async function updateVendorRating(vendorId) {
    const ratingResult = await pool.query(
        'SELECT AVG(rating) as avg_rating FROM reviews WHERE vendor_id = $1 AND status = "published"',
        [vendorId]
    );
    
    if (ratingResult.rows.length > 0) {
        await pool.query(
            'UPDATE users SET rating = $1 WHERE id = $2',
            [parseFloat(ratingResult.rows[0].avg_rating).toFixed(2), vendorId]
        );
    }
}

module.exports = router;