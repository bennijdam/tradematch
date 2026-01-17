const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

let pool;
router.setPool = (p) => { pool = p; };

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
      from: 'TradeMatch <noreply@tradematch.co.uk>',
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
      `SELECT DISTINCT u.email, u.name 
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

    // Send email to each matching vendor
    for (const vendor of vendorsQuery.rows) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'TradeMatch <jobs@tradematch.co.uk>',
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
      from: 'TradeMatch <notifications@tradematch.co.uk>',
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
      from: 'TradeMatch <payments@tradematch.co.uk>',
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
      from: 'TradeMatch <reviews@tradematch.co.uk>',
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
    res.status(500).json({ error: err.message });
  }
});

// General send email endpoint
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, html' 
      });
    }

    const { data, error } = await resend.emails.send({
      from: 'TradeMatch <noreply@tradematch.co.uk>',
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

module.exports = router;
