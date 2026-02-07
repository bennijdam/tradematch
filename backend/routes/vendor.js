const express = require('express');
const router = express.Router();
const { authenticate, requireVendor } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

// Apply authentication to all vendor routes
router.use(authenticate);
router.use(requireVendor);

/**
 * PATCH /api/vendor/onboarding
 * Mark vendor onboarding as completed
 */
router.patch('/onboarding', async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const { completed } = req.body || {};

    if (completed !== true) {
      return res.status(400).json({
        success: false,
        error: 'completed must be true'
      });
    }

    await pool.query(
      `UPDATE users
       SET metadata = COALESCE(metadata, '{}'::jsonb)
         || jsonb_build_object('onboarding_completed', true, 'onboarding_completed_at', NOW())
       WHERE id = $1`,
      [vendorId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Onboarding update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update onboarding status'
    });
  }
});

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

    const errors = [];

    const normalizedCompany = typeof company_name === 'string' ? company_name.trim() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : null;
    const normalizedEmail = typeof email === 'string' ? email.trim() : null;
    const normalizedPostcode = typeof postcode === 'string' ? postcode.trim() : null;
    const normalizedAreas = typeof service_areas === 'string' ? service_areas.trim() : null;
    const normalizedDescription = typeof description === 'string' ? description.trim() : null;
    const normalizedYears = years_experience !== undefined && years_experience !== null
      ? Number(years_experience)
      : null;

    if (company_name !== undefined && (!normalizedCompany || normalizedCompany.length < 2 || normalizedCompany.length > 120)) {
      errors.push('Company name must be between 2 and 120 characters.');
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      errors.push('Email format is invalid.');
    }

    if (normalizedPhone && normalizedPhone.length > 30) {
      errors.push('Phone number is too long.');
    }

    if (normalizedPostcode && normalizedPostcode.length > 12) {
      errors.push('Postcode is too long.');
    }

    if (normalizedAreas && normalizedAreas.length > 500) {
      errors.push('Service areas are too long.');
    }

    if (normalizedDescription && normalizedDescription.length > 1000) {
      errors.push('Description is too long.');
    }

    if (normalizedYears !== null && (Number.isNaN(normalizedYears) || normalizedYears < 0 || normalizedYears > 100)) {
      errors.push('Years of experience must be between 0 and 100.');
    }

    if (services !== undefined && !Array.isArray(services)) {
      errors.push('Services must be an array.');
    }

    if (Array.isArray(services) && services.some((service) => typeof service !== 'string' || service.trim().length === 0 || service.length > 60)) {
      errors.push('Each service must be a non-empty string up to 60 characters.');
    }

    if (!normalizedCompany && !normalizedPhone && !normalizedEmail && !normalizedPostcode && !normalizedAreas && !normalizedDescription && normalizedYears === null && !services) {
      errors.push('At least one field must be provided.');
    }

    if (errors.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid profile data',
        details: errors
      });
    }
    
    await pool.query(
      `UPDATE vendors 
       SET company_name = $1, phone = $2, email = $3, postcode = $4,
           service_areas = $5, services = $6, description = $7,
           years_experience = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        normalizedCompany || null,
        normalizedPhone,
        normalizedEmail,
        normalizedPostcode,
        normalizedAreas,
        Array.isArray(services) ? services.map((service) => service.trim()) : services,
        normalizedDescription,
        normalizedYears,
        vendorId
      ]
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

// ============================================
// NEW: ENHANCED VENDOR DASHBOARD ENDPOINTS
// ============================================

/**
 * GET /api/vendor/overview
 * Dashboard overview statistics
 */
router.get('/overview', async (req, res) => {
    const vendorId = req.user.userId;

    try {
        // Get offered leads count
        const offeredLeadsQuery = await pool.query(
            `SELECT COUNT(*) as count 
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND lead_state = 'offered' 
             AND expires_at > NOW()`,
            [vendorId]
        );

        // Get active jobs count
        const activeJobsQuery = await pool.query(
            `SELECT COUNT(*) as count 
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND lead_state = 'accepted' 
             AND (job_status IS NULL OR job_status NOT IN ('completed', 'lost'))`,
            [vendorId]
        );

        // Get monthly spend
        const monthlySpendQuery = await pool.query(
            `SELECT COALESCE(SUM(credits_charged), 0) as total 
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND payment_charged = TRUE 
             AND DATE_TRUNC('month', accepted_at) = DATE_TRUNC('month', CURRENT_DATE)`,
            [vendorId]
        );

        // Get conversion rate (accepted / offered in last 30 days)
        const conversionQuery = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE lead_state = 'offered') as offered,
                COUNT(*) FILTER (WHERE lead_state = 'accepted') as accepted
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND distributed_at > NOW() - INTERVAL '30 days'`,
            [vendorId]
        );

        const offered = parseInt(conversionQuery.rows[0].offered) || 0;
        const accepted = parseInt(conversionQuery.rows[0].accepted) || 0;
        const conversionRate = offered > 0 ? Math.round((accepted / offered) * 100) : 0;

        // Get average match score
        const matchScoreQuery = await pool.query(
            `SELECT ROUND(AVG(match_score)) as avg_score 
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND distributed_at > NOW() - INTERVAL '30 days'`,
            [vendorId]
        );

        // Get average response time (hours)
        const responseTimeQuery = await pool.query(
            `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (accepted_at - distributed_at)) / 3600)) as avg_hours
             FROM lead_distributions 
             WHERE vendor_id = $1 
             AND accepted_at IS NOT NULL
             AND distributed_at > NOW() - INTERVAL '30 days'`,
            [vendorId]
        );

        // Get wallet balance
        const walletQuery = await pool.query(
            `SELECT balance FROM vendor_credits WHERE vendor_id = $1`,
            [vendorId]
        );

        res.json({
            offeredLeads: parseInt(offeredLeadsQuery.rows[0].count) || 0,
            activeJobs: parseInt(activeJobsQuery.rows[0].count) || 0,
            totalSpendMonth: parseFloat(monthlySpendQuery.rows[0].total) || 0,
            conversionRate,
            avgMatchScore: parseInt(matchScoreQuery.rows[0].avg_score) || 0,
            avgResponseTime: parseInt(responseTimeQuery.rows[0].avg_hours) || 0,
            walletBalance: parseFloat(walletQuery.rows[0]?.balance) || 0
        });

    } catch (err) {
        console.error('Error fetching vendor overview:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/vendor/leads/accepted
 * Get all accepted leads with full customer details
 */
router.get('/leads/accepted', async (req, res) => {
    const vendorId = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT 
                q.id as quote_id,
                q.category,
                q.service,
                q.description,
                q.budget,
                q.timeframe,
                q.postcode,
                q.created_at,
                u.name as customer_name,
                u.email as customer_email,
                u.phone as customer_phone,
                ld.accepted_at,
                ld.credits_charged as lead_price,
                ld.payment_transaction_id,
                ld.job_status,
                ld.match_score,
                ld.distance_miles
             FROM lead_distributions ld
             JOIN quotes q ON q.id = ld.quote_id
             JOIN users u ON u.id = q.user_id
             WHERE ld.vendor_id = $1
             AND ld.lead_state = 'accepted'
             AND ld.payment_charged = TRUE
             ORDER BY ld.accepted_at DESC`,
            [vendorId]
        );

        const jobs = result.rows.map(row => ({
            quoteId: row.quote_id,
            category: row.category || row.service,
            description: row.description,
            budgetRange: row.budget ? `£${row.budget}` : 'Not specified',
            timeframe: row.timeframe || 'Flexible',
            postcode: row.postcode,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            customerPhone: row.customer_phone,
            acceptedAt: row.accepted_at,
            leadPrice: parseFloat(row.lead_price),
            paymentTransactionId: row.payment_transaction_id,
            status: row.job_status || 'contacted',
            matchScore: row.match_score,
            distanceMiles: row.distance_miles
        }));

        res.json(jobs);

    } catch (err) {
        console.error('Error fetching accepted leads:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/vendor/jobs/:quoteId/status
 * Update job status
 */
router.patch('/jobs/:quoteId/status', async (req, res) => {
    const { quoteId } = req.params;
    const { status } = req.body;
    const vendorId = req.user.userId;

    const validStatuses = ['contacted', 'quote_sent', 'quote_accepted', 'in_progress', 'completed', 'lost'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            `UPDATE lead_distributions 
             SET job_status = $1,
                 updated_at = NOW()
             WHERE quote_id = $2 
             AND vendor_id = $3 
             AND lead_state = 'accepted'
             RETURNING *`,
            [status, quoteId, vendorId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found or not accepted by you' });
        }

        // Log status change
        await pool.query(
            `INSERT INTO lead_acceptance_log 
             (quote_id, vendor_id, action, details)
             VALUES ($1, $2, $3, $4)`,
            [
                quoteId,
                vendorId,
                'job_status_updated',
                JSON.stringify({ newStatus: status })
            ]
        );

        res.json({ 
            success: true, 
            message: `Job status updated to: ${status}`,
            job: result.rows[0]
        });

    } catch (err) {
        console.error('Error updating job status:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/vendor/jobs/:quoteId/notes
 * Add private internal note to job
 */
router.post('/jobs/:quoteId/notes', async (req, res) => {
    const { quoteId } = req.params;
    const { note } = req.body;
    const vendorId = req.user.userId;

    if (!note || note.trim().length === 0) {
        return res.status(400).json({ error: 'Note cannot be empty' });
    }

    try {
        // Verify vendor owns this job
        const jobCheck = await pool.query(
            `SELECT 1 FROM lead_distributions 
             WHERE quote_id = $1 AND vendor_id = $2 AND lead_state = 'accepted'`,
            [quoteId, vendorId]
        );

        if (jobCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Create notes table if doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS vendor_job_notes (
                id SERIAL PRIMARY KEY,
                quote_id INTEGER NOT NULL,
                vendor_id INTEGER NOT NULL,
                note TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insert note
        const result = await pool.query(
            `INSERT INTO vendor_job_notes (quote_id, vendor_id, note)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [quoteId, vendorId, note.trim()]
        );

        res.json({ 
            success: true, 
            message: 'Note added',
            note: result.rows[0]
        });

    } catch (err) {
        console.error('Error adding note:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/vendor/auto-accept-rules
 * Get auto-accept settings
 */
router.get('/auto-accept-rules', async (req, res) => {
    const vendorId = req.user.userId;

    try {
        const result = await pool.query(
            `SELECT * FROM vendor_auto_accept_rules WHERE vendor_id = $1`,
            [vendorId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            return res.json({
                enabled: false,
                minMatchScore: 70,
                maxLeadFee: 10.00,
                maxDistance: 15,
                jobTimeframe: 'any',
                minJobBudget: 0,
                maxJobBudget: 10000,
                categories: [],
                dailyLeadLimit: 5,
                weeklyLeadLimit: 20,
                dailySpendCap: 50.00,
                weeklySpendCap: 200.00
            });
        }

        const settings = result.rows[0];
        res.json({
            enabled: settings.enabled,
            minMatchScore: settings.min_match_score,
            maxLeadFee: parseFloat(settings.max_lead_price),
            maxDistance: settings.max_distance_miles,
            jobTimeframe: settings.job_timeframe || 'any',
            minJobBudget: settings.min_job_budget || 0,
            maxJobBudget: settings.max_job_budget || 10000,
            categories: settings.service_categories || [],
            dailyLeadLimit: settings.daily_lead_limit || 5,
            weeklyLeadLimit: settings.weekly_lead_limit || 20,
            dailySpendCap: settings.daily_spend_cap || 50,
            weeklySpendCap: settings.weekly_spend_cap || 200
        });

    } catch (err) {
        console.error('Error fetching auto-accept rules:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/vendor/auto-accept-rules
 * Save/update auto-accept settings
 */
router.post('/auto-accept-rules', async (req, res) => {
    const vendorId = req.user.userId;
    const {
        enabled,
        minMatchScore,
        maxLeadFee,
        maxDistance,
        jobTimeframe,
        minJobBudget,
        maxJobBudget,
        categories,
        dailyLeadLimit,
        weeklyLeadLimit,
        dailySpendCap,
        weeklySpendCap
    } = req.body;

    // Validation
    if (minMatchScore < 0 || minMatchScore > 100) {
        return res.status(400).json({ error: 'Match score must be 0-100' });
    }
    if (maxLeadFee < 0) {
        return res.status(400).json({ error: 'Lead fee must be positive' });
    }
    if (dailySpendCap > weeklySpendCap) {
        return res.status(400).json({ error: 'Daily cap cannot exceed weekly cap' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO vendor_auto_accept_rules (
                vendor_id, enabled, min_match_score, max_lead_price, max_distance_miles,
                job_timeframe, min_job_budget, max_job_budget, service_categories,
                daily_lead_limit, weekly_lead_limit, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (vendor_id) DO UPDATE SET
                enabled = $2,
                min_match_score = $3,
                max_lead_price = $4,
                max_distance_miles = $5,
                job_timeframe = $6,
                min_job_budget = $7,
                max_job_budget = $8,
                service_categories = $9,
                daily_lead_limit = $10,
                weekly_lead_limit = $11,
                updated_at = NOW()
            RETURNING *`,
            [
                vendorId,
                enabled,
                minMatchScore,
                maxLeadFee,
                maxDistance,
                jobTimeframe || 'any',
                minJobBudget || 0,
                maxJobBudget || 10000,
                categories || [],
                dailyLeadLimit || 5,
                weeklyLeadLimit || 20
            ]
        );

        // Update spend limits table
        await pool.query(
            `INSERT INTO vendor_spend_limits (
                vendor_id, daily_cap, weekly_cap, monthly_cap
            ) VALUES ($1, $2, $3, $4)
            ON CONFLICT (vendor_id) DO UPDATE SET
                daily_cap = $2,
                weekly_cap = $3,
                updated_at = NOW()`,
            [vendorId, dailySpendCap, weeklySpendCap, weeklySpendCap * 4]
        );

        // Log the change
        await pool.query(
            `INSERT INTO lead_acceptance_log 
             (vendor_id, action, details)
             VALUES ($1, $2, $3)`,
            [
                vendorId,
                'auto_accept_settings_updated',
                JSON.stringify({ enabled, rules: req.body })
            ]
        );

        res.json({ 
            success: true, 
            message: 'Auto-accept settings saved',
            settings: result.rows[0]
        });

    } catch (err) {
        console.error('Error saving auto-accept rules:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
