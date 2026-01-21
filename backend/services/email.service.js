const resend = require('resend');

let resendClient;
let emailTransporter;

class EmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not configured, email sending disabled');
      return null;
    }

    // Initialize Resend client
    resendClient = new resend.Resend(this.apiKey);

    return resendClient;
  }

  async sendEmail(options) {
    try {
      const { to, subject, html, text } = options;
      
      if (!resendClient) {
        throw new Error('Resend client not initialized');
      }

      const response = await resendClient.emails.send({
        from: options.from || 'noreply@tradematch.uk',
        to: to,
        subject: subject,
        html: html,
        text: text
      });

      if (response.error) {
        console.error('Email sending failed:', response.error);
        throw new Error(`Failed to send email: ${response.error.message}`);
      }

      console.log(`Email sent successfully to ${to}`);
      return response;
    } catch (error) {
      console.error('Email service error:', error);
      throw new Error(`Email service error: ${error.message}`);
    }
  }

  setEmailTransporter(transporter) {
    emailTransporter = transporter;
  }
}

module.exports = EmailService;