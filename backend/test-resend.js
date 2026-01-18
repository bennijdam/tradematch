const { Resend } = require('resend');

// Test Resend integration
async function testResend() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 're_ZghKkgim_NN9oFCSHTNKP5MzPwECceGWY');
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'bennijdam@protonmail.com',
      subject: '🧪 Resend Test - TradeMatch Email System',
      html: `
        <h1>✅ Resend Integration Working!</h1>
        <p>This is a test email from the TradeMatch email system.</p>
        <p><strong>Features:</strong></p>
        <ul>
          <li>✅ Resend API connected</li>
          <li>✅ HTML templates working</li>
          <li>✅ Professional styling</li>
          <li>✅ TradeMatch branding</li>
        </ul>
        <p>Time sent: ${new Date().toISOString()}</p>
      `
    });
    
    if (error) {
      console.error('❌ Resend error:', error);
      return false;
    }
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Email ID:', data.id);
    return true;
    
  } catch (err) {
    console.error('❌ Test failed:', err);
    return false;
  }
}

testResend();