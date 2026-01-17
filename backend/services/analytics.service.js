class AnalyticsService {
    // Calculate vendor performance metrics
    async calculateVendorMetrics(vendorId, pool, period = 30) {
        try {
            // Revenue metrics
            const revenueQuery = `
                SELECT 
                    COALESCE(SUM(amount), 0) as total_revenue,
                    COUNT(*) as total_jobs,
                    AVG(amount) as avg_job_value,
                    MIN(amount) as min_job_value,
                    MAX(amount) as max_job_value
                 FROM payments 
                 WHERE vendor_id = $1 AND status = 'completed' 
                 AND paid_at >= CURRENT_DATE - INTERVAL '${period} days'
            `;
            
            const revenueResult = await pool.query(revenueQuery, [vendorId]);
            
            // Conversion metrics
            const conversionQuery = `
                SELECT 
                    COUNT(*) as total_bids,
                    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_bids,
                    ROUND(
                        COUNT(CASE WHEN status = 'accepted' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as conversion_rate
                 FROM bids 
                 WHERE vendor_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
            `;
            
            const conversionResult = await pool.query(conversionQuery, [vendorId]);
            
            // Response time metrics
            const responseTimeQuery = `
                SELECT 
                    AVG(EXTRACT(EPOCH FROM (b.created_at - q.created_at))/60) as avg_response_minutes,
                    MIN(EXTRACT(EPOCH FROM (b.created_at - q.created_at))/60) as min_response_minutes,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY 
                        EXTRACT(EPOCH FROM (b.created_at - q.created_at))/60
                    ) as median_response_minutes
                 FROM bids b
                 JOIN quotes q ON b.quote_id = q.id
                 WHERE b.vendor_id = $1 AND b.created_at >= CURRENT_DATE - INTERVAL '${period} days'
            `;
            
            const responseTimeResult = await pool.query(responseTimeQuery, [vendorId]);
            
            // Review metrics
            const reviewQuery = `
                SELECT 
                    AVG(rating) as avg_rating,
                    COUNT(*) as total_reviews,
                    COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
                    COUNT(CASE WHEN rating >= 5 THEN 1 END) as five_star_reviews
                 FROM reviews 
                 WHERE vendor_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
            `;
            
            const reviewResult = await pool.query(reviewQuery, [vendorId]);
            
            return {
                revenue: revenueResult.rows[0] || {
                    total_revenue: 0, total_jobs: 0, avg_job_value: 0,
                    min_job_value: 0, max_job_value: 0
                },
                conversion: conversionResult.rows[0] || {
                    total_bids: 0, accepted_bids: 0, conversion_rate: 0
                },
                responseTime: responseTimeResult.rows[0] || {
                    avg_response_minutes: 0, min_response_minutes: 0, median_response_minutes: 0
                },
                reviews: reviewResult.rows[0] || {
                    avg_rating: 0, total_reviews: 0, positive_reviews: 0, five_star_reviews: 0
                }
            };
        } catch (error) {
            console.error('Calculate vendor metrics error:', error);
            throw error;
        }
    }
    
    // Get monthly revenue trends
    async getMonthlyRevenueTrends(vendorId, pool, months = 12) {
        try {
            const query = `
                SELECT 
                    DATE_TRUNC('month', paid_at) as month,
                    SUM(amount) as revenue,
                    COUNT(*) as jobs,
                    AVG(amount) as avg_job_value
                 FROM payments 
                 WHERE vendor_id = $1 AND status = 'completed'
                 AND paid_at >= CURRENT_DATE - INTERVAL '${months} months'
                 GROUP BY DATE_TRUNC('month', paid_at)
                 ORDER BY month DESC
            `;
            
            const result = await pool.query(query, [vendorId]);
            return result.rows;
        } catch (error) {
            console.error('Get monthly revenue trends error:', error);
            throw error;
        }
    }
    
    // Get service category performance
    async getServiceCategoryPerformance(vendorId, pool, limit = 10) {
        try {
            const query = `
                SELECT 
                    q.service_type,
                    COUNT(*) as job_count,
                    SUM(p.amount) as total_revenue,
                    AVG(p.amount) as avg_revenue,
                    AVG(r.rating) as avg_rating,
                    COUNT(r.id) as review_count
                 FROM quotes q
                 LEFT JOIN payments p ON q.id = p.quote_id AND p.vendor_id = $1 AND p.status = 'completed'
                 LEFT JOIN reviews r ON p.quote_id = r.quote_id
                 WHERE p.vendor_id = $1
                 GROUP BY q.service_type
                 ORDER BY total_revenue DESC
                 LIMIT $2
            `;
            
            const result = await pool.query(query, [vendorId, limit]);
            return result.rows;
        } catch (error) {
            console.error('Get service category performance error:', error);
            throw error;
        }
    }
    
    // Get customer satisfaction metrics
    async getCustomerSatisfactionMetrics(vendorId, pool, period = 90) {
        try {
            const query = `
                SELECT 
                    AVG(rating) as overall_rating,
                    COUNT(*) as total_reviews,
                    COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
                    COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
                    COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
                    COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
                    COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count,
                    AVG(work_quality) as avg_work_quality,
                    AVG(communication) as avg_communication,
                    AVG(timeliness) as avg_timeliness,
                    AVG(value) as avg_value
                 FROM reviews 
                 WHERE vendor_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '${period} days'
            `;
            
            const result = await pool.query(query, [vendorId]);
            const data = result.rows[0] || {};
            
            return {
                overall: {
                    rating: data.overall_rating || 0,
                    totalReviews: data.total_reviews || 0,
                    satisfactionRate: data.total_reviews > 0 ? 
                        ((data.five_star_count + data.four_star_count) / data.total_reviews * 100).toFixed(1) : 0
                },
                ratingBreakdown: {
                    fiveStar: data.five_star_count || 0,
                    fourStar: data.four_star_count || 0,
                    threeStar: data.three_star_count || 0,
                    twoStar: data.two_star_count || 0,
                    oneStar: data.one_star_count || 0
                },
                detailedRatings: {
                    workQuality: data.avg_work_quality || 0,
                    communication: data.avg_communication || 0,
                    timeliness: data.avg_timeliness || 0,
                    value: data.avg_value || 0
                }
            };
        } catch (error) {
            console.error('Get customer satisfaction metrics error:', error);
            throw error;
        }
    }
    
    // Get competitor analysis
    async getCompetitorAnalysis(vendorId, pool, serviceType, location) {
        try {
            const query = `
                SELECT 
                    u.id,
                    u.name,
                    u.company,
                    u.rating,
                    COUNT(p.id) as completed_jobs,
                    AVG(p.amount) as avg_job_value,
                    COUNT(r.id) as total_reviews
                 FROM users u
                 LEFT JOIN payments p ON u.id = p.vendor_id AND p.status = 'completed'
                 LEFT JOIN reviews r ON u.id = r.vendor_id
                 WHERE u.user_type = 'vendor' 
                 AND u.trade_category = $1
                 AND u.postcode ILIKE $2
                 AND u.id != $3
                 GROUP BY u.id, u.name, u.company, u.rating
                 ORDER BY u.rating DESC, completed_jobs DESC
                 LIMIT 10
            `;
            
            const result = await pool.query(query, [serviceType, `%${location}%`, vendorId]);
            return result.rows;
        } catch (error) {
            console.error('Get competitor analysis error:', error);
            throw error;
        }
    }
    
    // Generate performance report
    async generatePerformanceReport(vendorId, pool, reportType = 'monthly') {
        try {
            const period = reportType === 'monthly' ? 30 : reportType === 'quarterly' ? 90 : 365;
            
            const metrics = await this.calculateVendorMetrics(vendorId, pool, period);
            const trends = await this.getMonthlyRevenueTrends(vendorId, pool, 12);
            const services = await this.getServiceCategoryPerformance(vendorId, pool);
            const satisfaction = await this.getCustomerSatisfactionMetrics(vendorId, pool);
            
            return {
                reportType,
                period: `${period} days`,
                generated: new Date(),
                metrics,
                trends,
                topServices: services,
                satisfaction,
                recommendations: this.generateRecommendations(metrics)
            };
        } catch (error) {
            console.error('Generate performance report error:', error);
            throw error;
        }
    }
    
    // Generate AI-powered recommendations
    generateRecommendations(metrics) {
        const recommendations = [];
        
        // Revenue recommendations
        if (metrics.revenue.total_revenue < 5000) {
            recommendations.push({
                type: 'revenue',
                priority: 'high',
                title: 'Increase Job Volume',
                description: 'Consider bidding on more quotes to increase monthly revenue',
                action: 'Browse available quotes in your area'
            });
        }
        
        // Conversion rate recommendations
        if (metrics.conversion.conversion_rate < 20) {
            recommendations.push({
                type: 'conversion',
                priority: 'high',
                title: 'Improve Bid Quality',
                description: 'Your conversion rate is below average. Consider improving your proposals',
                action: 'Add detailed descriptions and competitive pricing'
            });
        }
        
        // Response time recommendations
        if (metrics.responseTime.avg_response_minutes > 60) {
            recommendations.push({
                type: 'response',
                priority: 'medium',
                title: 'Faster Response Times',
                description: 'Quicker responses increase conversion rates',
                action: 'Set up mobile notifications for new quotes'
            });
        }
        
        // Review recommendations
        if (metrics.reviews.total_reviews < 5) {
            recommendations.push({
                type: 'reviews',
                priority: 'medium',
                title: 'Gather More Reviews',
                description: 'More reviews build trust and attract customers',
                action: 'Request reviews from satisfied customers'
            });
        }
        
        return recommendations;
    }
    
    // Export data to CSV
    exportToCSV(data, filename) {
        const fs = require('fs').promises;
        
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => `"${row[header] || ''}"`).join(',')
        );
        
        const csv = [csvHeaders, ...csvRows].join('\n');
        return csv;
    }
}

module.exports = new AnalyticsService();