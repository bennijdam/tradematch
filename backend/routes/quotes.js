const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const EmailService = require('../services/email.service');
const LeadSystemIntegrationService = require('../services/lead-system-integration.service');
const axios = require('axios');
const router = express.Router();

let pool;
let emailTransporter;

router.setPool = (p) => {
  pool = p;
};

router.setEmailTransporter = (transporter) => {
  emailTransporter = transporter;
};

const sendEmailNotification = async (to, subject, html, text) => {
  if (!emailTransporter) {
    console.warn('Email transporter not configured - skipping email notification');
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@tradematch.co.uk',
      to,
      subject,
      html,
      text
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
};

// ==========================================
// PUBLIC QUOTE ENDPOINT (No Auth Required)
// ==========================================
router.post('/public', [
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

    const guestDetails = additionalDetails || {};
    const guestEmailRaw = (guestDetails.email || '').trim().toLowerCase();
    const guestEmail = guestEmailRaw || `guest_${quoteId}@guest.tradematch.uk`;
    const guestName = (guestDetails.name || 'Guest Customer').trim();
    const guestPhone = (guestDetails.phone || '').trim() || null;

    let customerId;
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [guestEmail]
    );

    if (existingUser.rows.length) {
      customerId = existingUser.rows[0].id;
    } else {
      customerId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const tempPassword = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        `INSERT INTO users (
          id, email, password_hash, name, full_name, user_type, phone, postcode, email_verified, status
        ) VALUES ($1, $2, $3, $4, $5, 'customer', $6, $7, false, 'active')`,
        [
          customerId,
          guestEmail,
          passwordHash,
          guestName,
          guestName,
          guestPhone,
          postcode
        ]
      );
    }

    await pool.query(
      `INSERT INTO quotes (
        id, customer_id, service_type, title, description, postcode,
        budget_min, budget_max, urgency, additional_details, photos, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open')`,
      [
        quoteId,
        customerId,
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

    res.json({
      success: true,
      message: 'Quote request received. We will match you with tradespeople.',
      quote: { id: quoteId, ...req.body }
    });

    // ==========================================
    // LEAD SYSTEM: Auto-process public quotes
    // ==========================================
    (async () => {
      try {
        // Build guest customer profile (minimal verification)
        const guestCustomer = {
          id: null,
          email_verified: false,
          phone_verified: false,
          account_age_days: 0
        };

        // Build quote object
        const quoteData = {
          id: quoteId,
          serviceType,
          title,
          description,
          postcode,
          budgetMin,
          budgetMax,
          urgency,
          photos,
          additionalDetails
        };

        // Process through lead system (qualify → price → distribute → notify)
        const leadService = new LeadSystemIntegrationService(pool, null);
        await leadService.processNewLead(quoteData, guestCustomer);

        console.log(`✅ Public quote ${quoteId} processed successfully through lead system`);

      } catch (leadError) {
        console.error('Lead system processing error:', leadError);
        // Don't fail quote creation if lead processing fails
      }
    })();
  } catch (error) {
    console.error('Create public quote error:', error);
    res.status(500).json({ error: 'Failed to create quote', details: error.message });
  }
});

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

    // ==========================================
    // LEAD SYSTEM: Auto-process through pipeline
    // ==========================================
    (async () => {
      try {
        // Get customer details
        const customerResult = await pool.query(
          'SELECT * FROM users WHERE id = $1',
          [req.user.userId]
        );
        const customer = customerResult.rows[0];

        // Build quote object
        const quoteData = {
          id: quoteId,
          serviceType,
          title,
          description,
          postcode,
          budgetMin,
          budgetMax,
          urgency,
          photos,
          additionalDetails
        };

        // Process through lead system (qualify → price → distribute → notify)
        const leadService = new LeadSystemIntegrationService(pool, null);
        await leadService.processNewLead(quoteData, customer);

        console.log(`✅ Quote ${quoteId} processed successfully through lead system`);

      } catch (leadError) {
        console.error('Lead system processing error:', leadError);
        // Don't fail quote creation if lead processing fails
      }
    })();

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
// GET QUOTES BY CUSTOMER
// ==========================================
router.get('/customer/:customerId', authenticate, async (req, res) => {
  try {
    const { customerId } = req.params;

    if (req.user.userId !== customerId) {
      return res.status(403).json({ error: 'Not authorized to view these quotes' });
    }

    const result = await pool.query(
      `SELECT q.*
       FROM quotes q
       WHERE q.customer_id = $1
       ORDER BY q.created_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      quotes: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get customer quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch customer quotes', details: error.message });
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