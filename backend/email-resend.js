const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

// Initialize Resend
// VERSION: 2.1 - Fixed email from field format (removed TradeMatch wrapper)
const resend = new Resend(process.env.RESEND_API_KEY);

// Resolve from-addresses via environment (fallbacks to EMAIL_FROM or sane default)
const FROM_DEFAULT = process.env.EMAIL_FROM || 'noreply@tradematch.uk';
const FROM_JOBS = process.env.EMAIL_FROM_JOBS || FROM_DEFAULT;
const FROM_NOTIFICATIONS = process.env.EMAIL_FROM_NOTIFICATIONS || FROM_DEFAULT;
const FROM_PAYMENTS = process.env.EMAIL_FROM_PAYMENTS || FROM_DEFAULT;
const FROM_REVIEWS = process.env.EMAIL_FROM_REVIEWS || FROM_DEFAULT;

let pool;
router.setPool = (p) => { pool = p; };

// Helper: Check if user has consented to receive specific email type
const checkEmailConsent = async (userId, emailType) => {
  if (!pool || !userId) return false;
  
  try {
    const result = await pool.query(
      `SELECT email_notifications_enabled, email_preferences 
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) return false;
    
    const user = result.rows[0];
    
    // Check master switch
    if (!user.email_notifications_enabled) {
      console.log(`📧 Email blocked: User ${userId} has disabled all notifications`);
      return false;
    }
    
    // Check specific preference
    const preferences = user.email_preferences || {};
    const allowed = preferences[emailType] !== false; // Default to true if not set
    
    if (!allowed) {
      console.log(`📧 Email blocked: User ${userId} has disabled '${emailType}' notifications`);
    }
    
    return allowed;
  } catch (err) {
    console.error('Email consent check error:', err);
    return true; // Fail open - send email if check fails
  }
};

// Rate limiter for email endpoints (already applied in server.js)
// 10 emails per hour per user

// =====================================
// EMAIL TEMPLATES
// =====================================

const emailTemplates = {
  welcome: {
    customer: (name) => ({
      subject: '🎉 Welcome to TradeMatch!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TradeMatch!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name}! 👋</h2>
              <p>Thanks for joining TradeMatch - the UK's most trusted platform for finding local tradespeople.</p>
              <p><strong>You can now:</strong></p>
              <ul>
                <li>Post jobs and get multiple quotes</li>
                <li>Compare prices from verified professionals</li>
                <li>Read reviews from real customers</li>
                <li>Pay securely with buyer protection</li>
              </ul>
              <a href="${process.env.FRONTEND_URL}/customer-dashboard.html" class="button">Go to Your Dashboard →</a>
              <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/how-it-works.html">How It Works</a> guide.</p>
            </div>
            <div class="footer">
              <p>TradeMatch Ltd • Connecting homeowners with trusted tradespeople</p>
              <p><a href="${process.env.FRONTEND_URL}/help.html">Help Center</a> | <a href="${process.env.FRONTEND_URL}/contact.html">Contact Us</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    }),
    vendor: (companyName) => ({
      subject: '🚀 Welcome to TradeMatch - Start Winning Jobs!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome ${companyName}!</h1>
            </div>
            <div class="content">
              <h2>You're all set! 🎉</h2>
              <p>Your TradeMatch business profile is now live. Start browsing available jobs and win more work!</p>
              <p><strong>Next steps:</strong></p>
              <ul>
                <li>Complete your profile with photos and certifications</li>
                <li>Browse available quotes in your area</li>
                <li>Submit competitive bids to win jobs</li>
                <li>Build your reputation with 5-star reviews</li>
              </ul>
              <a href="${process.env.FRONTEND_URL}/vendor-dashboard.html" class="button">View Available Jobs →</a>
              <p><strong>Pro Tip:</strong> Respond to quotes within 24 hours for the best chance of winning!</p>
            </div>
            <div class="footer">
              <p>TradeMatch Ltd • Helping tradespeople grow their business</p>
              <p><a href="${process.env.FRONTEND_URL}/help.html">Help Center</a> | <a href="${process.env.FRONTEND_URL}/contact.html">Contact Us</a></p>
            </div>
          </div>
        </body>
        </html>
      `
    })
  },

  newBid: (customerName, vendorName, bidAmount, quoteTitle, quoteId) => ({
    subject: `💰 New Bid Received - £${bidAmount.toLocaleString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .bid-box { background: white; border-left: 4px solid #16A34A; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've Got a New Bid! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Great news! <strong>${vendorName}</strong> has submitted a bid for your job:</p>
            <div class="bid-box">
              <h3>${quoteTitle}</h3>
              <p style="font-size: 24px; color: #16A34A; font-weight: bold;">£${bidAmount.toLocaleString()}</p>
            </div>
            <p>Check out their full proposal, portfolio, and reviews:</p>
            <a href="${process.env.FRONTEND_URL}/customer-dashboard.html?quote=${quoteId}" class="button">View Bid Details →</a>
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Review the proposal and timeline</li>
              <li>Check their portfolio and past reviews</li>
              <li>Compare with other bids you receive</li>
              <li>Message them with any questions</li>
            </ul>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • Your jobs, your choice</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  quoteNotification: (postcode, service, quoteId) => ({
    subject: `🔔 New ${service} Job in ${postcode}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .quote-box { background: white; border-left: 4px solid #16A34A; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Job Available! 💼</h1>
          </div>
          <div class="content">
            <h2>A customer near you needs a tradesperson!</h2>
            <div class="quote-box">
              <p><strong>Service:</strong> ${service}</p>
              <p><strong>Location:</strong> ${postcode} area</p>
              <p><strong>Status:</strong> Accepting bids now</p>
            </div>
            <p>This job matches your service area and expertise. Be the first to submit a competitive bid!</p>
            <a href="${process.env.FRONTEND_URL}/vendor-dashboard.html?quote=${quoteId}" class="button">View Job & Submit Bid →</a>
            <p><strong>Pro Tips:</strong></p>
            <ul>
              <li>Respond quickly - early bids have higher acceptance rates</li>
              <li>Include photos of similar past work</li>
              <li>Provide a detailed breakdown of costs</li>
              <li>Be clear about timeline and availability</li>
            </ul>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • More jobs, more opportunities</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  paymentConfirmation: (customerName, amount, reference, vendorName) => ({
    subject: `✅ Payment Confirmed - £${amount.toLocaleString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .payment-box { background: white; border: 2px solid #16A34A; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful! ✅</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your payment has been processed successfully and is being held securely in escrow.</p>
            <div class="payment-box">
              <p style="font-size: 32px; color: #16A34A; font-weight: bold; margin: 0;">£${amount.toLocaleString()}</p>
              <p style="color: #666; margin: 10px 0 0 0;">Payment Reference: ${reference}</p>
            </div>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li><strong>Recipient:</strong> ${vendorName}</li>
              <li><strong>Amount:</strong> £${amount.toLocaleString()}</li>
              <li><strong>Status:</strong> Held in secure escrow</li>
              <li><strong>Release:</strong> When work is completed to your satisfaction</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/customer-dashboard.html" class="button">View Payment Details →</a>
            <p><strong>What Happens Next?</strong></p>
            <p>The tradesperson will start work as agreed. Funds will be released from escrow once you confirm the job is complete. Your money is protected throughout!</p>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • Secure payments, peace of mind</p>
            <p>Questions? <a href="${process.env.FRONTEND_URL}/help.html">Visit Help Center</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  activation: (fullName, activationLink) => ({
    subject: 'Activate your TradeMatch account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; background: #f8fafc; }
          .card { background: #ffffff; border-radius: 12px; padding: 28px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); }
          .btn { display: inline-block; background: #16A34A; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 18px 0; }
          .muted { color: #475569; font-size: 14px; }
          .footer { color: #94a3b8; font-size: 12px; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <h1 style="margin-top: 0; color: #0f172a;">Activate your account</h1>
            <p>Hi ${fullName || 'there'},</p>
            <p>Thanks for joining TradeMatch. Please confirm your email to secure your account and start using your dashboard.</p>
            <p style="text-align: center;">
              <a class="btn" href="${activationLink}">Activate account</a>
            </p>
            <p class="muted">If the button does not work, copy and paste this link into your browser:</p>
            <p class="muted" style="word-break: break-all;">${activationLink}</p>
            <p class="muted">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
          </div>
          <div class="footer">
            TradeMatch • Secure sign-in and verification
          </div>
        </div>
      </body>
      </html>
    `
  }),

  reviewReminder: (customerName, vendorName, quoteId) => ({
    subject: '⭐ How was your experience?',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>We'd Love Your Feedback! ⭐</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your recent job with <strong>${vendorName}</strong> has been completed.</p>
            <p>Could you take 2 minutes to leave a review? Your feedback helps other homeowners make informed decisions.</p>
            <a href="${process.env.FRONTEND_URL}/customer-dashboard.html?review=${quoteId}" class="button">Leave a Review →</a>
            <p><strong>Your review helps:</strong></p>
            <ul>
              <li>Other customers find great tradespeople</li>
              <li>Quality professionals build their reputation</li>
              <li>Improve the TradeMatch platform</li>
            </ul>
            <p>Thank you for using TradeMatch!</p>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • Building trust through transparency</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  bidAccepted: (vendorName, customerName, quoteTitle, bidAmount, quoteId) => ({
    subject: `🎉 Your Bid Has Been Accepted - £${bidAmount.toLocaleString()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: white; border: 2px solid #16A34A; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Congratulations! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${vendorName},</h2>
            <p>Great news! Your bid has been accepted by <strong>${customerName}</strong>.</p>
            <div class="success-box">
              <h3>${quoteTitle}</h3>
              <p style="font-size: 28px; color: #16A34A; font-weight: bold; margin: 10px 0;">£${bidAmount.toLocaleString()}</p>
              <p style="color: #666;">Project Value</p>
            </div>
            <p><strong>What Happens Next?</strong></p>
            <ol>
              <li>The customer will make a secure payment into escrow</li>
              <li>You'll receive confirmation when payment is secured</li>
              <li>Coordinate with the customer to schedule the work</li>
              <li>Complete the job according to agreed specifications</li>
              <li>Funds will be released to you upon completion</li>
            </ol>
            <a href="${process.env.FRONTEND_URL}/vendor-dashboard.html?job=${quoteId}" class="button">View Job Details →</a>
            <p><strong>🔒 Payment Protection:</strong> All payments are held securely in escrow until the work is completed and approved by the customer.</p>
            <p>Best of luck with your project!</p>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • Your success is our success</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  quoteSubmitted: (customerName, quoteTitle, quoteId) => ({
    subject: '✅ Your Quote Request is Live',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .quote-box { background: white; border-left: 4px solid #16A34A; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Quote is Live! 🚀</h1>
          </div>
          <div class="content">
            <h2>Hi ${customerName},</h2>
            <p>Your quote request has been successfully posted to our network of verified tradespeople!</p>
            <div class="quote-box">
              <h3>${quoteTitle}</h3>
              <p><strong>Status:</strong> Accepting bids now</p>
              <p><strong>Quote ID:</strong> ${quoteId}</p>
            </div>
            <p><strong>What Happens Next?</strong></p>
            <ul>
              <li>Local tradespeople will review your request</li>
              <li>You'll receive multiple competitive bids</li>
              <li>Compare proposals, prices, and reviews</li>
              <li>Choose the best tradesperson for your project</li>
            </ul>
            <a href="${process.env.FRONTEND_URL}/customer-dashboard.html?quote=${quoteId}" class="button">Track Your Quote →</a>
            <p><strong>💡 Pro Tip:</strong> Most quotes receive their first bid within 24 hours. We'll notify you by email when bids arrive!</p>
          </div>
          <div class="footer">
            <p>TradeMatch Ltd • Connecting you with trusted professionals</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

// =====================================
// EMAIL SENDING ENDPOINTS
// =====================================

// Send welcome email
router.post('/welcome', async (req, res) => {
  try {
    const { email, name, userType } = req.body;

    if (!email || !name || !userType) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, name, userType' 
      });
    }

    const template = userType === 'customer' 
      ? emailTemplates.welcome.customer(name)
      : emailTemplates.welcome.vendor(name);

    const { data, error } = await resend.emails.send({
      from: FROM_DEFAULT,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Welcome email sent',
      emailId: data.id 
    });

  } catch (err) {
    console.error('Welcome email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send activation email
router.post('/activation', async (req, res) => {
  try {
    const { email, fullName, token } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.tradematch.uk';

    if (!email || !fullName || !token) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, fullName, token' 
      });
    }

    const activationLink = `${frontendUrl}/activate?token=${encodeURIComponent(token)}`;
    const template = emailTemplates.activation(fullName, activationLink);

    const { data, error } = await resend.emails.send({
      from: FROM_DEFAULT,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send activation email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Activation email sent',
      activationLink,
      emailId: data.id 
    });

  } catch (err) {
    console.error('Activation email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Notify vendors of new quote in their area
router.post('/new-quote-notification', async (req, res) => {
  try {
    const { quoteId, postcode, service } = req.body;

    if (!quoteId || !postcode || !service) {
      return res.status(400).json({ 
        error: 'Missing required fields: quoteId, postcode, service' 
      });
    }

    // Get vendors who service this area and offer this service type
    const postcodePrefix = postcode.substring(0, postcode.indexOf(' ') || 3);
    
    const vendorsQuery = await pool.query(
      `SELECT DISTINCT u.id, u.email, u.name 
       FROM users u
       WHERE u.user_type = 'vendor' 
       AND u.postcode LIKE $1
       AND EXISTS (
         SELECT 1 FROM unnest(string_to_array(u.services, ',')) s
         WHERE LOWER(TRIM(s)) = LOWER($2)
       )`,
      [`${postcodePrefix}%`, service]
    );

    const template = emailTemplates.quoteNotification(postcode, service, quoteId);
    const emailsSent = [];

    // Send email to each matching vendor (with consent check)
    for (const vendor of vendorsQuery.rows) {
      try {
        // Check if vendor has opted in to new quote notifications
        const hasConsent = await checkEmailConsent(vendor.id, 'newQuotes');
        if (!hasConsent) continue;

        const { data, error } = await resend.emails.send({
          from: FROM_JOBS,
          to: vendor.email,
          subject: template.subject,
          html: template.html
        });

        if (!error) {
          emailsSent.push({ email: vendor.email, id: data.id });
        }
      } catch (err) {
        console.error(`Failed to send to ${vendor.email}:`, err);
      }
    }

    res.json({ 
      success: true, 
      message: `Notified ${emailsSent.length} vendors`,
      emailsSent 
    });

  } catch (err) {
    console.error('Quote notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Notify customer of new bid
router.post('/new-bid-notification', async (req, res) => {
  try {
    const { customerId, quoteId, bidAmount, vendorName } = req.body;

    if (!customerId || !quoteId || !bidAmount || !vendorName) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerId, quoteId, bidAmount, vendorName' 
      });
    }

    // Check email consent first
    const hasConsent = await checkEmailConsent(customerId, 'newBids');
    if (!hasConsent) {
      return res.json({ success: true, message: 'Email skipped - user opted out', skipped: true });
    }

    // Get customer details and quote title
    const customerQuery = await pool.query(
      'SELECT u.email, u.name, q.title FROM users u JOIN quotes q ON q.user_id = u.id WHERE u.id = $1 AND q.id = $2',
      [customerId, quoteId]
    );

    if (customerQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Customer or quote not found' });
    }

    const { email, name, title } = customerQuery.rows[0];
    const template = emailTemplates.newBid(name, vendorName, bidAmount, title, quoteId);

    const { data, error } = await resend.emails.send({
      from: FROM_NOTIFICATIONS,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Bid notification sent',
      emailId: data.id 
    });

  } catch (err) {
    console.error('Bid notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send payment confirmation
router.post('/payment-confirmation', async (req, res) => {
  try {
    const { customerId, amount, reference, vendorName } = req.body;

    if (!customerId || !amount || !reference) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerId, amount, reference' 
      });
    }

    // Check email consent
    const hasConsent = await checkEmailConsent(customerId, 'paymentConfirmed');
    if (!hasConsent) {
      return res.json({ success: true, message: 'Email skipped - user opted out', skipped: true });
    }

    const customerQuery = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [customerId]
    );

    if (customerQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { email, name } = customerQuery.rows[0];
    const template = emailTemplates.paymentConfirmation(name, amount, reference, vendorName);

    const { data, error } = await resend.emails.send({
      from: FROM_PAYMENTS,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Payment confirmation sent',
      emailId: data.id 
    });

  } catch (err) {
    console.error('Payment confirmation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Send review reminder
router.post('/review-reminder', async (req, res) => {
  try {
    const { customerId, vendorName, quoteId } = req.body;

    if (!customerId || !vendorName || !quoteId) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerId, vendorName, quoteId' 
      });
    }

    const customerQuery = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [customerId]
    );

    if (customerQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const { email, name } = customerQuery.rows[0];
    const template = emailTemplates.reviewReminder(name, vendorName, quoteId);

    const { data, error } = await resend.emails.send({
      from: FROM_REVIEWS,
      to: email,
      subject: template.subject,
      html: template.html
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Review reminder sent',
      emailId: data.id 
    });

  } catch (err) {
    console.error('Review reminder error:', err);

    // Send bid acceptance notification
    router.post('/bid-accepted', async (req, res) => {
      try {
        const { vendorId, customerName, quoteTitle, bidAmount, quoteId } = req.body;

        if (!vendorId || !customerName || !quoteTitle || !bidAmount || !quoteId) {
          return res.status(400).json({ 
            error: 'Missing required fields: vendorId, customerName, quoteTitle, bidAmount, quoteId' 
          });
        }

    // Check email consent
    const hasConsent = await checkEmailConsent(vendorId, 'bidAccepted');
    if (!hasConsent) {
      return res.json({ success: true, message: 'Email skipped - user opted out', skipped: true });
    }


        const { data, error } = await resend.emails.send({
          from: FROM_NOTIFICATIONS,
          to: email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          return res.status(500).json({ error: 'Failed to send email', details: error });
        }

        res.json({ 
          success: true, 
          message: 'Bid acceptance notification sent',
          emailId: data.id 
        });

      } catch (err) {
        console.error('Bid acceptance notification error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Send quote submitted confirmation
    router.post('/quote-submitted', async (req, res) => {
      try {
        const { customerId, quoteTitle, quoteId } = req.body;

        if (!customerId || !quoteTitle || !quoteId) {
          return res.status(400).json({ 
            error: 'Missing required fields: customerId, quoteTitle, quoteId' 
          });
        }

        const customerQuery = await pool.query(
          'SELECT email, name FROM users WHERE id = $1',
          [customerId]
        );

        if (customerQuery.rows.length === 0) {
          return res.status(404).json({ error: 'Customer not found' });
        }

        const { email, name } = customerQuery.rows[0];
        const template = emailTemplates.quoteSubmitted(name, quoteTitle, quoteId);

        const { data, error } = await resend.emails.send({
          from: FROM_JOBS,
          to: email,
          subject: template.subject,
          html: template.html
        });

        if (error) {
          return res.status(500).json({ error: 'Failed to send email', details: error });
        }

        res.json({ 
          success: true, 
          message: 'Quote submitted confirmation sent',
          emailId: data.id 
        });

      } catch (err) {
        console.error('Quote submitted confirmation error:', err);
        res.status(500).json({ error: err.message });
      }
    });
    res.status(500).json({ error: err.message });
  }
});

// General send email endpoint
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, userId, emailType } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    // If userId and emailType provided, check consent
    if (userId && emailType) {
      const hasConsent = await checkEmailConsent(userId, emailType);
      if (!hasConsent) {
        return res.json({ success: true, message: 'Email skipped - user opted out', skipped: true });
      }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_DEFAULT,
      to,
      subject,
      html
    });

    if (error) {
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    res.json({ 
      success: true, 
      message: 'Email sent',
      emailId: data.id 
    });

  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================
// EMAIL PREFERENCES MANAGEMENT
// =====================================

// Get user's email preferences
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT email_notifications_enabled, email_preferences 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email_notifications_enabled, email_preferences } = result.rows[0];

    res.json({
      success: true,
      emailNotificationsEnabled: email_notifications_enabled,
      preferences: email_preferences || {
        newBids: true,
        bidAccepted: true,
        newQuotes: true,
        paymentConfirmed: true,
        reviewReminder: true,
        quoteUpdates: true,
        marketing: false,
        newsletter: false
      }
    });

  } catch (err) {
    console.error('Get preferences error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user's email preferences
router.put('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailNotificationsEnabled, preferences } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (typeof emailNotificationsEnabled === 'boolean') {
      updates.push(`email_notifications_enabled = $${idx}`);
      values.push(emailNotificationsEnabled);
      idx++;
    }

    if (preferences && typeof preferences === 'object') {
      updates.push(`email_preferences = $${idx}`);
      values.push(JSON.stringify(preferences));
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ 
        error: 'No updates provided' 
      });
    }

    values.push(userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${idx}
       RETURNING email_notifications_enabled, email_preferences`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Email preferences updated',
      emailNotificationsEnabled: result.rows[0].email_notifications_enabled,
      preferences: result.rows[0].email_preferences
    });

  } catch (err) {
    console.error('Update preferences error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle master email notifications switch
router.patch('/preferences/:userId/toggle', async (req, res) => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ 
        error: 'enabled field must be a boolean' 
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET email_notifications_enabled = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2
       RETURNING email_notifications_enabled`,
      [enabled, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      message: `Email notifications ${enabled ? 'enabled' : 'disabled'}`,
      emailNotificationsEnabled: result.rows[0].email_notifications_enabled
    });

  } catch (err) {
    console.error('Toggle notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
