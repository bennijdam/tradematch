const express = require('express');
const router = express.Router();
const { authenticate, requireVendor } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

// Apply authentication to all vendor routes
router.use(authenticate);
router.use(requireVendor);

/**
 * GET /api/vendor/dashboard
 * Vendor dashboard with available quotes and stats
 */
router.get('/dashboard', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    // Get vendor details
    const vendorDetails = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [vendorId]
    );
    
    if (vendorDetails.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Vendor not found' 
      });
    }
    
    const vendor = vendorDetails.rows[0];
    const vendorPostcodePrefix = vendor.postcode ? vendor.postcode.substring(0, 2) : '';
    
    // Get available quotes in vendor's area
    const availableQuotes = await pool.query(
      `SELECT q.*, u.name as customer_name, u.postcode as customer_postcode
       FROM quotes q
       JOIN users u ON q.customer_id = u.id
       WHERE q.status = 'open'
       AND q.postcode LIKE $1
       AND NOT EXISTS (
         SELECT 1 FROM bids WHERE quote_id = q.id AND vendor_id = $2
       )
       ORDER BY q.created_at DESC
       LIMIT 20`,
      [`${vendorPostcodePrefix}%`, vendorId]
    );
    
    // Get vendor's active bids
    const myBids = await pool.query(
      `SELECT b.*, q.title, q.service_type, q.postcode, u.name as customer_name
       FROM bids b
       JOIN quotes q ON b.quote_id = q.id
       JOIN users u ON q.customer_id = u.id
       WHERE b.vendor_id = $1
       AND b.status IN ('pending', 'accepted')
       ORDER BY b.created_at DESC`,
      [vendorId]
    );
    
    // Get vendor statistics
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_bids,
        COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bids,
        COUNT(CASE WHEN b.status = 'accepted' THEN 1 END) as won_bids,
        COUNT(CASE WHEN b.status = 'rejected' THEN 1 END) as lost_bids,
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amount END), 0) as total_earnings,
        COUNT(DISTINCT CASE WHEN p.status = 'paid' THEN p.id END) as completed_jobs
       FROM bids b
       LEFT JOIN payments p ON b.id = p.bid_id
       WHERE b.vendor_id = $1`,
      [vendorId]
    );
    
    // Calculate win rate
    const totalBids = parseInt(stats.rows[0].total_bids);
    const wonBids = parseInt(stats.rows[0].won_bids);
    const winRate = totalBids > 0 ? ((wonBids / totalBids) * 100).toFixed(1) : 0;
    
    res.json({
      success: true,
      data: {
        vendor: vendor,
        availableQuotes: availableQuotes.rows,
        myBids: myBids.rows,
        stats: {
          ...stats.rows[0],
          win_rate: winRate
        }
      }
    });
    
  } catch (error) {
    console.error('Vendor dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load dashboard data' 
    });
  }
});

/**
 * GET /api/vendor/available-quotes
 * Get quotes available for bidding
 */
router.get('/available-quotes', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { serviceType, page = 1, limit = 20 } = req.query;
    
    // Get vendor's postcode prefix
    const vendorData = await pool.query(
      'SELECT postcode FROM vendors WHERE id = $1',
      [vendorId]
    );
    
    const vendorPostcodePrefix = vendorData.rows[0]?.postcode?.substring(0, 2) || '';
    
    let query = `SELECT q.*, u.name as customer_name, u.postcode as customer_postcode,
                 COUNT(b.id) as bid_count
                 FROM quotes q
                 JOIN users u ON q.customer_id = u.id
                 LEFT JOIN bids b ON q.id = b.quote_id
                 WHERE q.status = 'open'
                 AND q.postcode LIKE $1
                 AND NOT EXISTS (
                   SELECT 1 FROM bids WHERE quote_id = q.id AND vendor_id = $2
                 )`;
    
    const params = [`${vendorPostcodePrefix}%`, vendorId];
    
    if (serviceType) {
      params.push(serviceType);
      query += ` AND q.service_type = $${params.length}`;
    }
    
    query += ` GROUP BY q.id, u.name, u.postcode ORDER BY q.created_at DESC`;
    
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      quotes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get available quotes error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve quotes' 
    });
  }
});

/**
 * GET /api/vendor/my-bids
 * Get vendor's bid history
 */
router.get('/my-bids', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = `SELECT b.*, q.title, q.service_type, q.postcode, 
                 q.status as quote_status, u.name as customer_name
                 FROM bids b
                 JOIN quotes q ON b.quote_id = q.id
                 JOIN users u ON q.customer_id = u.id
                 WHERE b.vendor_id = $1`;
    
    const params = [vendorId];
    
    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }
    
    query += ` ORDER BY b.created_at DESC`;
    
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      bids: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve bids' 
    });
  }
});

/**
 * GET /api/vendor/earnings
 * Get vendor's earnings and payment history
 */
router.get('/earnings', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    // Get payments
    const payments = await pool.query(
      `SELECT p.*, q.title as quote_title, u.name as customer_name
       FROM payments p
       JOIN bids b ON p.bid_id = b.id
       JOIN quotes q ON p.quote_id = q.id
       JOIN users u ON q.customer_id = u.id
       WHERE b.vendor_id = $1
       AND p.status = 'paid'
       ORDER BY p.created_at DESC`,
      [vendorId]
    );
    
    // Get earnings summary
    const summary = await pool.query(
      `SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_earned,
        COALESCE(AVG(amount), 0) as avg_payment,
        COALESCE(MAX(amount), 0) as highest_payment
       FROM payments p
       JOIN bids b ON p.bid_id = b.id
       WHERE b.vendor_id = $1
       AND p.status = 'paid'`,
      [vendorId]
    );
    
    // Get monthly earnings (last 6 months)
    const monthlyEarnings = await pool.query(
      `SELECT 
        DATE_TRUNC('month', p.created_at) as month,
        COUNT(*) as jobs,
        SUM(p.amount) as earnings
       FROM payments p
       JOIN bids b ON p.bid_id = b.id
       WHERE b.vendor_id = $1
       AND p.status = 'paid'
       AND p.created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', p.created_at)
       ORDER BY month DESC`,
      [vendorId]
    );
    
    res.json({
      success: true,
      payments: payments.rows,
      summary: summary.rows[0],
      monthlyEarnings: monthlyEarnings.rows
    });
    
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve earnings' 
    });
  }
});

/**
 * GET /api/vendor/reviews
 * Get vendor's reviews
 */
router.get('/reviews', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    
    const reviews = await pool.query(
      `SELECT r.*, u.name as customer_name, q.title as quote_title
       FROM reviews r
       JOIN users u ON r.customer_id = u.id
       JOIN quotes q ON r.quote_id = q.id
       WHERE r.vendor_id = $1
       ORDER BY r.created_at DESC`,
      [vendorId]
    );
    
    // Get rating summary
    const summary = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(overall_rating), 0) as average_rating,
        COUNT(CASE WHEN overall_rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN overall_rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN overall_rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN overall_rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN overall_rating = 1 THEN 1 END) as one_star
       FROM reviews
       WHERE vendor_id = $1`,
      [vendorId]
    );
    
    res.json({
      success: true,
      reviews: reviews.rows,
      summary: summary.rows[0]
    });
    
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve reviews' 
    });
  }
});

