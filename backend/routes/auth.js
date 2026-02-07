const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const EmailService = require('../services/email.service');

// Import pool from server.js (we'll export it)
let pool;

// Initialize pool
router.setPool = (p) => {
  pool = p;
};

// ==========================================
// REGISTER ENDPOINT
// ==========================================
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('userType').isIn(['customer', 'vendor']).withMessage('User type must be customer or vendor')
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, userType, phone, postcode } = req.body;

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user ID
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert user
    await pool.query(
      `INSERT INTO users (id, email, password_hash, name, user_type, phone, postcode, email_verified, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, 'active')`,
      [userId, email.toLowerCase(), hashedPassword, name, userType, phone || null, postcode || null]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId, email: email.toLowerCase(), userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Send welcome email
    try {
      const emailService = new EmailService();
      if (emailService) {
        await emailService.sendEmail({
          to: email.toLowerCase(),
          subject: `Welcome to TradeMatch${userType === 'vendor' ? ' - Your Vendor Account is Ready!' : '!'} ✅`,
          html: userType === 'vendor' ? `
            <h2>Welcome to TradeMatch! 🎉</h2>
            <p>Dear ${name},</p>
            <p>Thank you for registering as a trusted tradesperson on TradeMatch. Your professional profile has been created and is now visible to homeowners across the UK.</p>
            <h3>What You Can Do:</h3>
            <ul>
              <li>📋 Browse available quote requests from customers</li>
              <li>📝 Submit competitive bids for projects</li>
              <li>💰 Manage your earnings and payment schedules</li>
              <li>⭐ Build your reputation through customer reviews</li>
              <li>📊 Track your business performance with detailed analytics</li>
              <li>🎯 Access exclusive TradeMatch benefits and support</li>
            </ul>
            <h3>Getting Started:</h3>
            <ol>
              <li>Complete your vendor profile with services offered and areas covered</li>
              <li>Upload photos of your previous work to showcase quality</li>
              <li>Verify your insurance and qualifications</li>
              <li>Set your availability and response times</li>
              <li>Familiarize yourself with our platform features</li>
            </ol>
            <p>We're excited to have you join our community of trusted tradespeople. Let's build your business together!</p>
            <p>Best regards,<br>The TradeMatch Team</p>
          ` : `
            <h2>Welcome to TradeMatch! 🏠</h2>
            <p>Dear ${name},</p>
            <p>Thank you for joining TradeMatch! Your account has been created and you're ready to get matched with customers who need your skills and expertise.</p>
            <h3>What You Can Do:</h3>
            <ul>
              <li>📝 Submit competitive quotes for customer projects</li>
              <li>🔧 Get matched with verified customers in your area</li>
              <li>💰 Receive secure payments for completed work</li>
              <li>📊 Track your earnings and business growth</li>
              <li>⭐ Build your reputation through excellent customer reviews</li>
            </ul>
            <h3>Getting Started:</h3>
            <ol>
              <li>Post your first quote to start getting matched with customers</li>
              <li>Complete your profile with your skills, services, and service areas</li>
              <li>Set your availability and response preferences</li>
              <li>Upload photos of your previous work to showcase your expertise</li>
              <li>Familiarize yourself with our platform and mobile app</li>
            </ol>
            <p>Ready to transform your trade business? Let's get started!</p>
            <p>Best regards,<br>The TradeMatch Team</p>
          `,
          text: `Welcome to TradeMatch${userType === 'vendor' ? ' - Your Vendor Account is Ready!' : '!'} ✅\n\nDear ${name},\n\nThank you for registering with TradeMatch! Your account has been successfully created and you're ready to get started.`
        });
        console.log(`📧 Welcome email sent to ${email.toLowerCase()}`);
      }
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        userType
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
});

// ==========================================
// LOGIN ENDPOINT
// ==========================================
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, name, user_type, role, status FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is suspended or deleted' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const role = user.role || user.user_type;
    const displayName = user.full_name || user.name || user.email;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, userType: user.user_type, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      userId: user.id,
      email: user.email,
      name: displayName,
      role,
      user: {
        id: user.id,
        email: user.email,
        name: displayName,
        userType: user.user_type,
        role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// ==========================================
// GET CURRENT USER (Protected Route)
// ==========================================
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, name, user_type, phone, postcode, avatar_url, created_at, metadata FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const metadata = user.metadata || {};

    res.json({
      success: true,
      user: {
        ...user,
        onboarding_completed: Boolean(metadata.onboarding_completed)
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ==========================================
// VERIFY TOKEN (Admin portal)
// ==========================================
router.get('/verify', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, email, full_name, user_type, role, status FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const role = user.role || user.user_type;

    res.json({
      userId: user.id,
      email: user.email,
      name: user.full_name || user.email,
      role,
      status: user.status
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;