const express = require('express');
const router = express.Router();

const EmailService = require('../services/email.service');

let pool;
router.setPool = (p) => { pool = p; };

/**
 * Send Transactional Email
 * POST /api/email/send
 */
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text, type = 'notification' } = req.body;

    // Validate required fields
    if (!to || !subject) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['to', 'subject']
      });
    }

    // Initialize email service if not already done
    const emailService = new EmailService();

    // Send email using Resend
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      text
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      emailId: result.id
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

/**
 * Send Welcome Email
 * POST /api/email/welcome
 */
router.post('/welcome', async (req, res) => {
  try {
    const { name, email, userType } = req.body;

    if (!name || !email || !userType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'userType']
      });
    }

    // Initialize email service
    const emailService = new EmailService();

    const htmlContent = userType === 'vendor' ? `
      <h2>Welcome to TradeMatch! 🎉</h2>
      <p>Dear ${name},</p>
      <p>Thank you for registering as a trusted tradesperson on TradeMatch. Your professional profile has been created and is now visible to homeowners across the UK.</p>
      <h3>What You Can Do:</h3>
      <ul>
        <li>📋 Browse available quote requests from customers</li>
        <li>📝 Submit competitive bids for projects</li>
        <li>💰 Manage your earnings and payment schedules</li>
        <li>⭐ Build your reputation through customer reviews</li>
        <li>📊 Track your business performance with detailed analytics</li>
        <li>🎯 Access exclusive TradeMatch benefits and support</li>
      </ul>
      <h3>Getting Started:</h3>
      <ol>
        <li>Complete your vendor profile with services offered and areas covered</li>
        <li>Upload photos of your previous work to showcase quality</li>
        <li>Verify your insurance and qualifications</li>
        <li>Set your availability and response times</li>
        <li>Familiarize yourself with our platform features</li>
      </ol>
      <p>We're excited to have you join our community of trusted tradespeople. Let's build your business together!</p>
      <p>Best regards,<br>The TradeMatch Team</p>
    ` : `
      <h2>Welcome to TradeMatch! 🏠</h2>
      <p>Dear ${name},</p>
      <p>Thank you for joining TradeMatch! Your account has been created and you're ready to get matched with customers who need your skills and expertise.</p>
      <h3>What You Can Do:</h3>
      <ul>
        <li>📝 Submit competitive quotes for customer projects</li>
        <li>🔧 Get matched with verified customers in your area</li>
        <li>💰 Receive secure payments for completed work</li>
        <li>📊 Track your earnings and business growth</li>
        <li>⭐ Build your reputation through excellent customer reviews</li>
      </ul>
      <h3>Getting Started:</h3>
      <ol>
        <li>Post your first quote to start getting matched with customers</li>
        <li>Complete your profile with your skills, services, and service areas</li>
        <li>Set your availability and response preferences</li>
        <li>Upload photos of your previous work to showcase your expertise</li>
        <li>Familiarize yourself with our platform and mobile app</li>
      </ol>
      <p>Ready to transform your trade business? Let's get started!</p>
      <p>Best regards,<br>The TradeMatch Team</p>
    ` : `<p>Thank you for registering with TradeMatch! Your account has been created. We're excited to help you find the perfect tradespeople for your project.</p>
      <p>Get started by posting your first project request or browsing available jobs in your area.</p>
      <p>Best regards,<br>The TradeMatch Team</p>`;

    // Send email using Resend
    const result = await emailService.sendEmail({
      to: email,
      subject: `Welcome to TradeMatch${userType === 'vendor' ? ' - Your Vendor Account is Ready!' : '!'} ✅`,
      html: htmlContent,
      text: `Welcome to TradeMatch${userType === 'vendor' ? ' - Your Vendor Account is Ready!' : '!'} ✅`
    });

    res.json({
      success: true,
      message: 'Welcome email sent successfully',
      emailId: result.id
    });

  } catch (error) {
    console.error('Welcome email error:', error);
    res.status(500).json({ 
      error: 'Failed to send welcome email',
      details: error.message 
    });
  }
});

/**
 * Send Quote Notification Email
 * POST /api/email/quote-notification
 */
