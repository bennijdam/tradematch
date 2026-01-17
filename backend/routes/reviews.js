const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

let pool;
router.setPool = (p) => { pool = p; };

// Simple authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/reviews - Get all reviews or filter by vendor
router.get('/', authenticate, async (req, res) => {
    const { vendorId, limit = 10 } = req.query;
    
    try {
        let query = `
            SELECT r.*, u.name as customer_name, q.title as job_title
            FROM reviews r
            JOIN users u ON r.customer_id = u.id
            JOIN quotes q ON r.quote_id = q.id
            WHERE 1=1
        `;
        const params = [];
        
        if (vendorId) {
            query += ` AND r.vendor_id = $1`;
            params.push(vendorId);
        }
        
        query += ` ORDER BY r.created_at DESC LIMIT ${limit}`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            reviews: result.rows
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// POST /api/reviews - Create review
router.post('/', authenticate, async (req, res) => {
    const { quoteId, vendorId, rating, reviewText } = req.body;
    const customerId = req.user.userId;
    
    try {
        const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO reviews (id, quote_id, customer_id, vendor_id, rating, review_text, is_verified)
             VALUES ($1, $2, $3, $4, $5, $6, true)`,
            [reviewId, quoteId, customerId, vendorId, rating, reviewText]
        );
        
        res.json({ success: true, reviewId });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

module.exports = router;