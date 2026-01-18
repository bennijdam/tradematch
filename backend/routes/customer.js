const express = require('express');
const router = express.Router();
const { authenticate, requireCustomer } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

// Apply authentication to all customer routes
router.use(authenticate);
router.use(requireCustomer);

/**
 * GET /api/customer/dashboard
 * Customer dashboard with stats and recent quotes
 */
router.get('/dashboard', async (req, res) => {
  try {
    const customerId = req.user.userId;
    
    // Get customer's quotes with bid counts
    const quotes = await pool.query(
      `SELECT q.*, 
        COUNT(DISTINCT b.id) as bid_count,
        MIN(b.amount) as lowest_bid,
        MAX(b.amount) as highest_bid
       FROM quotes q 
       LEFT JOIN bids b ON q.id = b.quote_id 
       WHERE q.customer_id = $1 
       GROUP BY q.id 
       ORDER BY q.created_at DESC 
       LIMIT 10`,
      [customerId]
    );
    
    // Get customer statistics
    const stats = await pool.query(
      `SELECT 
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN q.status = 'open' THEN 1 END) as open_quotes,
        COUNT(CASE WHEN q.status = 'accepted' THEN 1 END) as accepted_quotes,
        COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed_jobs,
        COALESCE(SUM(p.amount), 0) as total_spent
       FROM quotes q
       LEFT JOIN payments p ON q.id = p.quote_id AND p.status = 'paid'
       WHERE q.customer_id = $1`,
      [customerId]
    );
    
    // Get recent activity
    const activity = await pool.query(
      `SELECT 'bid' as type, b.created_at, v.company_name as vendor_name, q.title as quote_title
       FROM bids b
       JOIN vendors v ON b.vendor_id = v.id
       JOIN quotes q ON b.quote_id = q.id
       WHERE q.customer_id = $1
       UNION ALL
       SELECT 'quote' as type, q.created_at, NULL as vendor_name, q.title as quote_title
       FROM quotes q
       WHERE q.customer_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [customerId]
    );
    
    res.json({
      success: true,
      data: {
        quotes: quotes.rows,
        stats: stats.rows[0],
        recentActivity: activity.rows
      }
    });
    
  } catch (error) {
    console.error('Customer dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to load dashboard data' 
    });
  }
});

/**
 * GET /api/customer/quotes
 * List all customer's quotes
 */
router.get('/quotes', async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;
    
    let query = `SELECT q.*, COUNT(b.id) as bid_count 
                 FROM quotes q 
                 LEFT JOIN bids b ON q.id = b.quote_id 
                 WHERE q.customer_id = $1`;
    const params = [customerId];
    
    if (status) {
      params.push(status);
      query += ` AND q.status = $${params.length}`;
    }
    
    query += ` GROUP BY q.id ORDER BY q.created_at DESC`;
    
    const offset = (page - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM quotes WHERE customer_id = $1',
      [customerId]
    );
    
    res.json({
      success: true,
      quotes: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve quotes' 
    });
  }
});

/**
 * GET /api/customer/quotes/:quoteId
 * Get single quote with all bids
 */
router.get('/quotes/:quoteId', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const customerId = req.user.userId;
    
    // Get quote details
    const quoteResult = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2',
      [quoteId, customerId]
    );
    
    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Quote not found' 
      });
    }
    
    // Get bids for this quote
    const bidsResult = await pool.query(
      `SELECT b.*, v.company_name, v.phone, v.email, v.rating, v.reviews_count
       FROM bids b
       JOIN vendors v ON b.vendor_id = v.id
       WHERE b.quote_id = $1
       ORDER BY b.amount ASC`,
      [quoteId]
    );
    
    res.json({
      success: true,
      quote: quoteResult.rows[0],
      bids: bidsResult.rows
    });
    
  } catch (error) {
    console.error('Get quote detail error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve quote details' 
    });
  }
});

/**
 * GET /api/customer/payments
 * Customer's payment history
 */
router.get('/payments', async (req, res) => {
  try {
    const customerId = req.user.userId;
    
    const result = await pool.query(
      `SELECT p.*, q.title as quote_title, v.company_name as vendor_name
       FROM payments p
       JOIN quotes q ON p.quote_id = q.id
       JOIN bids b ON p.bid_id = b.id
       JOIN vendors v ON b.vendor_id = v.id
       WHERE q.customer_id = $1
       ORDER BY p.created_at DESC`,
      [customerId]
    );
    
    res.json({
      success: true,
      payments: result.rows
    });
    
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve payments' 
    });
  }
});

/**
 * GET /api/customer/reviews
 * Customer's submitted reviews
 */
router.get('/reviews', async (req, res) => {
  try {
    const customerId = req.user.userId;
    
    const result = await pool.query(
      `SELECT r.*, v.company_name as vendor_name, q.title as quote_title
       FROM reviews r
       JOIN vendors v ON r.vendor_id = v.id
       JOIN quotes q ON r.quote_id = q.id
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [customerId]
    );
    
    res.json({
      success: true,
      reviews: result.rows
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
 * PUT /api/customer/profile
 * Update customer profile
 */
router.put('/profile', async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { name, phone, address, postcode } = req.body;
    
    await pool.query(
      `UPDATE users 
       SET name = $1, phone = $2, address = $3, postcode = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [name, phone, address, postcode, customerId]
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
 * POST /api/customer/accept-bid
 * Accept a bid for a quote
 */
router.post('/accept-bid', async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { bidId, quoteId } = req.body;
    
    // Verify quote belongs to customer
    const quoteCheck = await pool.query(
      'SELECT * FROM quotes WHERE id = $1 AND customer_id = $2',
      [quoteId, customerId]
    );
    
    if (quoteCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }
    
    // Update bid status
    await pool.query(
      'UPDATE bids SET status = $1 WHERE id = $2',
      ['accepted', bidId]
    );
    
    // Update quote status
    await pool.query(
      'UPDATE quotes SET status = $1, accepted_bid_id = $2 WHERE id = $3',
      ['accepted', bidId, quoteId]
    );
    
    // Reject other bids
    await pool.query(
      'UPDATE bids SET status = $1 WHERE quote_id = $2 AND id != $3',
      ['rejected', quoteId, bidId]
    );
    
    res.json({
      success: true,
      message: 'Bid accepted successfully'
    });
    
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to accept bid' 
    });
  }
});

module.exports = router;
