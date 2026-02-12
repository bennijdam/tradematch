/**
 * Test Script: Lead Preview Email System
 * 
 * Tests the new preview email notification endpoint
 * Run: node apps/api/scripts/test-preview-email.js
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const vendorPassword = process.env.VENDOR_PASSWORD || 'VendorPass123!';

async function ensureVendor() {
  if (process.env.VENDOR_ID && process.env.VENDOR_EMAIL) {
    return { id: process.env.VENDOR_ID, email: process.env.VENDOR_EMAIL };
  }

  const rand = Math.floor(Math.random() * 1e9);
  const email = process.env.VENDOR_EMAIL || `vendor_preview_${rand}@example.com`;

  try {
    const registerRes = await axios.post(
      `${BACKEND_URL}/api/auth/register`,
      {
        email,
        password: vendorPassword,
        fullName: 'Preview Vendor',
        userType: 'vendor',
        postcode: 'SW1A 1AA'
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    return { id: registerRes.data.user.id, email };
  } catch (error) {
    const status = error.response?.status;
    if (status && status !== 409 && status !== 400) {
      throw error;
    }

    const loginRes = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      { email, password: vendorPassword },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
    );

    return { id: loginRes.data.userId, email };
  }
}

const previewPayload = {
  quoteId: 999,
  leadPrice: 3.50,
  matchScore: 82,
  preview: {
    category: 'Plumbing',
    area: 'SW1A 1**',
    budgetRange: '£500-£1000',
    timeframe: 'Within 2 weeks',
    qualityScore: 82,
    qualityTier: 'premium'
  }
};

async function testPreviewEmail() {
  console.log('🧪 Testing Lead Preview Email System...\n');
  
  try {
    const vendor = await ensureVendor();
    const testData = {
      vendorId: vendor.id,
      vendorEmail: vendor.email,
      ...previewPayload
    };

    console.log('📤 Sending request to:', `${BACKEND_URL}/api/email/lead-preview-notification`);
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(
      `${BACKEND_URL}/api/email/lead-preview-notification`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    console.log('\n✅ SUCCESS! Email sent successfully');
    console.log('📧 Response:', JSON.stringify(response.data, null, 2));
    console.log('\n📬 Check your inbox at:', testData.vendorEmail);
    console.log('📝 Email ID:', response.data.emailId);
    
  } catch (error) {
    console.error('\n❌ ERROR sending email:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received from server');
      console.error('Is the backend running on', BACKEND_URL, '?');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run test
testPreviewEmail();
