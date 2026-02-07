const express = require('express');
const router = express.Router();
const { authenticate, requireCustomer } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

let cachedVendorColumns = null;

const getVendorColumns = async () => {
  if (cachedVendorColumns) return cachedVendorColumns;
  try {
    const result = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors'`
    );
    cachedVendorColumns = new Set(result.rows.map((row) => row.column_name));
  } catch (error) {
    console.warn('Vendor columns lookup failed:', error);
    cachedVendorColumns = new Set();
  }
  return cachedVendorColumns;
};

const ensureSavedTradesTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS saved_trades (
      id VARCHAR(60) PRIMARY KEY,
      user_id VARCHAR(60) NOT NULL,
      vendor_id VARCHAR(60) NOT NULL,
      saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_trades_user_vendor
     ON saved_trades(user_id, vendor_id)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_saved_trades_user
     ON saved_trades(user_id)`
  );
};

router.use(authenticate);
router.use(requireCustomer);

router.get('/', async (req, res) => {
  try {
    const customerId = req.user.userId;
    await ensureSavedTradesTable();

    const vendorColumns = await getVendorColumns();
    const ratingField = vendorColumns.has('average_rating')
      ? 'v.average_rating'
      : vendorColumns.has('rating')
        ? 'v.rating'
        : 'NULL';
    const reviewsField = vendorColumns.has('reviews_count') ? 'v.reviews_count' : '0';
    const jobsField = vendorColumns.has('jobs_completed')
      ? 'v.jobs_completed'
      : vendorColumns.has('completed_jobs')
        ? 'v.completed_jobs'
        : '0';
    const verifiedField = vendorColumns.has('verified')
      ? 'v.verified'
      : vendorColumns.has('is_verified')
        ? 'v.is_verified'
        : 'false';
    const topRatedField = vendorColumns.has('top_rated') ? 'v.top_rated' : 'false';
    const taglineField = vendorColumns.has('tagline')
      ? 'v.tagline'
      : vendorColumns.has('company_tagline')
        ? 'v.company_tagline'
        : vendorColumns.has('bio')
          ? 'v.bio'
          : 'NULL';
    const avatarField = vendorColumns.has('avatar_url')
      ? 'v.avatar_url'
      : vendorColumns.has('logo_url')
        ? 'v.logo_url'
        : 'NULL';

    const locationParts = [];
    if (vendorColumns.has('postcode')) locationParts.push('v.postcode');
    if (vendorColumns.has('location')) locationParts.push('v.location');
    if (vendorColumns.has('city')) locationParts.push('v.city');
    locationParts.push('u.postcode');
    const locationField = `COALESCE(${locationParts.join(', ')})`;

    const categoryField = vendorColumns.has('service_type')
      ? 'v.service_type'
      : vendorColumns.has('trade_type')
        ? 'v.trade_type'
        : vendorColumns.has('category')
          ? 'v.category'
          : 'NULL';

    const result = await pool.query(
      `SELECT
          st.id,
          st.vendor_id,
          st.saved_at,
          COALESCE(v.company_name, u.name) as vendor_name,
          ${categoryField} as category,
          ${locationField} as location,
          ${ratingField} as rating,
          ${reviewsField} as reviews_count,
          ${jobsField} as jobs_completed,
          ${verifiedField} as verified,
          ${topRatedField} as top_rated,
          ${taglineField} as tagline,
          ${avatarField} as avatar_url
       FROM saved_trades st
       LEFT JOIN vendors v ON v.id = st.vendor_id
       LEFT JOIN users u ON u.id = COALESCE(v.user_id, st.vendor_id)
       WHERE st.user_id = $1
       ORDER BY st.saved_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      savedTrades: result.rows.map(row => ({
        id: row.id,
        vendorId: row.vendor_id,
        name: row.vendor_name,
        category: row.category || 'Trade',
        location: row.location || 'Location not set',
        rating: row.rating ? Number(row.rating) : 0,
        reviewCount: Number(row.reviews_count || 0),
        jobsCompleted: Number(row.jobs_completed || 0),
        verified: Boolean(row.verified),
        topRated: Boolean(row.top_rated),
        tagline: row.tagline || 'Trusted TradeMatch professional.',
        avatarUrl: row.avatar_url || null,
        savedDate: row.saved_at
      }))
    });
  } catch (error) {
    console.error('Get saved trades error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve saved trades' });
  }
});

router.post('/', async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'vendorId is required' });
    }

    await ensureSavedTradesTable();

    const existing = await pool.query(
      `SELECT id FROM saved_trades WHERE user_id = $1 AND vendor_id = $2`,
      [customerId, vendorId]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, id: existing.rows[0].id, message: 'Trade already saved' });
    }

    const savedId = `saved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO saved_trades (id, user_id, vendor_id) VALUES ($1, $2, $3)`,
      [savedId, customerId, vendorId]
    );

    res.json({ success: true, id: savedId });
  } catch (error) {
    console.error('Save trade error:', error);
    res.status(500).json({ success: false, error: 'Failed to save trade' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { id } = req.params;

    await ensureSavedTradesTable();

    const result = await pool.query(
      `DELETE FROM saved_trades WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, customerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Saved trade not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete saved trade error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove saved trade' });
  }
});

module.exports = router;
