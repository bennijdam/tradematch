const express = require('express');
const router = express.Router();
const EmailService = require('../services/email.service');

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
    
    // Send email notifications for bid acceptance
    try {
      const emailService = new EmailService();
      if (emailService) {
        // Get bid details with vendor and customer info
        const bidDetails = await pool.query(`
          SELECT b.*, q.service_type, q.title as quote_title,
                 v.name as vendor_name, v.email as vendor_email,
                 c.name as customer_name, c.email as customer_email
          FROM bids b
          JOIN quotes q ON b.quote_id = q.id
          JOIN users v ON b.vendor_id = v.id
          JOIN users c ON q.customer_id = c.id
          WHERE b.id = $1
        `, [bidId]);
        
        if (bidDetails.rows.length > 0) {
          const bid = bidDetails.rows[0];
          
          // Send notification to vendor
          await emailService.sendEmail({
            to: bid.vendor_email,
            subject: `🎉 Bid Accepted! ${bid.service_type} Project - TradeMatch`,
            html: `
              <h2>🎉 Bid Accepted!</h2>
              <p>Hi ${bid.vendor_name},</p>
              <p>Excellent news! A customer has accepted your bid for their project.</p>
              
              <div style="background: #f0f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>💰 Project Details:</h3>
                <p><strong>Service:</strong> ${bid.service_type}</p>
                <p><strong>Customer:</strong> ${bid.customer_name}</p>
                <p><strong>Your Bid:</strong> £${bid.price}</p>
                <p><strong>Quote ID:</strong> ${quoteId}</p>
              </div>
              
              <div style="background: #e8f5ea; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>📞 Next Steps:</h3>
                <ol>
                  <li>Contact customer to discuss project details and timeline</li>
                  <li>Confirm start date and project scope</li>
                  <li>Use TradeMatch messaging for all communications</li>
                  <li>Complete work to customer satisfaction for better reviews</li>
                </ol>
              </div>
              
              <p><strong>💡 Payment:</strong> Payment will be released through TradeMatch escrow upon project completion.</p>
              
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>📊 Build Your Business:</h3>
                <p>Professional work leads to:</p>
                <ul>
                  <li>⭐ Positive customer reviews</li>
                  <li>📈 More job opportunities</li>
                  <li>🔄 Repeat business and referrals</li>
                </ul>
              </div>
              
              <p>Log in to your dashboard to manage project and track payment release.</p>
              <p>Best regards,<br>The TradeMatch Team</p>
            `,
            text: `Congratulations! Your bid of £${bid.price} has been accepted for ${bid.service_type} project.`
          });
          
          // Send notification to customer
          await emailService.sendEmail({
            to: bid.customer_email,
            subject: `Great News! ${bid.vendor_name} Accepted Your Bid`,
            html: `
              <h2>🎊 Your Bid Was Accepted!</h2>
              <p>Hi ${bid.customer_name},</p>
              <p>Great news! ${bid.vendor_name} has been selected for your ${bid.service_type} project with a bid of £${bid.price}.</p>
              
              <div style="background: #f0f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>🤝 What to Expect:</h3>
                <ul>
                  <li>${bid.vendor_name} will contact you shortly to discuss details</li>
                  <li>Project coordination through TradeMatch messaging system</li>
                  <li>Secure payment processing when work is completed</li>
                  <li>Review and rating opportunities</li>
                </ul>
              </div>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Respond to messages in your TradeMatch dashboard</li>
                <li>Review project details and confirm timeline</li>
                <li>Keep track of project progress</li>
              </ol>
              
              <p>Log in to your dashboard to view project details and communicate with ${bid.vendor_name}.</p>
              <p>Best regards,<br>The TradeMatch Team</p>
            `,
            text: `${bid.vendor_name} accepted your bid for ${bid.service_type} project!`
          });
          
          console.log(`📧 Bid acceptance notifications sent to vendor and customer`);
        }
      }
    } catch (emailError) {
      console.error('Bid acceptance email error:', emailError);
      // Continue with bid acceptance even if email fails
    }

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
