const express = require('express');
const router = express.Router();

// Mock OAuth Routes for Testing
router.get('/google', (req, res) => {
  console.log('🔧 Google OAuth route called');
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth-login?error=oauth_test&provider=google`);
});

router.get('/microsoft', (req, res) => {
  console.log('🔧 Microsoft OAuth route called');
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth-login?error=oauth_test&provider=microsoft`);
});

// Google OAuth Callback (simplified)
router.post('/google/callback', (req, res) => {
  console.log('🔧 Google OAuth callback called');
  
  // Create mock user data (replace with real OAuth later)
  const mockUser = {
    id: 'google_' + Date.now(),
    email: 'google.user@example.com',
    name: 'Google User',
    provider: 'google',
    user_type: 'customer'
  };

  // Create JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(mockUser, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

  console.log('✅ Mock Google OAuth success:', mockUser.email);

  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/customer-dashboard.html?token=${token}&source=google`);
});

// Microsoft OAuth Callback (simplified)
router.post('/microsoft/callback', (req, res) => {
  console.log('🔧 Microsoft OAuth callback called');
  
  // Create mock user data
  const mockUser = {
    id: 'ms_' + Date.now(),
    email: 'microsoft.user@example.com',
    name: 'Microsoft User',
    provider: 'microsoft',
    user_type: 'customer'
  };

  // Create JWT token
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(mockUser, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

  console.log('✅ Mock Microsoft OAuth success:', mockUser.email);

  // Redirect to frontend with token
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:8080'}/customer-dashboard.html?token=${token}&source=microsoft`);
});

module.exports = router;