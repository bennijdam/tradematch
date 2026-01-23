const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = (pool) => {
  // ==========================================
  // GET /api/credits/balance
  // Get vendor's current credit balance
  // ==========================================
  router.get('/balance', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;

      const result = await pool.query(
        `SELECT 
          available_credits,
          total_purchased_credits,
          total_spent_credits,
          expires_at
         FROM vendor_credits
         WHERE vendor_id = $1`,
        [vendorId]
      );

      if (result.rows.length === 0) {
        // Create initial credit account
        await pool.query(
          `INSERT INTO vendor_credits (vendor_id, available_credits, total_purchased_credits, total_spent_credits)
           VALUES ($1, 0, 0, 0)`,
          [vendorId]
        );

        return res.json({
          success: true,
          availableCredits: 0,
          totalPurchasedCredits: 0,
          totalSpentCredits: 0,
          expiresAt: null
        });
      }

      const account = result.rows[0];

      res.json({
        success: true,
        availableCredits: account.available_credits,
        totalPurchasedCredits: account.total_purchased_credits,
        totalSpentCredits: account.total_spent_credits,
        expiresAt: account.expires_at
      });

    } catch (error) {
      console.error('Error getting credit balance:', error);
      res.status(500).json({ error: 'Failed to get credit balance' });
    }
  });

  // ==========================================
  // GET /api/credits/packages
  // Get available credit packages for purchase
  // ==========================================
  router.get('/packages', async (req, res) => {
    try {
      const packages = [
        {
          id: 'starter',
          credits: 10,
          priceInPence: 499,
          description: 'Perfect for trying out',
          perCredit: 49.9
        },
        {
          id: 'professional',
          credits: 25,
          priceInPence: 1099,
          description: 'Best for active vendors',
          perCredit: 43.96,
          savings: 12
        },
        {
          id: 'business',
          credits: 50,
          priceInPence: 1999,
          description: 'For growing businesses',
          perCredit: 39.98,
          savings: 20
        },
        {
          id: 'enterprise',
          credits: 100,
          priceInPence: 3499,
          description: 'For high-volume vendors',
          perCredit: 34.99,
          savings: 30,
          popular: true
        },
        {
          id: 'premium',
          credits: 250,
          priceInPence: 7999,
          description: 'For enterprise partners',
          perCredit: 31.996,
          savings: 36
        }
      ];

      res.json({
        success: true,
        packages
      });

    } catch (error) {
      console.error('Error getting credit packages:', error);
      res.status(500).json({ error: 'Failed to get packages' });
    }
  });

  // ==========================================
  // POST /api/credits/purchase
  // Purchase credits via Stripe
  // ==========================================
  router.post('/purchase', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { packageId } = req.body;

      if (!packageId) {
        return res.status(400).json({ error: 'Package ID required' });
      }

      const packages = {
        starter: { credits: 10, priceInPence: 499 },
        professional: { credits: 25, priceInPence: 1099 },
        business: { credits: 50, priceInPence: 1999 },
        enterprise: { credits: 100, priceInPence: 3499 },
        premium: { credits: 250, priceInPence: 7999 }
      };

      const pkg = packages[packageId];
      if (!pkg) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pkg.priceInPence,
        currency: 'gbp',
        metadata: {
          vendorId: vendorId.toString(),
          packageId,
          credits: pkg.credits.toString()
        }
      });

      // Store purchase record
      await pool.query(
        `INSERT INTO credit_purchases (
          vendor_id, credits_purchased, amount_paid, price_per_credit,
          payment_method, stripe_payment_intent_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [
          vendorId,
          pkg.credits,
          pkg.priceInPence / 100,
          (pkg.priceInPence / 100) / pkg.credits,
          'stripe',
          paymentIntent.id
        ]
      );

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: pkg.priceInPence / 100,
        currency: 'GBP',
        credits: pkg.credits
      });

    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ error: 'Failed to initiate payment' });
    }
  });

  // ==========================================
  // POST /api/credits/purchase/confirm
  // Confirm credit purchase after payment
  // ==========================================
  router.post('/purchase/confirm', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: 'Payment intent ID required' });
      }

      // Verify payment with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: 'Payment not completed' });
      }

      const credits = parseInt(paymentIntent.metadata.credits);

      // Update credit purchase record
      await pool.query(
        `UPDATE credit_purchases 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $1 AND stripe_payment_intent_id = $2`,
        [vendorId, paymentIntentId]
      );

      // Update vendor credits
      await pool.query(
        `UPDATE vendor_credits 
         SET available_credits = available_credits + $1,
             total_purchased_credits = total_purchased_credits + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE vendor_id = $2`,
        [credits, vendorId]
      );

      res.json({
        success: true,
        message: `${credits} credits purchased successfully`,
        creditsAdded: credits
      });

    } catch (error) {
      console.error('Error confirming purchase:', error);
      res.status(500).json({ error: 'Failed to confirm purchase' });
    }
  });

  // ==========================================
  // GET /api/credits/transaction-history
  // Get credit transaction history
  // ==========================================
  router.get('/transaction-history', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { limit = 50, offset = 0 } = req.query;

      const result = await pool.query(
        `SELECT 
          id,
          credits_purchased,
          amount_paid,
          price_per_credit,
          status,
          completed_at,
          created_at
         FROM credit_purchases
         WHERE vendor_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [vendorId, limit, offset]
      );

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM credit_purchases WHERE vendor_id = $1',
        [vendorId]
      );

      res.json({
        success: true,
        transactions: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error getting transaction history:', error);
      res.status(500).json({ error: 'Failed to get transaction history' });
    }
  });

  // ==========================================
  // GET /api/credits/analytics
  // Get credit usage analytics
  // ==========================================
  router.get('/analytics', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;

      // Get current credits
      const creditsResult = await pool.query(
        `SELECT available_credits, total_spent_credits, total_purchased_credits
         FROM vendor_credits WHERE vendor_id = $1`,
        [vendorId]
      );

      const credits = creditsResult.rows[0] || {
        available_credits: 0,
        total_spent_credits: 0,
        total_purchased_credits: 0
      };

      // Get this month's analytics
      const analyticsResult = await pool.query(
        `SELECT 
          SUM(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE) 
            THEN leads_offered ELSE 0 END) as leads_this_month,
          SUM(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN bids_submitted ELSE 0 END) as bids_this_month,
          SUM(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN jobs_won ELSE 0 END) as jobs_won_this_month,
          SUM(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN credits_spent ELSE 0 END) as credits_spent_this_month,
          SUM(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN revenue_generated ELSE 0 END) as revenue_this_month,
          AVG(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN conversion_rate ELSE NULL END) as avg_conversion_rate,
          AVG(CASE WHEN DATE_TRUNC('month', analytics_date) = DATE_TRUNC('month', CURRENT_DATE)
            THEN roi_percent ELSE NULL END) as avg_roi
         FROM lead_analytics_daily
         WHERE vendor_id = $1`,
        [vendorId]
      );

      const analytics = analyticsResult.rows[0] || {};

      // Calculate ROI
      const creditsSpent = parseInt(analytics.credits_spent_this_month || 0);
      const revenue = parseFloat(analytics.revenue_this_month || 0);
      const estimatedCreditCost = creditsSpent * 0.50; // 1 credit = £0.50 average
      const roi = estimatedCreditCost > 0 ? ((revenue - estimatedCreditCost) / estimatedCreditCost * 100).toFixed(2) : 0;

      res.json({
        success: true,
        creditBalance: {
          available: credits.available_credits,
          totalPurchased: credits.total_purchased_credits,
          totalSpent: credits.total_spent_credits
        },
        thisMonth: {
          leadsOffered: parseInt(analytics.leads_this_month || 0),
          bidsSubmitted: parseInt(analytics.bids_this_month || 0),
          jobsWon: parseInt(analytics.jobs_won_this_month || 0),
          creditsSpent: creditsSpent,
          revenue: parseFloat(analytics.revenue_this_month || 0),
          conversionRate: parseFloat(analytics.avg_conversion_rate || 0).toFixed(2),
          roi: roi + '%'
        }
      });

    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  return router;
};
