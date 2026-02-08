const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = (pool) => {
  const PACKAGES = {
    starter: { credits: 10, priceInPence: 499 },
    professional: { credits: 25, priceInPence: 1099 },
    business: { credits: 50, priceInPence: 1999 },
    enterprise: { credits: 100, priceInPence: 3499 },
    premium: { credits: 250, priceInPence: 7999 }
  };

  const ensureVendorCreditsRow = async (vendorId) => {
    const result = await pool.query(
      `SELECT id FROM vendor_credits WHERE vendor_id = $1`,
      [vendorId]
    );

    if (result.rows.length === 0) {
      await pool.query(
        `INSERT INTO vendor_credits (vendor_id, available_credits, total_purchased_credits, total_spent_credits)
         VALUES ($1, 0, 0, 0)` ,
        [vendorId]
      );
    }
  };

  const ledgerEntryExists = async (stripeRef, entryType) => {
    const result = await pool.query(
      `SELECT 1 FROM finance_ledger_entries WHERE related_stripe_object = $1 AND entry_type = $2 LIMIT 1`,
      [stripeRef, entryType]
    );
    return result.rows.length > 0;
  };

  const createLedgerEntry = async ({
    userId,
    amountCents,
    currency = 'GBP',
    entryType,
    reasonCode,
    stripeRef,
    metadata = {}
  }) => {
    await pool.query(
      `INSERT INTO finance_ledger_entries
        (id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_by, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [require('crypto').randomUUID(), stripeRef, userId, amountCents, currency, entryType, reasonCode, 'system', JSON.stringify(metadata)]
    );
  };
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

      const pkg = PACKAGES[packageId];
      if (!pkg) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pkg.priceInPence,
        currency: 'gbp',
        metadata: {
          purchase_type: 'credit_purchase',
          vendor_id: vendorId.toString(),
          package_id: packageId,
          credits: pkg.credits.toString()
        }
      });

      // Store purchase record
      const purchaseResult = await pool.query(
        `INSERT INTO credit_purchases (
          vendor_id, credits_purchased, amount_paid, price_per_credit,
          payment_method, stripe_payment_intent_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
        RETURNING id`,
        [
          vendorId,
          pkg.credits,
          pkg.priceInPence / 100,
          (pkg.priceInPence / 100) / pkg.credits,
          'stripe',
          paymentIntent.id,
          JSON.stringify({ packageId, purchase_type: 'credit_purchase' })
        ]
      );

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        purchaseId: purchaseResult.rows[0]?.id,
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

      const credits = parseInt(paymentIntent.metadata.credits, 10);

      const purchaseStatus = await pool.query(
        `SELECT status
         FROM credit_purchases
         WHERE vendor_id = $1 AND stripe_payment_intent_id = $2
         LIMIT 1`,
        [vendorId, paymentIntentId]
      );

      if (purchaseStatus.rows[0]?.status === 'completed') {
        return res.json({
          success: true,
          message: 'Credits already applied',
          creditsAdded: 0
        });
      }

      await ensureVendorCreditsRow(vendorId);

      // Update credit purchase record
      await pool.query(
        `UPDATE credit_purchases 
         SET status = 'completed', completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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

      const entryExists = await ledgerEntryExists(paymentIntentId, 'credit_purchase');
      if (!entryExists) {
        await createLedgerEntry({
          userId: vendorId,
          amountCents: paymentIntent.amount,
          currency: paymentIntent.currency?.toUpperCase() || 'GBP',
          entryType: 'credit_purchase',
          reasonCode: 'credits_purchase',
          stripeRef: paymentIntentId,
          metadata: {
            credits,
            packageId: paymentIntent.metadata.package_id || null
          }
        });
      }

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

  // ==========================================
  // POST /api/credits/checkout
  // Create Stripe Checkout Session for credits
  // ==========================================
  router.post('/checkout', authenticateToken, async (req, res) => {
    try {
      const vendorId = req.user.userId;
      const { packageId } = req.body;

      if (!packageId) {
        return res.status(400).json({ error: 'Package ID required' });
      }

      const pkg = PACKAGES[packageId];
      if (!pkg) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor-credits.html?status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vendor-credits.html?status=cancel`;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: `${pkg.credits} TradeMatch credits`,
                description: 'Lead access credits (platform fees only)'
              },
              unit_amount: pkg.priceInPence
            },
            quantity: 1
          }
        ],
        metadata: {
          purchase_type: 'credit_purchase',
          vendor_id: vendorId.toString(),
          package_id: packageId,
          credits: pkg.credits.toString()
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: req.user.email || undefined
      });

      await pool.query(
        `INSERT INTO credit_purchases (
          vendor_id, credits_purchased, amount_paid, price_per_credit,
          payment_method, stripe_checkout_session_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [
          vendorId,
          pkg.credits,
          pkg.priceInPence / 100,
          (pkg.priceInPence / 100) / pkg.credits,
          'stripe',
          session.id,
          JSON.stringify({ packageId, purchase_type: 'credit_purchase' })
        ]
      );

      res.json({ success: true, sessionId: session.id, url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  return router;
};
