const resend = require('resend');

let emailTransporter;

class EmailService {
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not configured, email sending disabled');
      this.client = null;
      return;
    }

    this.client = new resend.Resend(this.apiKey);
  }

  async sendEmail(options) {
    const { to, subject, html, text } = options || {};
    if (!this.client) {
      throw new Error('Email sending is disabled (missing RESEND_API_KEY)');
    }

    const fromAddress =
      options.from ||
      process.env.EMAIL_FROM ||
      'onboarding@resend.dev';

    const response = await this.client.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text
    });

    if (response?.error) {
      console.error('Email sending failed:', response.error);
      throw new Error(`Failed to send email: ${response.error.message || 'unknown_error'}`);
    }

    console.log(`Email sent successfully to ${to}`);
    return response;
  }

  setEmailTransporter(transporter) {
    emailTransporter = transporter;
  }
}

module.exports = EmailService;