router.post('/quote-notification', async (req, res) => {
  try {
    const { customerName, customerEmail, vendorName, service, title, quoteId } = req.body;

    if (!customerName || !customerEmail || !vendorName || !service || !title || !quoteId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['customerName', 'customerEmail', 'vendorName', 'service', 'title', 'quoteId']
      });
    }

    // Initialize email service
    const emailService = new EmailService();

    const htmlContent = `
      <h2>🎉 New Quote Request Received!</h2>
      <p>Hi ${vendorName},</p>
      <p>Great news! A customer has posted a quote request that matches your expertise:</p>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>${title}</h3>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
        <p><strong>Posted:</strong> ${new Date().toLocaleString()}</p>
      </div>
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💡 Next Steps:</h3>
        <ol>
          <li>Review the customer's requirements carefully</li>
          <li>Submit your competitive bid with detailed breakdown</li>
          <li>Include timeline and availability in your response</li>
          <li>Communicate professionally to secure the project</li>
          <li>Use TradeMatch messaging system for all communications</li>
        </ol>
      </div>
      
      <p><strong>💼 Pro Tip:</strong> Quick, detailed responses with clear pricing help win more jobs. Average response time is under 4 hours!</p>
      </div>
      
      <p>Log in to your TradeMatch dashboard to view and respond to this opportunity.</p>
      <p>Best of luck!</p>
      <p>The TradeMatch Team</p>
    `;

    // Send email to vendor
    const vendorResult = await emailService.sendEmail({
      to: vendorEmail,
      subject: `New Quote Request: ${title} - TradeMatch`,
      html: htmlContent,
      text: `New quote request received: ${title}. Please check your dashboard.`
    });

    // Send confirmation to customer
    const customerResult = await emailService.sendEmail({
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
            <li>Compare bids and choose the best fit for your project</li>
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

    res.json({
      success: true,
      message: 'Quote notification emails sent',
      vendorEmailId: vendorResult.id,
      customerEmailId: customerResult.id
    });

  } catch (error) {
    console.error('Quote notification email error:', error);
    res.status(500).json({ 
      error: 'Failed to send quote notification',
      details: error.message 
    });
  }
});

/**
 * Send Bid Notification Email
 * POST /api/email/bid-notification
 */
router.post('/bid-notification', async (req, res) => {
  try {
    const { customerName, customerEmail, vendorName, vendorEmail, service, amount, quoteId } = req.body;

    if (!customerName || !customerEmail || !vendorName || !service || !amount || !quoteId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['customerName', 'customerEmail', 'vendorName', 'service', 'amount', 'quoteId']
      });
    }

    // Initialize email service
    const emailService = new EmailService();

    const htmlContent = `
      <h2>🎉 Bid Accepted!</h2>
      <p>Hi ${vendorName},</p>
      <p>Excellent news! A customer has accepted your bid for their project.</p>
      
      <div style="background: #f0f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>💰 Project Details:</h3>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Your Bid:</strong> £${amount}</p>
        <p><strong>Quote ID:</strong> ${quoteId}</p>
      </div>
      
      <div style="background: #e8f5ea; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📞 Next Steps:</h3>
        <ol>
          <li>Contact the customer to discuss project details and timeline</li>
          <li>Confirm start date and project scope</li>
          <li>Use TradeMatch messaging for all communications</li>
          <li>Complete work to customer satisfaction for better reviews</li>
        </ol>
      </div>
      
      <p><strong>💡 Payment:</strong> Payment will be released through TradeMatch escrow upon project completion.</p>
      
      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Build Your Business:</h3>
        <p>Professional work leads to:</p>
        <ul>
          <li>⭐ Positive customer reviews</li>
          <li>📈 More job opportunities</li>
          <li>🔄 Repeat business and referrals</li>
        </ul>
      </div>
      
      <p>Log in to your dashboard to manage the project and track payment release.</p>
      <p>Best regards,<br>The TradeMatch Team</p>
    `;

    // Send email to vendor
    const vendorResult = await emailService.sendEmail({
      to: vendorEmail,
      subject: `🎉 Bid Accepted! ${service} Project - TradeMatch`,
      html: htmlContent,
      text: `Congratulations! Your bid of £${amount} has been accepted for the ${service} project.`
    });

    // Send notification to customer
    const customerResult = await emailService.sendEmail({
      to: customerEmail,
      subject: `Great News! ${vendorName} Accepted Your Bid`,
      html: `
        <h2>🎊 Your Bid Was Accepted!</h2>
        <p>Hi ${customerName},</p>
        <p>Great news! ${vendorName} has been selected for your ${service} project with a bid of £${amount}.</p>
        
        <div style="background: #f0f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🤝 What to Expect:</h3>
          <ul>
            <li>${vendorName} will contact you shortly to discuss details</li>
            <li>Project coordination through TradeMatch messaging system</li>
            <li>Secure payment processing when work is completed</li>
            <li>Review and rating opportunities</li>
          </ul>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Respond to messages in your TradeMatch dashboard</li>
          <li>Review project details and confirm timeline</li>
          <li>Keep track of project progress</li>
        </ol>
        
        <p>Log in to your dashboard to view project details and communicate with ${vendorName}.</p>
        <p>Best regards,<br>The TradeMatch Team</p>
      `,
      text: `${vendorName} accepted your bid for the ${service} project!`
    });

    res.json({
      success: true,
      message: 'Bid notification emails sent',
      vendorEmailId: vendorResult.id,
      customerEmailId: customerResult.id
    });

  } catch (error) {
    console.error('Bid notification email error:', error);
    res.status(500).json({ 
      error: 'Failed to send bid notification',
      details: error.message 
    });
  }
});

