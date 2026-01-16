const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();

let pool;

router.setPool = (p) => {
  pool = p;
};

// ==========================================
// MIDDLEWARE: Authenticate User
// ==========================================
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ==========================================
// CREATE QUOTE
// ==========================================
router.post('/', authenticate, [
  body('serviceType').notEmpty().withMessage('Service type is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('postcode').notEmpty().withMessage('Postcode is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    serviceType,
    title,
    description,
    postcode,
    budgetMin,
    budgetMax,
    urgency,
    additionalDetails,
    photos
  } = req.body;

  try {
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await pool.query(
      `INSERT INTO quotes (
        id, customer_id, service_type, title, description, postcode,
        budget_min, budget_max, urgency, additional_details, photos, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open')`,
      [
        quoteId,
        req.user.userId,
        serviceType,
        title,
        description,
        postcode,
        budgetMin || null,
        budgetMax || null,
        urgency || null,
        additionalDetails ? JSON.stringify(additionalDetails) : null,
        photos ? JSON.stringify(photos) : null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Quote created successfully',
      quoteId
    });
  } catch (error) {
    console.error('Create quote error:', error);
    res.status(500).json({ error: 'Failed to create quote', details: error.message });
  }
});

// ==========================================
// GET ALL QUOTES
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { status, serviceType, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT q.*, u.name as customer_name, u.email as customer_email
      FROM quotes q
      JOIN users u ON q.customer_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND q.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (serviceType) {
      query += ` AND q.service_type = $${paramCount}`;
      params.push(serviceType);
      paramCount++;
    }

    query += ` ORDER BY q.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      quotes: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes', details: error.message });
  }
});

// ==========================================
// GET SINGLE QUOTE
// ==========================================
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT q.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone
       FROM quotes q
       JOIN users u ON q.customer_id = u.id
       WHERE q.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    res.json({
      success: true,
      quote: result.rows[0]
    });
  } catch (error) {
    console.error('Get quote error:', error);
    res.status(500).json({ error: 'Failed to fetch quote', details: error.message });
  }
});

// ==========================================
// UPDATE QUOTE
// ==========================================
router.put('/:id', authenticate, async (req, res) => {
  const { title, description, budgetMin, budgetMax, urgency, status } = req.body;

  try {
    // Check ownership
    const checkResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (checkResult.rows[0].customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to update this quote' });
    }

    // Update quote
    await pool.query(
      `UPDATE quotes 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           budget_min = COALESCE($3, budget_min),
           budget_max = COALESCE($4, budget_max),
           urgency = COALESCE($5, urgency),
           status = COALESCE($6, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [title, description, budgetMin, budgetMax, urgency, status, req.params.id]
    );

    res.json({
      success: true,
      message: 'Quote updated successfully'
    });
  } catch (error) {
    console.error('Update quote error:', error);
    res.status(500).json({ error: 'Failed to update quote', details: error.message });
  }
});

// ==========================================
// DELETE QUOTE
// ==========================================
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Check ownership
    const checkResult = await pool.query(
      'SELECT customer_id FROM quotes WHERE id = $1',
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (checkResult.rows[0].customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this quote' });
    }

    // Delete quote
    await pool.query('DELETE FROM quotes WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      message: 'Quote deleted successfully'
    });
  } catch (error) {
    console.error('Delete quote error:', error);
    res.status(500).json({ error: 'Failed to delete quote', details: error.message });
  }
});

module.exports = router;