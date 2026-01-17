// Email Routes
const nodemailer = require('nodemailer');
const router = express.Router();

// Email configuration (in production, use environment variables)
const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER || 'noreply@tradematch.com',
        pass: process.env.EMAIL_PASS || 'your-email-password'
    }
};

const transporter = nodemailer.createTransporter(emailConfig);

/**
 * Send email endpoint
 */
router.post('/send-email', async (req, res) => {
    try {
        const { to, subject, message, type = 'general' } = req.body;
        
        if (!to || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, message'
            });
        }
        
        const emailOptions = {
            from: `TradeMatch <${emailConfig.auth.user}>`,
            to,
            subject,
            html: generateEmailTemplate(subject, message, type)
        };
        
        await transporter.sendMail(emailOptions);
        
        res.json({
            success: true,
            message: 'Email sent successfully'
        });
        
    } catch (error) {
        console.error('Email send error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email',
            details: error.message
        });
    }
});

/**
 * Send quote notification to vendor
 */
router.post('/quote-notification', async (req, res) => {
    try {
        const { vendorEmail, quoteDetails, customerInfo } = req.body;
        
        const subject = `New Quote Request: ${quoteDetails.title}`;
        const message = `
            <h2>New Quote Request</h2>
            <p>A customer has requested a quote for your services.</p>
            
            <h3>Quote Details:</h3>
            <ul>
                <li><strong>Title:</strong> ${quoteDetails.title}</li>
                <li><strong>Budget:</strong> ${quoteDetails.budget}</li>
                <li><strong>Location:</strong> ${quoteDetails.postcode}</li>
                <li><strong>Timeline:</strong> ${quoteDetails.urgency}</li>
            </ul>
            
            <h3>Customer Information:</h3>
            <ul>
                <li><strong>Name:</strong> ${customerInfo.name}</li>
                <li><strong>Email:</strong> ${customerInfo.email}</li>
                <li><strong>Phone:</strong> ${customerInfo.phone}</li>
            </ul>
            
            <p>Log in to your TradeMatch dashboard to view the full details and submit a bid.</p>
            <a href="https://tradematch.onrender.com/vendor/dashboard" 
               style="background: #FF6B8A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
               View on TradeMatch
            </a>
        `;
        
        await transporter.sendMail({
            from: `TradeMatch <${emailConfig.auth.user}>`,
            to: vendorEmail,
            subject,
            html: message
        });
        
        res.json({
            success: true,
            message: 'Quote notification sent to vendor'
        });
        
    } catch (error) {
        console.error('Quote notification error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send quote notification'
        });
    }
});

/**
 * Generate email template based on type
 */
function generateEmailTemplate(subject, message, type) {
    const templates = {
        general: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #FAFBFC; border-radius: 8px; padding: 30px; border: 1px solid #E8ECEF;">
                    <h1 style="color: #2C3E50; margin-bottom: 20px;">${subject}</h1>
                    <div style="color: #7F8C8D; line-height: 1.6;">${message}</div>
                </div>
                <div style="text-align: center; margin-top: 30px; color: #95A5A6; font-size: 14px;">
                    <p>This email was sent by TradeMatch.</p>
                    <p>&copy; 2024 TradeMatch. All rights reserved.</p>
                </div>
            </div>
        `,
        notification: message // Already formatted HTML
    };
    
    return templates[type] || templates.general;
}

/**
 * Test email configuration
 */
router.get('/test', async (req, res) => {
    try {
        await transporter.verify();
        res.json({
            success: true,
            message: 'Email configuration is valid'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Email configuration is invalid',
            details: error.message
        });
    }
});

module.exports = router;