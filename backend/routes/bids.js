const express = require('express');
const nodemailer = require('nodemailer');
const EmailService = require('../services/email.service');
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
        const bidId = `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await pool.query(
            `INSERT INTO bids (id, quote_id, vendor_id, price, message, estimated_duration, availability, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
            [bidId, quoteId, vendorId, price, message, estimatedDuration, availability]
        );
        
        res.json({ success: true, bidId });

        // Get quote and customer details for notification
        const quoteResult = await pool.query(
            `SELECT q.*, u.email as customer_email, u.name as customer_name 
             FROM quotes q 
             JOIN users u ON q.customer_id = u.id 
             WHERE q.id = $1`,
            [quoteId]
        );

        if (quoteResult.rows.length > 0) {
            const quote = quoteResult.rows[0];
            
            // Notify customer about new bid
            sendEmailNotification(
                quote.customer_email,
                'New Bid Received for Your Quote Request',
                `<h2>New Bid Received</h2>
                 <p>Great news! A tradesperson has submitted a bid for your quote request.</p>
                 <p><strong>Quote Title:</strong> ${quote.title}</p>
                 <p><strong>Bid Price:</strong> £${price}</p>
                 <p><strong>Estimated Duration:</strong> ${estimatedDuration || 'Not specified'}</p>
                 <p><strong>Availability:</strong> ${availability || 'Not specified'}</p>
                 <p><strong>Message:</strong> ${message || 'No message provided'}</p>
                 <p>Log in to your account to view this bid and communicate with the tradesperson.</p>`,
                `New bid received for your quote "${quote.title}". Price: £${price}. Log in to view details.`
            );

            // Notify admin about new bid
            sendEmailNotification(
                'admin@tradematch.co.uk',
                'New Bid Submitted',
                `<h2>New Bid Activity</h2>
                 <p><strong>Quote ID:</strong> ${quoteId}</p>
                 <p><strong>Customer:</strong> ${quote.customer_name} (${quote.customer_email})</p>
                 <p><strong>Quote Title:</strong> ${quote.title}</p>
                 <p><strong>Bid Price:</strong> £${price}</p>
                 <p><strong>Vendor ID:</strong> ${vendorId}</p>`,
                `New bid submitted for quote ${quoteId} by vendor ${vendorId}. Price: £${price}.`
            );
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