/**
 * Send Payment Confirmation Email
 * POST /api/email/payment-confirmation
 */
router.post('/payment-confirmation', async (req, res) => {
  try {
    const { customerName, customerEmail, vendorName, vendorEmail, amount, service, quoteId } = req.body;

    if (!customerName || !customerEmail || !vendorName || !amount || !quoteId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['customerName', 'customerEmail', 'vendorName', 'vendorEmail', 'amount', 'service', 'quoteId']
      });
    }

    // Initialize email service
    const emailService = new EmailService();

    const htmlContent = `
      <h2>✅ Payment Released!</h2>
      <p>Hi ${customerName},</p>
      <p>Payment of £${amount} has been successfully released to ${vendorName} for the ${service} project.</p>
      
      <div style="background: #059669; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>🎉 Project Complete!</h3>
        <ul>
          <li>✅ Funds transferred to vendor</li>
          <li>✅ Project marked as completed</li>
          <li>📝 Leave a review for ${vendorName}</li>
          <li>⭐ Both parties can now leave reviews</li>
        </ul>
      </div>
      
      <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>📞 Next Steps:</h3>
          <ul>
            <li>${vendorName} can continue working on their next projects</li>
            <li>${customerName} can use TradeMatch for future projects</li>
            <li>Both parties benefit from positive reviews</li>
          </ul>
      </div>
      
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Amount: £${amount}</li>
        <li>Quote ID: ${quoteId}</li>
        <li>Service: ${service}</li>
      </ul>
        
      <p>Thank you for using TradeMatch for your project needs!</p>
      <p>Best regards,<br>The TradeMatch Team</p>
    `;

    // Send confirmation emails
    const vendorResult = await emailService.sendEmail({
      to: vendorEmail,
      subject: `💰 Payment Released - ${service} Project`,
      html: htmlContent,
      text: `Payment of £${amount} released to you for the ${service} project.`
    });

    const customerResult = await emailService.sendEmail({
      to: customerEmail,
      subject: `✅ Project Completed - ${service} Project`,
      html: htmlContent,
      text: `${vendorName} has been paid and your ${service} project is marked as complete.`
    });

    res.json({
      success: true,
      message: 'Payment confirmation emails sent',
      vendorEmailId: vendorResult.id,
      customerEmailId: customerResult.id
    });

  } catch (error) {
    console.error('Payment confirmation email error:', error);
    res.status(500).json({ 
      error: 'Failed to send payment confirmation',
      details: error.message 
    });
  }
});

module.exports = router;