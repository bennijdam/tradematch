const express = require('express');
const router = express.Router();

let pool;
router.setPool = (p) => { pool = p; };

// Get vendor analytics dashboard
router.get('/dashboard/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { period = '30' } = req.query; // days
        
        // Revenue metrics
        const revenueResult = await pool.query(
            `SELECT 
                COALESCE(SUM(amount), 0) as total_revenue,
                COUNT(*) as total_jobs,
                AVG(amount) as avg_job_value
             FROM payments 
             WHERE vendor_id = $1 AND status = 'completed' 
             AND paid_at >= CURRENT_DATE - INTERVAL '${period} days'`,
            [vendorId]
        );
        
        // Quote performance
        const quoteStats = await pool.query(
            `SELECT 
                COUNT(*) as total_quotes,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_quotes,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_quotes
             FROM quotes 
             WHERE vendor_id IS NULL -- This needs to be adjusted based on bid system
             AND created_at >= CURRENT_DATE - INTERVAL '${period} days'`
        );
        
        // Review metrics
        const reviewStats = await pool.query(
            `SELECT 
                AVG(rating) as avg_rating,
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews
             FROM reviews 
             WHERE vendor_id = $1
             AND created_at >= CURRENT_DATE - INTERVAL '${period} days'`,
            [vendorId]
        );
        
        // Monthly trends
        const trendsResult = await pool.query(
            `SELECT 
                DATE_TRUNC('month', paid_at) as month,
                SUM(amount) as revenue,
                COUNT(*) as jobs
             FROM payments 
             WHERE vendor_id = $1 AND status = 'completed'
             AND paid_at >= CURRENT_DATE - INTERVAL '12 months'
             GROUP BY DATE_TRUNC('month', paid_at)
             ORDER BY month DESC`,
            [vendorId]
        );
        
        // Service categories performance
        const categoryStats = await pool.query(
            `SELECT 
                q.service_type,
                COUNT(*) as quote_count,
                AVG(p.amount) as avg_revenue
             FROM quotes q
             JOIN payments p ON q.id = p.quote_id
             WHERE p.vendor_id = $1 AND p.status = 'completed'
             GROUP BY q.service_type
             ORDER BY avg_revenue DESC
             LIMIT 10`,
            [vendorId]
        );
        
        res.json({
            success: true,
            period: `${period} days`,
            revenue: revenueResult.rows[0] || { total_revenue: 0, total_jobs: 0, avg_job_value: 0 },
            quotes: quoteStats.rows[0] || { total_quotes: 0, accepted_quotes: 0, pending_quotes: 0 },
            reviews: reviewStats.rows[0] || { avg_rating: 0, total_reviews: 0, positive_reviews: 0 },
            trends: trendsResult.rows,
            categories: categoryStats.rows
        });
    } catch (error) {
        console.error('Get analytics dashboard error:', error);
        res.status(500).json({ error: 'Failed to get analytics dashboard' });
    }
});

// Get performance metrics
router.get('/performance/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        
        // Response time metrics
        const responseTime = await pool.query(
            `SELECT 
                AVG(EXTRACT(EPOCH FROM (created_at - submitted_at))/60) as avg_response_minutes,
                MIN(EXTRACT(EPOCH FROM (created_at - submitted_at))/60) as min_response_minutes
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             WHERE b.vendor_id = $1 AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'`,
            [vendorId]
        );
        
        // Conversion metrics
        const conversion = await pool.query(
            `SELECT 
                COUNT(*) as total_bids,
                COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_bids,
                ROUND(
                    COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / COUNT(*), 2
                ) as conversion_rate
             FROM bids 
             WHERE vendor_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days'`,
            [vendorId]
        );
        
        // Customer satisfaction
        const satisfaction = await pool.query(
            `SELECT 
                AVG(rating) as avg_rating,
                COUNT(*) as total_reviews,
                COUNT(CASE WHEN rating >= 4 THEN 1 END) as happy_customers
             FROM reviews 
             WHERE vendor_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '90 days'`,
            [vendorId]
        );
        
        res.json({
            success: true,
            responseTime: responseTime.rows[0] || { avg_response_minutes: 0, min_response_minutes: 0 },
            conversion: conversion.rows[0] || { total_bids: 0, accepted_bids: 0, conversion_rate: 0 },
            satisfaction: satisfaction.rows[0] || { avg_rating: 0, total_reviews: 0, happy_customers: 0 }
        });
    } catch (error) {
        console.error('Get performance metrics error:', error);
        res.status(500).json({ error: 'Failed to get performance metrics' });
    }
});

// Get top performing services
router.get('/top-services/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { limit = 5 } = req.query;
        
        const result = await pool.query(
            `SELECT 
                q.service_type,
                COUNT(*) as job_count,
                SUM(p.amount) as total_revenue,
                AVG(p.amount) as avg_revenue,
                AVG(r.rating) as avg_rating
             FROM quotes q
             LEFT JOIN payments p ON q.id = p.quote_id AND p.vendor_id = $1 AND p.status = 'completed'
             LEFT JOIN reviews r ON p.quote_id = r.quote_id
             WHERE p.vendor_id = $1
             GROUP BY q.service_type
             ORDER BY total_revenue DESC
             LIMIT $2`,
            [vendorId, limit]
        );
        
        res.json({ success: true, services: result.rows });
    } catch (error) {
        console.error('Get top services error:', error);
        res.status(500).json({ error: 'Failed to get top services' });
    }
});

// Export analytics data
router.get('/export/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { format = 'csv', startDate, endDate } = req.query;
        
        let whereClause = 'WHERE vendor_id = $1';
        const params = [vendorId];
        
        if (startDate) {
            whereClause += ' AND paid_at >= $' + (params.length + 1);
            params.push(startDate);
        }
        
        if (endDate) {
            whereClause += ' AND paid_at <= $' + (params.length + 1);
            params.push(endDate);
        }
        
        const result = await pool.query(
            `SELECT 
                p.id as payment_id,
                p.quote_id,
                p.amount,
                p.currency,
                p.status,
                p.paid_at,
                p.released_at,
                q.title as quote_title,
                q.service_type,
                u.name as customer_name
             FROM payments p
             JOIN quotes q ON p.quote_id = q.id
             JOIN users u ON p.customer_id = u.id
             ${whereClause}
             ORDER BY p.paid_at DESC`,
            params
        );
        
        if (format === 'csv') {
            const csv = convertToCSV(result.rows);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
            res.send(csv);
        } else {
            res.json({ success: true, data: result.rows });
        }
    } catch (error) {
        console.error('Export analytics error:', error);
        res.status(500).json({ error: 'Failed to export analytics' });
    }
});

// Helper function to convert to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;