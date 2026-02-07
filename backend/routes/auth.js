const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const EmailService = require('../services/email.service');

// Import pool from server.js (we'll export it)
let pool;

// Initialize pool
router.setPool = (p) => {
  pool = p;
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedUserTypes = ['customer', 'vendor', 'tradesperson'];

// ==========================================
// REGISTER ENDPOINT
// ==========================================
router.post('/register', authLimiter, async (req, res) => {
  const { userType, fullName, name, email, phone, password, postcode, oauth_provider, oauth_id } = req.body;
  const normalizedName = (fullName || name || '').trim();
  const normalizedUserType = (userType || 'customer').toLowerCase();

  try {
    if (!email || !normalizedName) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'fullName']
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!allowedUserTypes.includes(normalizedUserType)) {
      return res.status(400).json({ error: 'User type must be customer or vendor' });
    }

    if (!oauth_provider && (!password || password.length < 8)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let hashedPassword = null;
    let authProvider = 'local';

    if (oauth_provider && oauth_provider !== 'local') {
      authProvider = oauth_provider;

      if (oauth_id) {
        const existingOauthUser = await pool.query(
          'SELECT id FROM users WHERE oauth_id = $1',
          [oauth_id]
        );

        if (existingOauthUser.rows.length > 0) {
          await pool.query(
            'UPDATE users SET oauth_provider = $1, full_name = $2, email = $3, phone = $4, postcode = $5 WHERE oauth_id = $6',
            [oauth_provider, normalizedName, email.toLowerCase(), phone, postcode, oauth_id]
          );

          const user = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [existingOauthUser.rows[0].id]
          );

          const token = jwt.sign(
            { userId: user.rows[0].id, email: email.toLowerCase() },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
          );

          return res.json({
            message: 'OAuth account linked successfully',
            token,
            user: user.rows[0]
          });
        }
      }
    } else {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Insert user
    const insertResult = await pool.query(
      `INSERT INTO users (id, user_type, full_name, name, email, phone, password_hash, postcode, oauth_provider, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, user_type, full_name, email, phone, postcode, oauth_provider`,
      [
        require('crypto').randomUUID(),
        normalizedUserType,
        normalizedName,
        normalizedName,
        email.toLowerCase(),
        phone || null,
        hashedPassword,
        postcode || null,
        authProvider
      ]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: insertResult.rows[0].id, email: email.toLowerCase() },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    // Send welcome email
    try {
      const emailService = new EmailService();
      if (emailService) {
        await emailService.sendEmail({
          to: email.toLowerCase(),
          subject: `Welcome to TradeMatch${normalizedUserType === 'vendor' || normalizedUserType === 'tradesperson' ? ' - Your Vendor Account is Ready!' : '!'} ✅`,
          html: normalizedUserType === 'vendor' || normalizedUserType === 'tradesperson' ? `
            <h2>Welcome to TradeMatch! 🎉</h2>
            <p>Dear ${normalizedName},</p>
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
            <p>Dear ${normalizedName},</p>
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
          text: `Welcome to TradeMatch${normalizedUserType === 'vendor' || normalizedUserType === 'tradesperson' ? ' - Your Vendor Account is Ready!' : '!'} ✅\n\nDear ${normalizedName},\n\nThank you for registering with TradeMatch! Your account has been successfully created and you're ready to get started.`
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
        id: insertResult.rows[0].id,
        email: insertResult.rows[0].email,
        name: normalizedName,
        fullName: insertResult.rows[0].full_name,
        userType: insertResult.rows[0].user_type,
        oauth_provider: insertResult.rows[0].oauth_provider
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
router.post('/login', authLimiter, async (req, res) => {
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
    if (user.status && user.status !== 'active' && user.status !== 'confirmed') {
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
      process.env.JWT_SECRET || 'fallback-secret',
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
        fullName: displayName,
        userType: user.user_type,
        role,
        oauth_provider: user.oauth_provider || null
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
      'SELECT id, email, full_name, name, user_type, phone, postcode, avatar_url, created_at, metadata, oauth_provider, email_verified FROM users WHERE id = $1',
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
        fullName: user.full_name || user.name || user.email,
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