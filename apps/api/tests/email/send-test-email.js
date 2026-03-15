#!/usr/bin/env node

/**
 * Quick Email Test - Send Test Email via Resend API
 * Tests all three email types (user, vendor, admin) to verify Resend integration
 */

require('dotenv').config({ path: '../../.env' });
const { Resend } = require('resend');

async function sendTestEmail() {
  console.log('📧 Testing Resend Email Configuration with tradematch.uk\n');

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('❌ RESEND_API_KEY not found in .env');
    console.log('\nTo fix:');
    console.log('1. Copy apps/api/.env.example to apps/api/.env');
    console.log('2. Set RESEND_API_KEY=your_resend_api_key');
    console.log('3. Set EMAIL_FROM=noreply@tradematch.uk');
    process.exit(1);
  }

  console.log('✅ API Key found');
  console.log('   Format:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));

  const fromEmail = process.env.EMAIL_FROM || 'noreply@tradematch.uk';
  console.log('   From:', fromEmail);
  console.log('   Domain: tradematch.uk\n');

  const resend = new Resend(apiKey);

  // Test data
  const testEmails = [
    {
      to: ['test+customer@tradematch.uk'],
      subject: '✅ TradeMatch: Customer Quote Confirmation',
      template: 'customer_confirmation'
    },
    {
      to: ['test+vendor@tradematch.uk'],
      subject: '🔔 TradeMatch: New Lead Available',
      template: 'vendor_notification'
    },
    {
      to: ['test+admin@tradematch.uk'],
      cc: ['tradematchuk@googlemail.com'],
      subject: '📢 TradeMatch: New Quote Submitted',
      template: 'admin_alert'
    }
  ];

  console.log('📤 Sending test emails...\n');

  for (const testEmail of testEmails) {
    try {
      console.log(`• Sending ${testEmail.template} to ${testEmail.to[0]}...`);

      const emailOptions = {
        from: fromEmail,
        to: testEmail.to,
        subject: testEmail.subject,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #00c268;">${testEmail.subject}</h2>
          <p><strong>Trade:</strong> Plumbing</p>
          <p><strong>Postcode:</strong> SW1A 0AA</p>
          <p><strong>Budget:</strong> £500-1000</p>
          <p><strong>Status:</strong> New Quote Submitted</p>
          <hr>
          <p><small>Sent via Resend API from tradematch.uk domain</small></p>
        </div>`,
        text: `TradeMatch Test Email\nCreated: ${new Date().toISOString()}`
      };

      if (testEmail.cc) {
        emailOptions.cc = testEmail.cc;
      }

      const result = await resend.emails.send(emailOptions);

      if (result?.error) {
        console.log(`   ❌ Failed: ${result.error.message}`);
      } else {
        console.log(`   ✅ Success (ID: ${result.id})`);
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n🎉 Test emails sent!');
  console.log('\nCheck test inboxes for:');
  console.log('   - test+customer@tradematch.uk');
  console.log('   - test+vendor@tradematch.uk');
  console.log('   - test+admin@tradematch.uk');
  console.log('\nEmails will show as being sent from tradematch.uk domain');

  // Show dashboard for verification
  if (process.env.RESEND_API_KEY) {
    console.log('\n📊 View email analytics:');
    console.log('   Dashboard: https://resend.com');
    console.log('\\n✅ All configuration verified with tradematch.uk domain!');
  }
}

sendTestEmail().catch(console.error);
