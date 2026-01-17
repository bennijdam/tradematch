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

// GET /api/analytics/dashboard - Vendor analytics
router.get('/dashboard', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    
    try {
        // Get vendor stats
        const statsQuery = await pool.query(
            `SELECT 
                COUNT(DISTINCT q.quote_id) as quotes_viewed,
                COUNT(b.id) as bids_submitted,
                COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as jobs_won,
                COALESCE(
                    ROUND(
                        COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(b.id), 0),
                        2
                    ),
                    0
                ) as win_rate
             FROM bids b
             LEFT JOIN quotes q ON b.quote_id = q.id
             WHERE b.vendor_id = $1`,
            [vendorId]
        );
        
        // Get monthly revenue trends
        const revenueQuery = await pool.query(
            `SELECT 
                DATE_TRUNC('month', p.paid_at) as month,
                SUM(p.amount) as revenue,
                COUNT(p.id) as jobs
             FROM payments p
             WHERE p.vendor_id = $1 AND p.status = 'completed'
             AND p.paid_at >= CURRENT_DATE - INTERVAL '12 months'
             GROUP BY DATE_TRUNC('month', p.paid_at)
             ORDER BY month DESC`,
            [vendorId]
        );
        
        // Get service category performance
        const categoryQuery = await pool.query(
            `SELECT 
                q.service_type,
                COUNT(q.id) as job_count,
                SUM(p.amount) as total_revenue,
                AVG(p.amount) as avg_revenue,
                AVG(r.rating) as avg_rating
             FROM quotes q
             LEFT JOIN payments p ON q.id = p.quote_id
             WHERE p.vendor_id = $1 AND p.status = 'completed'
             GROUP BY q.service_type
             ORDER BY total_revenue DESC
             LIMIT 10`,
            [vendorId]
        );
        
        const metrics = {
            quotesViewed: statsQuery.rows[0]?.quotes_viewed || 0,
            bidsSubmitted: statsQuery.rows[0]?.bids_submitted || 0,
            jobsWon: statsQuery.rows[0]?.jobs_won || 0,
            winRate: parseFloat(statsQuery.rows[0]?.win_rate || 0).toFixed(2),
            revenue: revenueQuery.rows,
            categories: categoryQuery.rows
        };
        
        res.json({
            success: true,
            metrics
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;