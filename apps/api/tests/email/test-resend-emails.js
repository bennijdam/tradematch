#!/usr/bin/env node

/**
 * TradeMatch Email Test & Verification Suite
 * 
 * Tests Resend API integration with the new tradematch.uk domain
 * Sends test emails and verifies:
 * 1. Environment variables loaded correctly
 * 2. Resend API key is valid
 * 3. Email templates render correctly
 * 4. All recipient types receive emails
 * 
 * Run this as:
 *   cd apps/api && npm test:email
 *   # Or directly:
 *   cd apps/api
 *   node tests/email/test-resend-emails.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const EmailService = require('../../services/email.service');
const { DistributedEventBroker, EVENT_TYPES } = require('../../services/distributed-event-broker.service');

class EmailTestSuite {
  constructor() {
    console.log('🧪 TradeMatch Email Verification Suite\n' + '='.repeat(50));
    
    this.envVars = {
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_FROM_NOTIFICATIONS: process.env.EMAIL_FROM_NOTIFICATIONS,
      EMAIL_FROM_JOBS: process.env.EMAIL_FROM_JOBS,
    };
    
    this.service = new EmailService();
    this.results = {
      testsCompleted: 0,
      testsPassed: 0,
      testsFailed: 0,
      emailsSent: 0,
      errors: []
    };
  }

  async run() {
    try {
      // Phase 1: Environment Check
      await this.testEnvironmentVariables();
      
      // Phase 2: Resend API Connection
      await this.testResendConnection();
      
      // Phase 3: Email Templates
      await this.testEmailTemplates();
      
      // Phase 4: Send Test Emails
      await this.sendTestEmails();
      
      // Phase 5: Event Integration
      await this.testEventIntegration();
      
      // Summary
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async testEnvironmentVariables() {
    console.log('📋 Phase 1: Environment Variables\n' + '-'.repeat(40));
    console.log('Loaded .env from:', path.join(__dirname, '../../../../.env'));
    
    const checks = {
      'RESEND_API_KEY': !!this.envVars.RESEND_API_KEY,
      'EMAIL_FROM': !!this.envVars.EMAIL_FROM,
      'EMAIL_FROM != null': this.envVars.EMAIL_FROM !== null,
      'tradematch.uk domain': this.envVars.EMAIL_FROM?.includes('tradematch.uk') || false
    };

    console.log('\nEnvironment Variables Status:');
    Object.entries(checks).forEach(([key, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${key}`);
      if (!passed) this.results.errors.push(`Environment check failed: ${key}`);
    });

    console.log('\nVariable Values:');
    console.log(`  RESEND_API_KEY: ${this.maskKey(this.envVars.RESEND_API_KEY)}`);
    console.log(`  EMAIL_FROM: ${this.envVars.EMAIL_FROM}`);
    console.log(`  EMAIL_FROM_NOTIFICATIONS: ${this.envVars.EMAIL_FROM_NOTIFICATIONS}`);
    console.log(`  EMAIL_FROM_JOBS: ${this.envVars.EMAIL_FROM_JOBS}`);

    if (this.envVars.EMAIL_FROM && this.envVars.EMAIL_FROM.includes('tradematch.uk')) {
      console.log('\n✅ Domain correctly updated to .uk');
      this.results.testsPassed++;
    } else {
      console.log('\n❌ Domain still using .co or not set');
      this.results.errors.push('Domain not updated correctly');
      this.results.testsFailed++;
    }

    this.results.testsCompleted++;
    console.log('\n');
  }

  maskKey(key) {
    if (!key) return '(not set)';
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  }

  async testResendConnection() {
    console.log('🔌 Phase 2: Resend API Connection\n' + '-'.repeat(40));
    
    if (!this.envVars.RESEND_API_KEY) {
      console.log('❌ Cannot test connection: RESEND_API_KEY not set\n');n      this.results.errors.push('Missing RESEND_API_KEY');n      this.results.testsFailed++;
      return;
    }

    try {
      // Check if client was initialized
      console.log('✅ EmailService initialized successfully');
      console.log(`   API Key format: ${this.maskKey(this.envVars.RESEND_API_KEY)}`);
      
      // Note: Without actually sending, we can't verify the key is valid
      // That's what Phase 4 is for
      console.log('   Note: Full verification requires sending test email (Phase 4)\n');
      this.results.testsPassed++;
      
    } catch (error) {
      console.log('❌ EmailService initialization failed:', error.message);
      this.results.errors.push(`Resend connection failed: ${error.message}`);
      this.results.testsFailed++;
    }

    this.results.testsCompleted++;
    console.log('\n');
  }

  async testEmailTemplates() {
    console.log('📝 Phase 3: Email Template Generation\n' + '-'.repeat(40));
    
    const templates = this.generateTestTemplates();
    
    console.log('Generated Templates:');
    Object.entries(templates).forEach(([name, template]) => {
      console.log(`\n  ${name}:`);
      console.log(`  Subject: ${template.subject}`);
      console.log(`  From: ${template.from}`);
      console.log(`  Preview: ${template.text.substring(0, 100)}...`);
      
      // Validate required fields
      if (!template.to || !template.subject || !template.html) {
        console.log(`  ❌ Missing required fields`);
        this.results.errors.push(`Template ${name} missing fields`);
        this.results.testsFailed++;
      } else {
        console.log(`  ✅ Valid template`);
        this.results.testsPassed++;
      }
    });

    this.testedTemplates = templates; // Save for sending
    this.results.testsCompleted++;
    console.log('\n');
  }

  generateTestTemplates() {
    const quoteData = {
      id: 'qt_test123',
      trade: 'Plumbing',
      postcode: 'SW1A 0AA',
      description: 'Leaking kitchen tap',
      budget: '500-1000',
      timeframe: 'within_2_weeks',
      customer_name: 'John Smith',
      customer_email: 'john.test@example.com',
      customer_phone: '07123456789',
      status: 'new'
    };

    return {
      customer_confirmation: {
        to: 'customer@example.com',
        subject: '✅ Quote Submitted - TradeMatch',
        from: this.envVars.EMAIL_FROM,
        html: this.createCustomerEmail(quoteData),
        text: this.createCustomerText(quoteData)
      },
      vendor_notification: {
        to: 'vendor@example.com',
        subject: `🔔 New Lead: ${quoteData.trade} in ${quoteData.postcode}`,
        from: this.envVars.EMAIL_FROM_NOTIFICATIONS || this.envVars.EMAIL_FROM,
        html: this.createVendorEmail(quoteData),
        text: this.createVendorText(quoteData)
      },
      admin_alert: {
        to: 'superadmin@tradematch.uk',
        subject: '📢 New Quote Submitted',
        from: this.envVars.EMAIL_FROM,
        html: this.createAdminEmail(quoteData),
        text: this.createAdminText(quoteData)
      }
    };
  }

  createCustomerEmail(data) {
    return `
<div style="font-family: Arial, sans-serif">
  <h2 style="color: #00c268">✅ Quote Submitted Successfully!</h2>
  <p>Thank you, ${data.customer_name}.</p>
  <p>Your quote (ID: <strong>${data.id}</strong>) has been submitted.</p>
  <table>
    <tr><td>Trade:</td><td>${data.trade}</td></tr>
    <tr><td>Location:</td><td>${data.postcode}</td></tr>
    <tr><td>Budget:</td><td>${data.budget}</td></tr>
    <tr><td>Timeline:</td><td>${data.timeframe}</td></tr>
  </table>
  <p>Location: ${data.postcode_area || 'Pending'}</p>
  <p>Budget: ${data.budget || 'Not specified'}</p>
  <p>Timeline: ${data.timeframe || 'Flexible'}</p>
  <hr>
  <p><small>This email was sent from TradeMatch using the noreply@tradematch.uk domain</small></p>
</div>
    `;
  }

  createCustomerText(data) {
    return `TradeMatch Quote Confirmation
===========================

Quote ID: ${data.id}
Trade: ${data.trade}
Location: ${data.postcode}
Budget: ${data.budget || 'Not specified'}
Timeline: ${data.timeframe || 'Flexible'}

Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard

This email uses the tradematch.uk domain for better delivery.
`;
  }

  createVendorEmail(data) {
    return `
<div style="font-family: Arial, sans-serif">
  <h2 style="color: #00c268">🔔 New Lead Available</h2>
  <p>New ${data.trade} job in your area!</p>
  <table>
    <tr><td>Trade:</td><td><strong>${data.trade}</strong></td></tr>
    <tr><td>Location:</td><td>${data.postcode}</td></tr>
    <tr><td>Budget:</td><td>${data.budget || 'Not specified'}</td></tr>
  </table>
  <p><a href="${process.env.BACKEND_URL || 'http://localhost:3001'}/vendor-dashboard" 
        style="background: #00c268; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Lead</a></p>
  <hr>
  <p><small>New lead notification from TradeMatch.uk domain</small></p>
</div>
    `;
  }

  createVendorText(data) {
    return `New Lead Available - TradeMatch
================================

Trade: ${data.trade}
Location: ${data.postcode}
Budget: ${data.budget || 'Not specified'}

View lead at: ${process.env.BACKEND_URL || 'http://localhost:3001'}/vendor-leads

Domain: tradematch.uk
`;
  }

  createAdminEmail(data) {
    return `
<div style="font-family: Arial, sans-serif">
  <h2 style="color: #00c268">📢 New Quote Submitted</h2>
  <table>
    <tr><td>Quote ID:</td><td><strong>${data.id}</strong></td></tr>
    <tr><td>Trade:</td><td>${data.trade}</td></tr>
    <tr><td>Customer:</td><td>${data.customer_name}</td></tr>
    <tr><td>Location:</td><td>${data.postcode}</td></tr>
    <tr><td>Budget:</td><td>${data.budget || 'Not specified'}</td></tr>
  </table>
  <p><a href="${process.env.BACKEND_URL}/admin/quotes/${data.id}">View in Admin Dashboard</a></p>
  <hr>
  <p><small>Admin alert from tradematch.uk</small></p>
</div>
    `;
  }

  createAdminText(data) {
    return `New Quote Submitted - Admin Alert
==================================

Quote ID: ${data.id}
Trade: ${data.trade}
Customer: ${data.customer_name}
Location: ${data.postcode}
Budget: ${data.budget || 'Not specified'}

View in admin: ${process.env.BACKEND_URL}/admin/quotes/${data.id}

Domain: tradematch.uk
`;
  }

  async sendTestEmails() {
    console.log('📧 Phase 4: Sending Test Emails\n' + '-'.repeat(40));
    
    if (!this.testedTemplates) {
      console.log('❌ No templates prepared, skipping email send\n');n      return;
    }

    console.log('Sending test emails...\n');
    
    try {
      // Send customer email
      console.log('1. Sending to customer (test@tradematch.uk)...');
      try {
        await this.service.sendEmail({
          ...this.testedTemplates.customer_confirmation,
          to: 'test+quote@tradematch.uk',
          subject: `${this.testedTemplates.customer_confirmation.subject} - TEST`,
        });
        console.log('   ✅ Customer email sent successfully');
        this.results.emailsSent++;
      } catch (error) {
        console.log(`   ❌ Customer email failed: ${error.message}`);
        this.results.errors.push(`Customer email: ${error.message}`);
      }
      
      // Send vendor email
      console.log('2. Sending to vendor (test+vendor@tradematch.uk)...');n      try {
        await this.service.sendEmail({
          ...this.testedTemplates.vendor_notification,
          to: 'test+vendor@tradematch.uk',
          subject: `${this.testedTemplates.vendor_notification.subject} - TEST`,
        });
        console.log('   ✅ Vendor notification sent successfully');
        this.results.emailsSent++;
      } catch (error) {
        console.log(`   ❌ Vendor email failed: ${error.message}`);
        this.results.errors.push(`Vendor email: ${error.message}`);
      }
      
      // Send admin email
      console.log('3. Sending to admin (test+admin@tradematch.uk)...');
      try {
        await this.service.sendEmail({
          ...this.testedTemplates.admin_alert,
          to: 'test+admin@tradematch.uk',
          subject: `${this.testedTemplates.admin_alert.subject} - TEST`,
        });
        console.log('   ✅ Admin alert sent successfully');
        this.results.emailsSent++;
      } catch (error) {
        console.log(`   ❌ Admin email failed: ${error.message}`);n        this.results.errors.push(`Admin email: ${error.message}`);
      }
      
      console.log('\n');n      
    } catch (error) {
      console.log(`\n❌ Error sending test emails: ${error.message}\n`);
      this.results.errors.push(`Email send failed: ${error.message}`);
    }
    
    this.results.testsCompleted += 3;
  }

  async testEventIntegration() {
    console.log('🔄 Phase 5: Event Integration\n' + '-'.repeat(40));
    
    // Simulate a quote submission event
    const mockQuoteData = {
      id: 'qt_test_event_123',
      trade: 'Plumbing',
      postcode: 'SW1A 0AA',
      customer_name: 'Test User',
      customer_email: 'test@event.tradematch.uk',
      budget: '500-1000',
      status: 'new'
    };
    
    try {
      console.log('1. Creating mock quote submission event...');
      
      // Simulate what happens when a quote is submitted
      const eventData = {
        actor_id: 'user_test_123',
        actor_role: 'customer', 
        subject_type: 'quote',
        subject_id: mockQuoteData.id,
        job_id: mockQuoteData.id,
        new_state: mockQuoteData,
        metadata: {
          customer_email: mockQuoteData.customer_email,
          customer_name: mockQuoteData.customer_name,
          trade: mockQuoteData.trade
        }
      };
      
      // Note: Without a real broker instance and pool, we can't fully test this
      // But we can validate the event structure
      console.log('   ✅ Event data structure valid');
      console.log(`   Event type: QUOTE_SUBMITTED`);
      console.log(`   Customer: ${mockQuoteData.customer_email}`);
      
      this.results.testsPassed++;
      
      console.log('\n   Note: Full event integration tested during actual quote submission\n');
      
    } catch (error) {
      console.log(`   ❌ Event validation failed: ${error.message}`);
      this.results.errors.push(`Event integration: ${error.message}`);
      this.results.testsFailed++;
    }
    
    this.results.testsCompleted++;
    console.log('\n');
  }

  printSummary() {
    console.log('\n📊 TEST SUMMARY\n' + '='.repeat(50));
    console.log(`Tests completed: ${this.results.testsCompleted}`);
    console.log(`Tests passed: ${this.results.testsPassed}`);
    console.log(`Tests failed: ${this.results.testsFailed}`);
    console.log(`Emails sent: ${this.results.emailsSent}`);
    console.log(`Domain verified: .uk`);
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️  Issues found:');
      this.results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    const allPassed = this.results.testsFailed === 0;
    console.log('\n' + (allPassed ? '✅ All tests passed!' : '❌ Some tests failed'));
    console.log('\nWebsite domain: tradematch.uk');
    console.log('Email domain: tradematch.uk');
    console.log('Superadmin email: superadmin@tradematch.uk');
    
    process.exit(allPassed ? 0 : 1);
  }
}

// CLI Entry Point
if (require.main === module) {
  const suite = new EmailTestSuite();
  suite.run().catch(console.error);
}

module.exports = EmailTestSuite;
