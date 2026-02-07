const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

const PLAN_PRICE_MAP = {
  verified: process.env.STRIPE_PRICE_VERIFIED,
  postcode_5: process.env.STRIPE_PRICE_POSTCODES_5,
  postcode_15: process.env.STRIPE_PRICE_POSTCODES_15,
  postcode_30: process.env.STRIPE_PRICE_POSTCODES_30
};

router.post('/checkout', authenticate, async (req, res) => {
  try {
    const { planKey } = req.body;
    const priceId = PLAN_PRICE_MAP[planKey];

    if (!priceId) {
      return res.status(400).json({
        error: 'Invalid plan selection',
        code: 'INVALID_PLAN'
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        error: 'Stripe is not configured',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    const origin = req.headers.origin || process.env.APP_BASE_URL || 'http://localhost:3003';
    const successUrl = process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${origin}/vendor-settings.html?checkout=success`;
    const cancelUrl = process.env.STRIPE_CHECKOUT_CANCEL_URL || `${origin}/vendor-settings.html?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: req.user?.userId || undefined,
      metadata: {
        planKey,
        userId: req.user?.userId || ''
      }
    });

    return res.json({
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session'
    });
  }
});

module.exports = router;
