const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LeadDistributionService = require('../services/lead-distribution.service');
const LeadAcceptanceService = require('../services/lead-acceptance.service');

module.exports = (pool) => {
  const distributionService = new LeadDistributionService(pool);
  const acceptanceService = new LeadAcceptanceService(pool);

  // ==========================================
  // GET /api/leads/offered
  // Get leads offered to vendor (preview mode)
  // ==========================================
  router.get('/offered', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;

      // Verify vendor role
      const userCheck = await pool.query(
        'SELECT user_type FROM users WHERE id = $1',
        [vendorId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
        return res.status(403).json({ error: 'Vendor access only' });
      }

      // Get offered leads (not yet accepted/declined)
      const offeredLeads = await acceptanceService.getOfferedLeads(vendorId);

      res.json({
        success: true,
        count: offeredLeads.length,
        leads: offeredLeads
      });

    } catch (error) {
      console.error('Get offered leads error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch offered leads',
        message: error.message 
      });
    }
  });

  // ==========================================
  // POST /api/leads/:quoteId/accept
  // Vendor accepts a lead (charges payment, unlocks details)
  // ==========================================
  router.post('/:quoteId/accept', authenticateToken, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const vendorId = req.user.userId;

      // Verify vendor role
      const userCheck = await pool.query(
        'SELECT user_type FROM users WHERE id = $1',
        [vendorId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
        return res.status(403).json({ error: 'Vendor access only' });
      }

      // Accept the lead
      const result = await acceptanceService.acceptLead(quoteId, vendorId, false);

      res.json(result);

    } catch (error) {
      console.error('Accept lead error:', error);
      res.status(400).json({ 
        error: 'Failed to accept lead',
        message: error.message 
      });
    }
  });

  // ==========================================
  // POST /api/leads/:quoteId/decline
  // Vendor declines a lead (no charge)
  // ==========================================
  router.post('/:quoteId/decline', authenticateToken, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const vendorId = req.user.userId;
      const { reason } = req.body;

      // Verify vendor role
      const userCheck = await pool.query(
        'SELECT user_type FROM users WHERE id = $1',
        [vendorId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
        return res.status(403).json({ error: 'Vendor access only' });
      }

      // Decline the lead
      const result = await acceptanceService.declineLead(quoteId, vendorId, reason);

      res.json(result);

    } catch (error) {
      console.error('Decline lead error:', error);
      res.status(400).json({ 
        error: 'Failed to decline lead',
        message: error.message 
      });
    }
  });

  // ==========================================
  // GET /api/leads/:quoteId/preview
  // Get lead preview (hidden details)
  // ==========================================
  router.get('/:quoteId/preview', authenticateToken, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const vendorId = req.user.userId;

      // Verify this lead was offered to the vendor
      const distributionCheck = await pool.query(
        'SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
        [quoteId, vendorId]
      );

      if (distributionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found or not offered to you' });
      }

      // Get preview
      const preview = await acceptanceService.generateLeadPreview(quoteId);

      res.json({
        success: true,
        preview
      });

    } catch (error) {
      console.error('Get lead preview error:', error);
      res.status(500).json({ 
        error: 'Failed to get lead preview',
        message: error.message 
      });
    }
  });

  // ==========================================
  // GET /api/leads/available
  // Get leads matched to vendor but not yet accessed
  // (LEGACY - keeping for backward compatibility)
  // ==========================================
  router.get('/available', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { limit = 20, offset = 0 } = req.query;

      // Verify vendor role
      const userCheck = await pool.query(
        'SELECT user_type FROM users WHERE id = $1',
        [vendorId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
        return res.status(403).json({ error: 'Vendor access only' });
      }

      // Get available leads (distributed but not accessed)
      const result = await pool.query(
        `SELECT 
          ld.id as distribution_id,
          ld.quote_id,
          ld.credits_charged as lead_cost,
          ld.match_score,
          ld.distributed_at,
          q.service_type,
          q.title,
          q.postcode,
          q.urgency,
          q.created_at as quote_created,
          lqs.overall_quality_score as overall_score,
          lqs.qualification_level as quality_tier,
          (SELECT COUNT(*) FROM lead_distributions WHERE quote_id = q.id) as total_vendors_matched
         FROM lead_distributions ld
         JOIN quotes q ON ld.quote_id = q.id
         JOIN lead_qualification_scores lqs ON q.id = lqs.quote_id
         WHERE ld.vendor_id = $1 
           AND ld.lead_state = 'offered'
           AND ld.charged = false
           AND q.status = 'open'
         ORDER BY ld.match_score DESC, ld.distributed_at DESC
         LIMIT $2 OFFSET $3`,
        [vendorId, limit, offset]
      );

      // Get vendor's current credit balance
      const balanceResult = await pool.query(
        'SELECT current_balance FROM vendor_credit_summary WHERE vendor_id = $1',
        [vendorId]
      );

      const currentBalance = balanceResult.rows.length > 0 
        ? parseFloat(balanceResult.rows[0].current_balance)
        : 0;

      // Format leads with access affordability
      const leads = result.rows.map(lead => ({
        distributionId: lead.distribution_id,
        quoteId: lead.quote_id,
        cost: parseFloat(lead.lead_cost),
        canAfford: currentBalance >= parseFloat(lead.lead_cost),
        matchScore: lead.match_score,
        distributedAt: lead.distributed_at,
        serviceType: lead.service_type,
        title: lead.title,
        postcode: lead.postcode,
        urgency: lead.urgency,
        qualityScore: lead.overall_score,
        qualityTier: lead.quality_tier,
        customerFirstName: lead.customer_first_name,
        totalVendors: lead.total_vendors_matched,
        quoteCreated: lead.quote_created
      }));

      // Get total count for pagination
      const countResult = await pool.query(
        `SELECT COUNT(*) 
         FROM lead_distributions ld
         JOIN quotes q ON ld.quote_id = q.id
         WHERE ld.vendor_id = $1 
           AND ld.accessed = false
           AND ld.charged = false
           AND q.status = 'open'`,
        [vendorId]
      );

      res.json({
        leads,
        currentBalance,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Get available leads error:', error);
      res.status(500).json({ error: 'Failed to retrieve leads' });
    }
  });

  // ==========================================
  // POST /api/leads/:quoteId/access
  // Vendor pays to access lead details
  // ==========================================
  router.post('/:quoteId/access', authenticateToken, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const vendorId = req.user.userId;

      // Get distribution record
      const distResult = await pool.query(
        `SELECT ld.*, q.status as quote_status
         FROM lead_distributions ld
         JOIN quotes q ON ld.quote_id = q.id
         WHERE ld.quote_id = $1 AND ld.vendor_id = $2`,
        [quoteId, vendorId]
      );

      if (distResult.rows.length === 0) {
        return res.status(404).json({ error: 'Lead not found or not matched to you' });
      }

      const distribution = distResult.rows[0];

      // Check if already accessed
      if (distribution.accessed) {
        return res.status(400).json({ error: 'Lead already accessed' });
      }

      // Check if quote is still open
      if (distribution.quote_status !== 'open') {
        return res.status(400).json({ error: 'Quote is no longer accepting bids' });
      }

      // Check vendor credit balance
      const balanceResult = await pool.query(
        'SELECT current_balance FROM vendor_credit_summary WHERE vendor_id = $1',
        [vendorId]
      );

      const currentBalance = balanceResult.rows.length > 0 
        ? parseFloat(balanceResult.rows[0].current_balance)
        : 0;

      const leadCost = parseFloat(distribution.lead_cost);

      if (currentBalance < leadCost) {
        return res.status(402).json({ 
          error: 'Insufficient credits',
          required: leadCost,
          current: currentBalance,
          needed: leadCost - currentBalance
        });
      }

      // Charge vendor for lead access
      const charged = await distributionService.chargeVendorForLead(
        distribution.id,
        vendorId,
        leadCost
      );

      if (!charged) {
        return res.status(500).json({ error: 'Failed to process payment' });
      }

      // Get full quote details
      const quoteResult = await pool.query(
        `SELECT 
          q.*,
          u.first_name,
          u.last_name,
          u.email,
          u.phone,
          u.email_verified,
          u.phone_verified,
          lqs.overall_score,
          lqs.budget_score,
          lqs.detail_score,
          lqs.urgency_score,
          lqs.customer_score,
          lqs.location_score,
          lqs.quality_tier
         FROM quotes q
         JOIN users u ON q.customer_id = u.id
         LEFT JOIN lead_qualification_scores lqs ON q.id = lqs.quote_id
         WHERE q.id = $1`,
        [quoteId]
      );

      const quote = quoteResult.rows[0];

      res.json({
        success: true,
        message: 'Lead accessed successfully',
        charged: leadCost,
        remainingBalance: currentBalance - leadCost,
        lead: {
          id: quote.id,
          serviceType: quote.service_type,
          title: quote.title,
          description: quote.description,
          postcode: quote.postcode,
          budgetMin: quote.budget_min,
          budgetMax: quote.budget_max,
          urgency: quote.urgency,
          photos: quote.photos,
          createdAt: quote.created_at,
          customer: {
            firstName: quote.first_name,
            lastName: quote.last_name,
            email: quote.email,
            phone: quote.phone,
            emailVerified: quote.email_verified,
            phoneVerified: quote.phone_verified
          },
          qualityScores: {
            overall: quote.overall_score,
            budget: quote.budget_score,
            detail: quote.detail_score,
            urgency: quote.urgency_score,
            customer: quote.customer_score,
            location: quote.location_score,
            tier: quote.quality_tier
          }
        }
      });

    } catch (error) {
      console.error('Access lead error:', error);
      res.status(500).json({ error: 'Failed to access lead', details: error.message });
    }
  });

  // ==========================================
  // GET /api/leads/purchased
  // Get leads vendor has already accessed
  // ==========================================
  router.get('/purchased', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { limit = 50, offset = 0, status } = req.query;

      let statusFilter = '';
      const params = [vendorId, limit, offset];

      if (status && ['open', 'accepted', 'completed'].includes(status)) {
        statusFilter = 'AND q.status = $4';
        params.push(status);
      }

      const result = await pool.query(
        `SELECT 
          ld.id as distribution_id,
          ld.quote_id,
          ld.lead_cost,
          ld.accessed_at,
          ld.refunded,
          ld.refund_amount,
          q.service_type,
          q.title,
          q.postcode,
          q.status as quote_status,
          q.created_at as quote_created,
          lqs.overall_score,
          lqs.quality_tier,
          b.id as bid_id,
          b.amount as bid_amount,
          b.status as bid_status,
          b.created_at as bid_created,
          u.first_name as customer_first_name
         FROM lead_distributions ld
         JOIN quotes q ON ld.quote_id = q.id
         JOIN users u ON q.customer_id = u.id
         LEFT JOIN lead_qualification_scores lqs ON q.id = lqs.quote_id
         LEFT JOIN bids b ON q.id = b.quote_id AND b.vendor_id = $1
         WHERE ld.vendor_id = $1 
           AND ld.accessed = true
           ${statusFilter}
         ORDER BY ld.accessed_at DESC
         LIMIT $2 OFFSET $3`,
        params
      );

      const leads = result.rows.map(lead => ({
        distributionId: lead.distribution_id,
        quoteId: lead.quote_id,
        cost: parseFloat(lead.lead_cost),
        accessedAt: lead.accessed_at,
        refunded: lead.refunded,
        refundAmount: lead.refund_amount ? parseFloat(lead.refund_amount) : null,
        serviceType: lead.service_type,
        title: lead.title,
        postcode: lead.postcode,
        quoteStatus: lead.quote_status,
        qualityScore: lead.overall_score,
        qualityTier: lead.quality_tier,
        hasBid: !!lead.bid_id,
        bidAmount: lead.bid_amount ? parseFloat(lead.bid_amount) : null,
        bidStatus: lead.bid_status,
        bidCreated: lead.bid_created,
        customerFirstName: lead.customer_first_name,
        quoteCreated: lead.quote_created
      }));

      // Get total count
      const countParams = [vendorId];
      if (status && ['open', 'accepted', 'completed'].includes(status)) {
        countParams.push(status);
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) 
         FROM lead_distributions ld
         JOIN quotes q ON ld.quote_id = q.id
         WHERE ld.vendor_id = $1 
           AND ld.accessed = true
           ${statusFilter}`,
        countParams
      );

      res.json({
        leads,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Get purchased leads error:', error);
      res.status(500).json({ error: 'Failed to retrieve purchased leads' });
    }
  });

  // ==========================================
  // GET /api/leads/analytics
  // Vendor performance analytics
  // ==========================================
  router.get('/analytics', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;

      // Get overall stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(DISTINCT ld.id) FILTER (WHERE ld.accessed = true) as total_purchased,
          COUNT(DISTINCT b.id) as total_bids,
          COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'accepted') as total_wins,
          SUM(ld.lead_cost) FILTER (WHERE ld.accessed = true AND NOT ld.refunded) as total_spent,
          SUM(ld.refund_amount) as total_refunded,
          AVG(lqs.overall_score) as avg_lead_quality,
          MIN(ld.accessed_at) as first_purchase,
          MAX(ld.accessed_at) as last_purchase
         FROM lead_distributions ld
         LEFT JOIN bids b ON ld.quote_id = b.quote_id AND b.vendor_id = $1
         LEFT JOIN lead_qualification_scores lqs ON ld.quote_id = lqs.quote_id
         WHERE ld.vendor_id = $1`,
        [vendorId]
      );

      const stats = statsResult.rows[0];
      const totalPurchased = parseInt(stats.total_purchased) || 0;
      const totalBids = parseInt(stats.total_bids) || 0;
      const totalWins = parseInt(stats.total_wins) || 0;
      const totalSpent = parseFloat(stats.total_spent) || 0;
      const totalRefunded = parseFloat(stats.total_refunded) || 0;
      const avgQuality = parseFloat(stats.avg_lead_quality) || 0;

      const conversionRate = totalPurchased > 0 ? (totalBids / totalPurchased * 100) : 0;
      const winRate = totalBids > 0 ? (totalWins / totalBids * 100) : 0;

      // Get quality tier distribution
      const tierResult = await pool.query(
        `SELECT 
          lqs.quality_tier,
          COUNT(*) as count
         FROM lead_distributions ld
         JOIN lead_qualification_scores lqs ON ld.quote_id = lqs.quote_id
         WHERE ld.vendor_id = $1 AND ld.accessed = true
         GROUP BY lqs.quality_tier`,
        [vendorId]
      );

      const tierDistribution = {
        premium: 0,
        standard: 0,
        basic: 0
      };
      tierResult.rows.forEach(row => {
        tierDistribution[row.quality_tier] = parseInt(row.count);
      });

      // Get monthly trend
      const trendResult = await pool.query(
        `SELECT 
          DATE_TRUNC('month', ld.accessed_at) as month,
          COUNT(*) as leads_purchased,
          SUM(ld.lead_cost) as amount_spent,
          COUNT(b.id) as bids_submitted,
          COUNT(b.id) FILTER (WHERE b.status = 'accepted') as wins
         FROM lead_distributions ld
         LEFT JOIN bids b ON ld.quote_id = b.quote_id AND b.vendor_id = $1
         WHERE ld.vendor_id = $1 AND ld.accessed = true
         GROUP BY DATE_TRUNC('month', ld.accessed_at)
         ORDER BY month DESC
         LIMIT 6`,
        [vendorId]
      );

      res.json({
        overview: {
          totalPurchased,
          totalBids,
          totalWins,
          totalSpent,
          totalRefunded,
          netSpent: totalSpent - totalRefunded,
          avgLeadCost: totalPurchased > 0 ? totalSpent / totalPurchased : 0,
          avgLeadQuality: avgQuality,
          conversionRate: conversionRate.toFixed(1),
          winRate: winRate.toFixed(1),
          firstPurchase: stats.first_purchase,
          lastPurchase: stats.last_purchase
        },
        tierDistribution,
        monthlyTrend: trendResult.rows.map(row => ({
          month: row.month,
          leadsPurchased: parseInt(row.leads_purchased),
          amountSpent: parseFloat(row.amount_spent),
          bidsSubmitted: parseInt(row.bids_submitted),
          wins: parseInt(row.wins)
        }))
      });

    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to retrieve analytics' });
    }
  });

  return router;
};
