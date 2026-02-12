const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LeadPricingService = require('../services/lead-pricing.service');

module.exports = (pool) => {
  const pricingService = new LeadPricingService(pool);

  // ==========================================
  // GET /api/vendor-credits/balance/:vendorId
  // Get vendor's current credit balance
  // ==========================================
  router.get('/balance/:vendorId', authenticateToken, async (req, res) => {
    try {
      const { vendorId } = req.params;
      
      // Ensure user can only access their own balance (unless admin)
      if (req.user.userId !== parseInt(vendorId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await pool.query(
        'SELECT * FROM vendor_credit_summary WHERE vendor_id = $1',
        [vendorId]
      );

      if (result.rows.length === 0) {
        // Initialize credits for new vendor
        await pool.query(
          'INSERT INTO vendor_credits (vendor_id, balance, total_purchased, total_spent) VALUES ($1, 0, 0, 0)',
          [vendorId]
        );
        return res.json({ vendorId, balance: 0, totalPurchased: 0, totalSpent: 0, lastPurchase: null });
      }

      const credits = result.rows[0];
      res.json({
        vendorId: credits.vendor_id,
        balance: parseFloat(credits.current_balance),
        totalPurchased: parseFloat(credits.total_purchased),
        totalSpent: parseFloat(credits.total_spent),
        lastPurchase: credits.last_purchase_date
      });

    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({ error: 'Failed to retrieve balance' });
    }
  });

  // ==========================================
  // GET /api/vendor-credits/packages
  // Get available credit packages with pricing
  // ==========================================
  router.get('/packages', authenticateToken, async (req, res) => {
    try {
      const packages = pricingService.getCreditPackages();
      
      res.json({
        packages,
        notes: [
          'Credits never expire',
          'Use credits to view customer leads',
          'Full refunds for invalid leads (see refund policy)',
          'Volume discounts: save up to 15% on bulk purchases'
        ],
        refundPolicy: {
          customer_unresponsive: '100% refund',
          invalid_contact: '100% refund',
          duplicate_lead: '100% refund',
          job_cancelled: '50% refund',
          poor_quality: '50% refund',
          customer_dispute: '75% refund'
        }
      });

    } catch (error) {
      console.error('Get packages error:', error);
      res.status(500).json({ error: 'Failed to retrieve packages' });
    }
  });

  // ==========================================
  // POST /api/vendor-credits/purchase
  // Purchase credits (Stripe integration)
  // ==========================================
  router.post('/purchase', authenticateToken, async (req, res) => {
    try {
      const { packageId, paymentMethodId } = req.body;
      const vendorId = req.user.userId;

      // Validate vendor role
      const userCheck = await pool.query(
        'SELECT user_type FROM users WHERE id = $1',
        [vendorId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].user_type !== 'vendor') {
        return res.status(403).json({ error: 'Only vendors can purchase credits' });
      }

      // Get package details
      const packages = pricingService.getCreditPackages();
      const selectedPackage = packages.find(p => p.name === packageId);

      if (!selectedPackage) {
        return res.status(400).json({ error: 'Invalid package selected' });
      }

      // TODO: Integrate with Stripe payment processing
      // For now, simulate successful payment
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(selectedPackage.cost * 100), // Convert to pence
          currency: 'gbp',
          payment_method: paymentMethodId,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            vendorId,
            packageId,
            credits: selectedPackage.credits
          }
        });
      } catch (stripeError) {
        console.error('Stripe payment failed:', stripeError);
        return res.status(400).json({ 
          error: 'Payment failed', 
          details: stripeError.message 
        });
      }

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ error: 'Payment not completed' });
      }

      // Record purchase in database
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert purchase record
        const purchaseResult = await client.query(
          `INSERT INTO credit_purchases 
           (vendor_id, amount, credits_purchased, payment_method, transaction_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            vendorId,
            selectedPackage.cost,
            selectedPackage.credits,
            'stripe',
            paymentIntent.id,
            'completed'
          ]
        );

        const purchaseId = purchaseResult.rows[0].id;

        // Add credits to vendor balance
        await client.query(
          `INSERT INTO vendor_credits (vendor_id, balance, total_purchased, total_spent)
           VALUES ($1, $2, $2, 0)
           ON CONFLICT (vendor_id) 
           DO UPDATE SET 
             balance = vendor_credits.balance + $2,
             total_purchased = vendor_credits.total_purchased + $2,
             updated_at = CURRENT_TIMESTAMP`,
          [vendorId, selectedPackage.credits]
        );

        // Record transaction
        await client.query(
          `INSERT INTO credit_transactions 
           (vendor_id, amount, transaction_type, description, reference_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            vendorId,
            selectedPackage.credits,
            'purchase',
            `Purchased ${selectedPackage.credits} credits - ${selectedPackage.name}`,
            purchaseId
          ]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Credits purchased successfully',
          purchaseId,
          creditsAdded: selectedPackage.credits,
          amountPaid: selectedPackage.cost,
          transactionId: paymentIntent.id
        });

      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Purchase credits error:', error);
      res.status(500).json({ error: 'Failed to purchase credits', details: error.message });
    }
  });

  // ==========================================
  // GET /api/vendor-credits/transactions/:vendorId
  // Get vendor's credit transaction history
  // ==========================================
  router.get('/transactions/:vendorId', authenticateToken, async (req, res) => {
    try {
      const { vendorId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Ensure user can only access their own transactions
      if (req.user.userId !== parseInt(vendorId) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await pool.query(
        `SELECT 
          id,
          amount,
          transaction_type,
          description,
          reference_id,
          created_at
         FROM credit_transactions
         WHERE vendor_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [vendorId, limit, offset]
      );

      // Get total count for pagination
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM credit_transactions WHERE vendor_id = $1',
        [vendorId]
      );

      res.json({
        transactions: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
  });

  // ==========================================
  // GET /api/vendor-credits/roi-estimate
  // Calculate estimated ROI for lead purchases
  // ==========================================
  router.get('/roi-estimate', authenticateToken, async (req, res) => {
    try {
      const { leadCost = 10, avgJobValue = 500, conversionRate = 0.15 } = req.query;

      const roi = pricingService.estimateROI(
        parseFloat(leadCost),
        parseFloat(avgJobValue),
        parseFloat(conversionRate)
      );

      res.json(roi);

    } catch (error) {
      console.error('ROI estimate error:', error);
      res.status(500).json({ error: 'Failed to calculate ROI' });
    }
  });

  // ==========================================
  // POST /api/vendor-credits/refund
  // Request refund for invalid lead
  // ==========================================
  router.post('/refund', authenticateToken, async (req, res) => {
    try {
      const { distributionId, reason } = req.body;
      const vendorId = req.user.userId;

      // Validate refund reason
      const validReasons = [
        'customer_unresponsive',
        'invalid_contact',
        'duplicate_lead',
        'job_cancelled',
        'poor_quality',
        'customer_dispute'
      ];

      if (!validReasons.includes(reason)) {
        return res.status(400).json({ error: 'Invalid refund reason' });
      }

      // Get distribution record
      const distResult = await pool.query(
        `SELECT * FROM lead_distributions 
         WHERE id = $1 AND vendor_id = $2 AND charged = true AND refunded = false`,
        [distributionId, vendorId]
      );

      if (distResult.rows.length === 0) {
        return res.status(404).json({ error: 'Distribution not found or already refunded' });
      }

      const distribution = distResult.rows[0];
      const originalCost = parseFloat(distribution.lead_cost);

      // Calculate refund amount
      const refundAmount = pricingService.calculateRefundAmount(originalCost, reason);

      // Process refund
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Mark distribution as refunded
        await client.query(
          `UPDATE lead_distributions 
           SET refunded = true, refund_amount = $1, refund_reason = $2, refunded_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [refundAmount, reason, distributionId]
        );

        // Refund credits to vendor
        await client.query(
          `UPDATE vendor_credits 
           SET balance = balance + $1, total_refunded = total_refunded + $1
           WHERE vendor_id = $2`,
          [refundAmount, vendorId]
        );

        // Record transaction
        await client.query(
          `INSERT INTO credit_transactions 
           (vendor_id, amount, transaction_type, description, reference_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            vendorId,
            refundAmount,
            'refund',
            `Refund: ${reason.replace(/_/g, ' ')} (${Math.round(refundAmount / originalCost * 100)}%)`,
            distributionId
          ]
        );

        await client.query('COMMIT');

        res.json({
          success: true,
          message: 'Refund processed successfully',
          refundAmount,
          refundPercentage: Math.round(refundAmount / originalCost * 100),
          reason
        });

      } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Refund error:', error);
      res.status(500).json({ error: 'Failed to process refund', details: error.message });
    }
  });

  return router;
};
