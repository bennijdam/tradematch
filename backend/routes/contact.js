const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

let pool;
let emailTransporter;

router.setPool = (p) => { pool = p; };
router.setEmailTransporter = (transporter) => { emailTransporter = transporter; };

const sendContactEmail = async (to, subject, html, text) => {
  if (!emailTransporter) {
    console.warn('Email transporter not configured - skipping contact email');
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
    console.log(`Contact email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send contact email:', error);
  }
};

// POST /api/contact
router.post('/', async (req, res) => {
  const { firstName, lastName, email, phone, subject, message } = req.body;

  try {
    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'email', 'subject', 'message']
      });
    }

    // Store contact message in database (optional)
    const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (pool) {
      await pool.query(
        `INSERT INTO contact_messages (
          id, first_name, last_name, email, phone, subject, message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [contactId, firstName, lastName, email, phone, subject, message, new Date()]
      );
    }

    // Send email notification to admin
    const subjectLine = `New Contact Form Submission: ${subject}`;
    const htmlContent = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Contact ID:</strong> ${contactId}</p>
      <p><strong>Name:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <hr>
      <p><em>Submitted on: ${new Date().toLocaleString()}</em></p>
    `;

    const textContent = `
      New Contact Form Submission
      Contact ID: ${contactId}
      Name: ${firstName} ${lastName}
      Email: ${email}
      Phone: ${phone || 'Not provided'}
      Subject: ${subject}
      Message: ${message}
      Submitted on: ${new Date().toLocaleString()}
    `;

    await sendContactEmail(
      'admin@tradematch.co.uk',
      subjectLine,
      htmlContent,
      textContent
    );

    // Send confirmation email to user
    const userSubject = 'Thank you for contacting TradeMatch';
    const userHtml = `
      <h2>Thank You for Contacting Us</h2>
      <p>Dear ${firstName} ${lastName},</p>
      <p>We have received your message and will get back to you within 24 hours.</p>
      <p><strong>Your message details:</strong></p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong> ${message}</p>
      <p>If you need immediate assistance, please call us at 020 1234 5678.</p>
      <p>Best regards,<br>The TradeMatch Team</p>
    `;

    const userText = `
      Thank You for Contacting TradeMatch
      
      Dear ${firstName} ${lastName},
      
      We have received your message and will get back to you within 24 hours.
      
      Subject: ${subject}
      Message: ${message}
      
      If you need immediate assistance, please call us at 020 1234 5678.
      
      Best regards,
      The TradeMatch Team
    `;

    await sendContactEmail(
      email,
      userSubject,
      userHtml,
      userText
    );

    res.json({
      success: true,
      message: 'Message received successfully',
      contactId
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to process contact form',
      details: error.message 
    });
  }
});

module.exports = router;