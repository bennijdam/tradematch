const express = require('express');
const router = express.Router();

let pool;
router.setPool = (p) => { pool = p; };

// Middleware to authenticate
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Create bid
router.post('/', authenticate, async (req, res) => {
    const { quoteId, price, message, estimatedDuration, availability } = req.body;
    const vendorId = req.user.userId;
    
    try {
        const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO bids (id, quote_id, vendor_id, price, message, estimated_duration, availability, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [bidId, quoteId, vendorId, price, message, estimatedDuration, availability]
        );
        
        res.json({ success: true, bidId });
    } catch (error) {
        console.error('Create bid error:', error);
        res.status(500).json({ error: 'Failed to create bid' });
    }
});

// Get vendor's bids
router.get('/my-bids', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    
    try {
        const result = await pool.query(
            `SELECT b.*, q.title, q.description, q.postcode, q.budget_min, q.budget_max,
                    u.name as customer_name
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             JOIN users u ON q.customer_id = u.id
             WHERE b.vendor_id = $1
             ORDER BY b.created_at DESC`,
            [vendorId]
        );
        
        res.json({ success: true, bids: result.rows });
    } catch (error) {
        console.error('Get bids error:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

module.exports = router;