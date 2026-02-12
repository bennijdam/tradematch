const express = require('express');
const nodemailer = require('nodemailer');
const EmailService = require('../services/email.service');
const axios = require('axios');
const router = express.Router();

let pool;
let emailTransporter;

router.setPool = (p) => { pool = p; };
router.setEmailTransporter = (transporter) => { emailTransporter = transporter; };

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

// Middleware to authenticate
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Create bid
router.post('/', authenticate, async (req, res) => {
    const { quoteId, price, message, estimatedDuration, availability } = req.body;
    const vendorId = req.user.userId;
    
    try {
        const errors = [];
        const normalizedQuoteId = typeof quoteId === 'string' ? quoteId.trim() : '';
        const normalizedMessage = typeof message === 'string' ? message.trim() : '';
        const normalizedDuration = typeof estimatedDuration === 'string' ? estimatedDuration.trim() : '';
        const normalizedAvailability = typeof availability === 'string' ? availability.trim() : '';
        const numericPrice = Number(price);

        if (!normalizedQuoteId) {
            errors.push('quoteId is required.');
        }

        if (Number.isNaN(numericPrice) || numericPrice <= 0 || numericPrice > 100000) {
            errors.push('price must be a valid amount.');
        }

        if (normalizedMessage && normalizedMessage.length > 2000) {
            errors.push('message is too long.');
        }

        if (normalizedDuration && normalizedDuration.length > 120) {
            errors.push('estimatedDuration is too long.');
        }

        if (normalizedAvailability && normalizedAvailability.length > 120) {
            errors.push('availability is too long.');
        }

        if (errors.length) {
            return res.status(400).json({ error: 'Invalid bid data', details: errors });
        }

        const quoteCheck = await pool.query(
            'SELECT id, status FROM quotes WHERE id = $1',
            [normalizedQuoteId]
        );

        if (!quoteCheck.rows.length) {
            return res.status(404).json({ error: 'Quote not found' });
        }

        if (quoteCheck.rows[0].status !== 'open') {
            return res.status(409).json({ error: 'Quote is not open for bids' });
        }

        const existingBid = await pool.query(
            'SELECT 1 FROM bids WHERE quote_id = $1 AND vendor_id = $2',
            [normalizedQuoteId, vendorId]
        );

        if (existingBid.rows.length) {
            return res.status(409).json({ error: 'Bid already submitted for this quote' });
        }

        const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO bids (id, quote_id, vendor_id, price, message, estimated_duration, availability, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [
                bidId,
                normalizedQuoteId,
                vendorId,
                numericPrice,
                normalizedMessage || null,
                normalizedDuration || null,
                normalizedAvailability || null
            ]
        );
        
        res.json({ success: true, bidId });

        // Trigger customer notification email about new bid
        try {
            const quoteResult = await pool.query(
                `SELECT q.customer_id, q.title FROM quotes q WHERE q.id = $1`,
                [quoteId]
            );

            if (quoteResult.rows.length > 0) {
                const quote = quoteResult.rows[0];
                
                // Get vendor name
                const vendorResult = await pool.query(
                    'SELECT name FROM users WHERE id = $1',
                    [vendorId]
                );
                const vendorName = vendorResult.rows[0]?.name || 'A tradesperson';
                
                const apiUrl = process.env.API_URL || 'http://localhost:5001';
                await axios.post(`${apiUrl}/api/email/new-bid-notification`, {
                    customerId: quote.customer_id,
                    quoteId,
                    bidAmount: price,
                    vendorName
                }, {
                    timeout: 5000
                });
                console.log('Customer bid notification email queued');
            }
        } catch (emailError) {
            console.error('Failed to trigger customer email:', emailError.message);
            // Don't fail bid creation if email fails
        }
    } catch (error) {
        console.error('Create bid error:', error);
        res.status(500).json({ error: 'Failed to create bid' });
    }
});

// Get vendor's bids
router.get('/my-bids', authenticate, async (req, res) => {
    const vendorId = req.user.userId;
    
    try {
        const result = await pool.query(
            `SELECT b.*, q.title, q.description, q.postcode, q.budget_min, q.budget_max,
                    u.name as customer_name
             FROM bids b
             JOIN quotes q ON b.quote_id = q.id
             JOIN users u ON q.customer_id = u.id
             WHERE b.vendor_id = $1
             ORDER BY b.created_at DESC`,
            [vendorId]
        );
        
        res.json({ success: true, bids: result.rows });
    } catch (error) {
        console.error('Get bids error:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

module.exports = router;