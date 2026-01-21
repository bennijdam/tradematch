const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const EmailService = require('../services/email.service');
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

    const result = await pool.query(
      'INSERT INTO quotes (id, customer_id, service_type, title, description, location, postcode, budget_min, budget_max, urgency, status, additional_details, created_at) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [quoteId, null, serviceType, title, description, null, postcode, budgetMin, budgetMax, urgency]
    );

    res.json({
      success: true,
      message: 'Quote request received. We will match you with tradespeople.',
      quote: { id: quoteId, ...req.body }
    });

    sendEmailNotification(
      'admin@tradematch.co.uk',
      'New Quote Request Received',
      `<h2>New Quote Request</h2>
       <p><strong>Quote ID:</strong> ${quoteId}</p>
       <p><strong>Service Type:</strong> ${serviceType}</p>
       <p><strong>Title:</strong> ${title}</p>
       <p><strong>Description:</strong> ${description}</p>
       <p><strong>Postcode:</strong> ${postcode}</p>
       <p><strong>Budget:</strong> £${budgetMin || 'N/A'} - £${budgetMax || 'N/A'}</p>
       <p><strong>Urgency:</strong> ${urgency || 'N/A'}</p>
       ${additionalDetails ? `<p><strong>Additional Details:</strong> ${additionalDetails}</p>` : ''}
       <p>This quote was submitted by a guest user.</p>`,
      `New Quote Request - ID: ${quoteId}\nService: ${serviceType}\nTitle: ${title}\nPostcode: ${postcode}`
    );
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

    // Send email notifications
    try {
      const customerEmail = req.user.email;
      
      // Get customer info
      const customerResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.userId]);
      const customerName = customerResult.rows[0]?.name || 'Customer';
      
      // Find vendors who match this service type and location
      const vendorsResult = await pool.query(`
        SELECT u.name, u.email 
        FROM users u 
        WHERE u.user_type = 'vendor' 
        AND u.status = 'active'
        AND (u.service_areas IS NULL OR $1 = ANY(u.service_areas))
        LIMIT 10
      `, [serviceType]);
      
      // Send confirmation to customer
      const emailService = new EmailService();
      if (emailService) {
        await emailService.sendEmail({
          to: customerEmail,
          subject: 'Your Quote Request is Live - TradeMatch',
          html: `
            <h2>📋 Your Quote is Posted!</h2>
            <p>Hi ${customerName},</p>
            <p>Your quote request for "${title}" has been posted to our network of verified tradespeople.</p>
            
            <div style="background: #e8f5ea; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🎯 What Happens Next:</h3>
              <ul>
                <li>You'll receive multiple quotes from qualified professionals</li>
                <li>Compare bids and choose best fit for your project</li>
                <li>Communicate with tradespeople through our messaging system</li>
                <li>Complete your project with secure payments through our platform</li>
              </ul>
            </div>
            
            <p><strong>Quote ID:</strong> ${quoteId}</p>
            <p>Log in to your dashboard to track progress and manage your project.</p>
            <p>Best regards,<br>The TradeMatch Team</p>
          `,
          text: `Your quote "${title}" has been posted to our network. Quote ID: ${quoteId}`
        });
        
        // Send notifications to matching vendors
        for (const vendor of vendorsResult.rows) {
          await emailService.sendEmail({
            to: vendor.email,
            subject: `New Quote Request: ${title} - TradeMatch`,
            html: `
              <h2>🎉 New Quote Request Received!</h2>
              <p>Hi ${vendor.name},</p>
              <p>Great news! A customer has posted a quote request that matches your expertise:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>${title}</h3>
                <p><strong>Service:</strong> ${serviceType}</p>
                <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
                <p><strong>Quote ID:</strong> ${quoteId}</p>
                <p><strong>Posted:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>💡 Next Steps:</h3>
                <ol>
                  <li>Review customer's requirements carefully</li>
                  <li>Submit your competitive bid with detailed breakdown</li>
                  <li>Include timeline and availability in your response</li>
                  <li>Communicate professionally to secure project</li>
                  <li>Use TradeMatch messaging system for all communications</li>
                </ol>
              </div>
              
              <p><strong>💼 Pro Tip:</strong> Quick, detailed responses with clear pricing help win more jobs. Average response time is under 4 hours!</p>
              
              <p>Log in to your TradeMatch dashboard to view and respond to this opportunity.</p>
              <p>Best of luck!</p>
              <p>The TradeMatch Team</p>
            `,
            text: `New quote request received: ${title}. Please check your dashboard.`
          });
        }
        
        console.log(`📧 Quote notifications sent to ${vendorsResult.rows.length} vendors and customer`);
      }
      
      // Send admin notification using existing method
      sendEmailNotification(
        'admin@tradematch.co.uk',
        'New Quote Request - Registered User',
        `<h2>New Quote Request from Registered User</h2>
         <p><strong>Quote ID:</strong> ${quoteId}</p>
         <p><strong>Customer:</strong> ${customerEmail}</p>
         <p><strong>Service Type:</strong> ${serviceType}</p>
         <p><strong>Title:</strong> ${title}</p>
         <p><strong>Description:</strong> ${description}</p>
         <p><strong>Postcode:</strong> ${postcode}</p>
         <p><strong>Budget:</strong> £${budgetMin || 'N/A'} - £${budgetMax || 'N/A'}</p>
         <p><strong>Urgency:</strong> ${urgency || 'N/A'}</p>
         ${additionalDetails ? `<p><strong>Additional Details:</strong> ${additionalDetails}</p>` : ''}`,
        `New Quote from Registered User - ID: ${quoteId}\nCustomer: ${customerEmail}\nService: ${serviceType}`
      );
      
    } catch (emailError) {
      console.error('Quote notification email error:', emailError);
      // Continue with quote creation even if email fails
    }

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