/**
 * PUT /api/vendor/profile
 * Update vendor profile
 */
router.put('/profile', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { 
      company_name, 
      phone, 
      email, 
      postcode, 
      service_areas, 
      services, 
      description,
      years_experience 
    } = req.body;
    
    await pool.query(
      `UPDATE vendors 
       SET company_name = $1, phone = $2, email = $3, postcode = $4,
           service_areas = $5, services = $6, description = $7,
           years_experience = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [company_name, phone, email, postcode, service_areas, services, 
       description, years_experience, vendorId]
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile' 
    });
  }
});

/**
 * POST /api/vendor/respond-to-review
 * Respond to a customer review
 */
router.post('/respond-to-review', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { reviewId, response } = req.body;
    
    // Verify review belongs to this vendor
    const reviewCheck = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND vendor_id = $2',
      [reviewId, vendorId]
    );
    
    if (reviewCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    await pool.query(
      'UPDATE reviews SET vendor_response = $1, response_date = CURRENT_TIMESTAMP WHERE id = $2',
      [response, reviewId]
    );
    
    res.json({
      success: true,
      message: 'Response posted successfully'
    });
    
  } catch (error) {
    console.error('Respond to review error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to post response' 
    });
  }
});

/**
 * POST /api/vendor/update-availability
 * Update vendor availability
 */
router.post('/update-availability', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { available, unavailable_until } = req.body;
    
    await pool.query(
      'UPDATE vendors SET available = $1, unavailable_until = $2 WHERE id = $3',
      [available, unavailable_until, vendorId]
    );
    
    res.json({
      success: true,
      message: 'Availability updated successfully'
    });
    
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update availability' 
    });
  }
});

module.exports = router;
