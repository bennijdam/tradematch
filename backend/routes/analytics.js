const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Get Vendor Dashboard Analytics
 * GET /api/analytics/dashboard
 */
router.get('/dashboard', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    const { period = '30' } = req.query; // days
    
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));
        
        // Key Metrics
        const metricsQuery = await pool.query(
            `SELECT 
                COUNT(DISTINCT b.quote_id) as quotes_viewed,
                COUNT(b.id) as bids_submitted,
                COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as jobs_won,
                COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as jobs_completed,
                COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) as revenue,
                ROUND(AVG(CASE WHEN b.status = 'accepted' THEN 100.0 ELSE 0 END), 2) as win_rate
             FROM bids b
             LEFT JOIN quotes q ON b.quote_id = q.id
             LEFT JOIN payments p ON q.id = p.quote_id
             WHERE b.vendor_id = $1 AND b.created_at >= $2`,
            [vendorId, startDate]
        );
        
        const metrics = metricsQuery.rows[0];
        
        // Revenue by Month (last 12 months)
        const revenueQuery = await pool.query(
            `SELECT 
                TO_CHAR(p.paid_at, 'Mon YYYY') as month,
                SUM(p.amount) as total
             FROM payments p
             JOIN quotes q ON p.quote_id = q.id
             WHERE p.vendor_id = $1 
               AND p.paid_at >= NOW() - INTERVAL '12 months'
               AND p.status = 'paid'
             GROUP BY TO_CHAR(p.paid_at, 'Mon YYYY'), DATE_TRUNC('month', p.paid_at)
             ORDER BY DATE_TRUNC('month', p.paid_at) DESC
             LIMIT 12`,
            [vendorId]
        );
        
        // Bid Acceptance Rate by Service Type
        const serviceStatsQuery = await pool.query(
            `SELECT 
                q.service_type,
                COUNT(b.id) as total_bids,
                COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as accepted_bids,
                ROUND(
                    COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(b.id), 0),
                    2
                ) as win_rate
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             WHERE b.vendor_id = $1 AND b.created_at >= $2
             GROUP BY q.service_type
             ORDER BY total_bids DESC`,
            [vendorId, startDate]
        );
        
        // Response Time Analysis
        const responseTimeQuery = await pool.query(
            `SELECT 
                ROUND(AVG(
                    EXTRACT(EPOCH FROM (b.created_at - q.created_at)) / 60
                )) as avg_response_minutes
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             WHERE b.vendor_id = $1 AND b.created_at >= $2`,
            [vendorId, startDate]
        );
        
        // Customer Reviews Summary
        const reviewsQuery = await pool.query(
            `SELECT 
                ROUND(AVG(rating), 2) as avg_rating,
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
                COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
                COUNT(CASE WHEN rating <= 3 THEN 1 END) as three_or_less
             FROM reviews
             WHERE vendor_id = $1 AND created_at >= $2`,
            [vendorId, startDate]
        );
        
        // Active Jobs by Status
        const activeJobsQuery = await pool.query(
            `SELECT 
                status,
                COUNT(*) as count
             FROM quotes
             WHERE vendor_id = $1 AND status IN ('accepted', 'in_progress', 'review')
             GROUP BY status`,
            [vendorId]
        );
        
        // Top Performing Postcodes
        const postcodeQuery = await pool.query(
            `SELECT 
                q.postcode,
                COUNT(b.id) as bid_count,
                COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as won_count,
                SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) as revenue
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             LEFT JOIN payments p ON q.id = p.quote_id
             WHERE b.vendor_id = $1 AND b.created_at >= $2
             GROUP BY q.postcode
             ORDER BY won_count DESC, revenue DESC
             LIMIT 10`,
            [vendorId, startDate]
        );
        
        res.json({
            success: true,
            period: `Last ${period} days`,
            metrics: {
                quotesViewed: parseInt(metrics.quotes_viewed),
                bidsSubmitted: parseInt(metrics.bids_submitted),
                jobsWon: parseInt(metrics.jobs_won),
                jobsCompleted: parseInt(metrics.jobs_completed),
                revenue: parseFloat(metrics.revenue),
                winRate: parseFloat(metrics.win_rate)
            },
            charts: {
                revenueByMonth: revenueQuery.rows,
                serviceStats: serviceStatsQuery.rows,
                activeJobsByStatus: activeJobsQuery.rows,
                topPostcodes: postcodeQuery.rows
            },
            performance: {
                avgResponseTime: responseTimeQuery.rows[0].avg_response_minutes,
                reviews: reviewsQuery.rows[0]
            }
        });
        
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

/**
 * Track Analytics Event
 * POST /api/analytics/track
 */
router.post('/track', authenticate, async (req, res) => {
    const { eventType, eventData } = req.body;
    const vendorId = req.user.userId;
    
    try {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            'INSERT INTO analytics_events (id, vendor_id, event_type, event_data) VALUES ($1, $2, $3, $4)',
            [eventId, vendorId, eventType, JSON.stringify(eventData)]
        );
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Track event error:', error);
        res.status(500).json({ error: 'Failed to track event' });
    }
});

/**
 * Get Detailed Reports (exportable)
 * GET /api/analytics/report
 */
router.get('/report', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    const { startDate, endDate, format = 'json' } = req.query;
    
    try {
        // Comprehensive report data
        const reportQuery = await pool.query(
            `SELECT 
                b.id as bid_id,
                b.created_at as bid_date,
                q.title as job_title,
                q.service_type,
                q.postcode,
                b.price as bid_amount,
                b.status as bid_status,
                p.amount as payment_amount,
                p.paid_at,
                r.rating as customer_rating
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             LEFT JOIN payments p ON q.id = p.quote_id
             LEFT JOIN reviews r ON q.id = r.quote_id
             WHERE b.vendor_id = $1
               AND b.created_at BETWEEN $2 AND $3
             ORDER BY b.created_at DESC`,
            [vendorId, startDate, endDate]
        );
        
        if (format === 'csv') {
            // Convert to CSV
            const csv = convertToCSV(reportQuery.rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=vendor-report-${vendorId}.csv`);
            res.send(csv);
        } else {
            res.json({
                success: true,
                report: reportQuery.rows,
                period: { startDate, endDate }
            });
        }
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    
    return [headers, ...rows].join('\n');
}

module.exports = router;