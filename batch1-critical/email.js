const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { authenticate } = require('../middleware/auth');
const { emailLimiter } = require('../middleware/rate-limit');

// Email transporter configuration
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email server ready to send messages');
  }
});

/**
 * POST /api/email/send
 * Send general email (authenticated)
 */
router.post('/send', authenticate, emailLimiter, async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, and html or text' 
      });
    }
    
    const info = await transporter.sendMail({
      from: `"TradeMatch" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || '',
      html: html || text
    });
    
    res.json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email' 
    });
  }
});

/**
 * POST /api/email/new-quote-notification
 * Notify vendors of new quote in their area
 */
router.post('/new-quote-notification', async (req, res) => {
  try {
    const { quoteId, quoteTitle, serviceType, postcode, budget } = req.body;
    
    // Get vendors in the area (internal use only, no auth needed)
    let pool = req.app.get('pool');
    if (!pool) {
      const poolModule = require('pg');
      pool = new poolModule.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    }
    
    const postcodePrefix = postcode.substring(0, 2);
    
    const vendors = await pool.query(
      `SELECT email, company_name FROM vendors 
       WHERE postcode LIKE $1 
       AND services @> $2::jsonb 
       AND notifications_enabled = true`,
      [`${postcodePrefix}%`, JSON.stringify([serviceType])]
    );
    
    // Send emails to matching vendors
    const emailPromises = vendors.rows.map(vendor => {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FF385C;">New Quote Available! 🎯</h2>
          <p>Hi ${vendor.company_name},</p>
          <p>A new quote has been posted in your area:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">${quoteTitle}</h3>
            <p><strong>Service:</strong> ${serviceType}</p>
            <p><strong>Location:</strong> ${postcode}</p>
            <p><strong>Budget:</strong> £${budget}</p>
          </div>
          <p>
            <a href="https://tradematch.vercel.app/vendor-dashboard.html" 
               style="display: inline-block; background: #FF385C; color: white; 
                      padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Quote & Submit Bid
            </a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            You're receiving this email because you're registered as a ${serviceType} tradesperson in the ${postcodePrefix} area.
          </p>
        </div>
      `;
      
      return transporter.sendMail({
        from: `"TradeMatch" <${process.env.SMTP_USER}>`,
        to: vendor.email,
        subject: `New ${serviceType} Quote Available in ${postcode}`,
        html
      });
    });
    
    await Promise.all(emailPromises);
    
    res.json({
      success: true,
      message: `Notification sent to ${vendors.rows.length} vendors`
    });
    
  } catch (error) {
    console.error('Quote notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send notifications' 
    });
  }
});

/**
 * POST /api/email/new-bid-notification
 * Notify customer of new bid on their quote
 */
router.post('/new-bid-notification', async (req, res) => {
  try {
    const { customerEmail, customerName, quoteTitle, vendorName, bidAmount } = req.body;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF385C;">You Have a New Bid! 💼</h2>
        <p>Hi ${customerName},</p>
        <p>Great news! A tradesperson has submitted a bid for your quote:</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${quoteTitle}</h3>
          <p><strong>Tradesperson:</strong> ${vendorName}</p>
          <p><strong>Bid Amount:</strong> £${bidAmount}</p>
        </div>
        <p>
          <a href="https://tradematch.vercel.app/customer-dashboard.html" 
             style="display: inline-block; background: #FF385C; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Bid Details
          </a>
        </p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Review their profile, compare with other bids, and choose the best tradesperson for your job.
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"TradeMatch" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `New Bid Received for "${quoteTitle}"`,
      html
    });
    
    res.json({
      success: true,
      message: 'Bid notification sent'
    });
    
  } catch (error) {
    console.error('Bid notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});

/**
 * POST /api/email/welcome
 * Send welcome email to new user
 */
router.post('/welcome', async (req, res) => {
  try {
    const { email, name, userType } = req.body;
    
    const isVendor = userType === 'vendor';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF385C;">Welcome to TradeMatch! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining TradeMatch, the UK's leading platform connecting ${isVendor ? 'tradespeople with customers' : 'homeowners with trusted tradespeople'}.</p>
        
        ${isVendor ? `
        <h3>Getting Started as a Tradesperson:</h3>
        <ol>
          <li>Complete your profile with your services and areas</li>
          <li>Upload photos of your previous work</li>
          <li>Browse available quotes in your area</li>
          <li>Submit competitive bids</li>
          <li>Win jobs and build your reputation!</li>
        </ol>
        ` : `
        <h3>Getting Started as a Customer:</h3>
        <ol>
          <li>Post a quote describing your project</li>
          <li>Receive bids from verified tradespeople</li>
          <li>Compare profiles and ratings</li>
          <li>Choose the best tradesperson</li>
          <li>Leave a review when complete!</li>
        </ol>
        `}
        
        <p>
          <a href="https://tradematch.vercel.app/${isVendor ? 'vendor' : 'customer'}-dashboard.html" 
             style="display: inline-block; background: #FF385C; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to Dashboard
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Need help? Visit our <a href="https://tradematch.vercel.app/help.html">Help Center</a> or reply to this email.
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"TradeMatch" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to TradeMatch!',
      html
    });
    
    res.json({
      success: true,
      message: 'Welcome email sent'
    });
    
  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send welcome email' 
    });
  }
});

/**
 * POST /api/email/payment-confirmation
 * Send payment confirmation email
 */
router.post('/payment-confirmation', async (req, res) => {
  try {
    const { customerEmail, customerName, vendorName, amount, quoteTitle, receiptUrl } = req.body;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #66BB6A;">Payment Confirmed! ✅</h2>
        <p>Hi ${customerName},</p>
        <p>Your payment has been successfully processed and is being held in escrow.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Payment Details</h3>
          <p><strong>Amount:</strong> £${amount}</p>
          <p><strong>Project:</strong> ${quoteTitle}</p>
          <p><strong>Tradesperson:</strong> ${vendorName}</p>
        </div>
        
        <p>The funds will be released to ${vendorName} once you confirm the work is completed to your satisfaction.</p>
        
        ${receiptUrl ? `
        <p>
          <a href="${receiptUrl}" 
             style="display: inline-block; background: #FF385C; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Download Receipt
          </a>
        </p>
        ` : ''}
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This is an automated confirmation. Please keep this for your records.
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"TradeMatch" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: 'Payment Confirmed - TradeMatch',
      html
    });
    
    res.json({
      success: true,
      message: 'Payment confirmation sent'
    });
    
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send confirmation' 
    });
  }
});

/**
 * POST /api/email/review-reminder
 * Remind customer to leave a review
 */
router.post('/review-reminder', async (req, res) => {
  try {
    const { customerEmail, customerName, vendorName, quoteId } = req.body;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF385C;">How Did It Go? ⭐</h2>
        <p>Hi ${customerName},</p>
        <p>We hope your project with ${vendorName} was completed to your satisfaction!</p>
        <p>Your feedback helps other customers make informed decisions and helps tradespeople improve their service.</p>
        
        <p>
          <a href="https://tradematch.vercel.app/customer-dashboard.html?review=${quoteId}" 
             style="display: inline-block; background: #FF385C; color: white; 
                    padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Leave a Review
          </a>
        </p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Takes less than 2 minutes. Your review will be posted publicly on ${vendorName}'s profile.
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: `"TradeMatch" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `How was your experience with ${vendorName}?`,
      html
    });
    
    res.json({
      success: true,
      message: 'Review reminder sent'
    });
    
  } catch (error) {
    console.error('Review reminder error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send reminder' 
    });
  }
});

module.exports = router;
