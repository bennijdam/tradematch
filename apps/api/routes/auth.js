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

let cachedUserColumns = null;

async function getUserColumns() {
  if (cachedUserColumns) return cachedUserColumns;
  const result = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'users'`
  );
  cachedUserColumns = new Set(result.rows.map((row) => row.column_name));
  return cachedUserColumns;
}

function normalizeUserType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'vendor' || normalized === 'tradesperson') return 'vendor';
  if (normalized === 'customer' || normalized === 'user') return 'customer';
  return null;
}

function buildFrontendBase() {
  return (process.env.FRONTEND_URL || 'https://www.tradematch.uk').replace(/\/$/, '');
}

function signActivationToken({ userId, email }) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    {
      purpose: 'email_verification',
      userId,
      email
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function sendActivationEmail({ email, fullName, userType, token }) {
  const frontendBase = buildFrontendBase();
  const activationUrl = `${frontendBase}/activate?token=${encodeURIComponent(token)}`;
  const emailService = new EmailService();
  if (!emailService) return { sent: false, activationUrl };

  const displayName = fullName || email;
  const roleLabel = userType === 'vendor' ? 'vendor' : 'customer';

  await emailService.sendEmail({
    to: email,
    subject: 'Activate your TradeMatch account',
    html: `
      <h2>Activate your TradeMatch account</h2>
      <p>Hi ${displayName},</p>
      <p>Thanks for signing up as a ${roleLabel}. Please activate your account using the link below:</p>
      <p><a href="${activationUrl}">Activate account</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Activate your TradeMatch account\n\nHi ${displayName},\n\nActivate your account: ${activationUrl}\n\nThis link expires in 24 hours.`
  });

  return { sent: true, activationUrl };
}

function getJwtSecret(res) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server authentication configuration error' });
    return null;
  }
  return secret;
}

// ==========================================
// REGISTER ENDPOINT
// ==========================================
router.post('/register', authLimiter, async (req, res) => {
  const { userType, fullName, name, email, phone, password, postcode, oauth_provider, oauth_id, claimQuoteId } = req.body;
  const normalizedName = (fullName || name || '').trim();
  const normalizedUserType = (userType || 'customer').toLowerCase();
  const normalizedClaimQuoteId = String(claimQuoteId || '').trim();

  try {
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

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
            jwtSecret,
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

    let claimedQuoteId = null;
    if (normalizedClaimQuoteId && normalizeUserType(normalizedUserType) === 'customer') {
      try {
        const claimResult = await pool.query(
          `UPDATE quotes q
           SET customer_id = $1, updated_at = NOW()
           FROM users u
           WHERE q.id = $2
             AND q.customer_id = u.id
             AND (u.id LIKE 'guest_%' OR u.email LIKE 'guest_%@guest.tradematch.uk')
           RETURNING q.id`,
          [insertResult.rows[0].id, normalizedClaimQuoteId]
        );
        if (claimResult.rows.length > 0) {
          claimedQuoteId = claimResult.rows[0].id;
        }
      } catch (claimError) {
        console.error('Quote claim error during registration:', claimError);
      }
    }

    // Create activation token (email verification) and send activation email
    const activationToken = signActivationToken({
      userId: insertResult.rows[0].id,
      email: email.toLowerCase()
    });

    let activationEmail = { sent: false, activationUrl: null };
    try {
      activationEmail = await sendActivationEmail({
        email: email.toLowerCase(),
        fullName: normalizedName,
        userType: normalizeUserType(normalizedUserType) || 'customer',
        token: activationToken
      });
      console.log(`📧 Activation email ${activationEmail.sent ? 'sent' : 'skipped'} for ${email.toLowerCase()}`);
    } catch (activationEmailError) {
      console.error('Activation email error:', activationEmailError);
    }

    // Generate JWT token (session token)
    const token = jwt.sign(
      { userId: insertResult.rows[0].id, email: email.toLowerCase() },
      jwtSecret,
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
      message: 'User registered successfully. Activation required.',
      requiresActivation: true,
      token,
      activation: (process.env.NODE_ENV !== 'production' || process.env.RETURN_ACTIVATION_TOKEN === 'true')
        ? {
          token: activationToken,
          url: activationEmail.activationUrl
        }
        : undefined,
      user: {
        id: insertResult.rows[0].id,
        email: insertResult.rows[0].email,
        name: normalizedName,
        fullName: insertResult.rows[0].full_name,
        userType: insertResult.rows[0].user_type,
        oauth_provider: insertResult.rows[0].oauth_provider
      },
      claimedQuoteId
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
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, name, user_type, role, status, email_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.email_verified === false) {
      try {
        const activationToken = signActivationToken({ userId: user.id, email: user.email });
        await sendActivationEmail({
          email: user.email,
          fullName: user.full_name || user.name,
          userType: normalizeUserType(user.user_type) || 'customer',
          token: activationToken
        });
      } catch (activationError) {
        console.warn('Activation email send (login) failed:', activationError?.message || activationError);
      }

      return res.status(403).json({
        error: 'Account activation required',
        requiresActivation: true,
        email: user.email
      });
    }

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
      jwtSecret,
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
// ACTIVATE ACCOUNT (Email verification)
// ==========================================
router.get('/activate', async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ success: false, error: 'Missing activation token' });
  }

  try {
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded || decoded.purpose !== 'email_verification' || !decoded.userId || !decoded.email) {
      return res.status(400).json({ success: false, error: 'Invalid activation token' });
    }

    const columns = await getUserColumns().catch(() => new Set());

    const updates = [];
    const values = [];
    let idx = 1;

    if (columns.has('email_verified')) {
      updates.push(`email_verified = $${idx++}`);
      values.push(true);
    }
    if (columns.has('status')) {
      updates.push(`status = $${idx++}`);
      values.push('active');
    }
    if (columns.has('active')) {
      updates.push(`active = $${idx++}`);
      values.push(true);
    }

    if (!updates.length) {
      return res.json({ success: true, message: 'Activated (no-op)', userId: decoded.userId });
    }

    values.push(decoded.userId);
    const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} AND lower(email) = lower($${idx + 1})`;
    values.push(decoded.email);
    const result = await pool.query(updateSql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Activation error:', error);
    return res.status(400).json({ success: false, error: 'Activation failed' });
  }
});

// ==========================================
// RESEND ACTIVATION EMAIL
// ==========================================
router.post('/resend-activation', authLimiter, async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, full_name, name, user_type, email_verified FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (user.email_verified === true) {
      return res.json({ success: true, message: 'Account already activated' });
    }

    const activationToken = signActivationToken({ userId: user.id, email: user.email });
    let activationEmail = { sent: false, activationUrl: null };

    try {
      activationEmail = await sendActivationEmail({
        email: user.email,
        fullName: user.full_name || user.name,
        userType: normalizeUserType(user.user_type) || 'customer',
        token: activationToken
      });
    } catch (sendError) {
      console.error('Resend activation email error:', sendError);
    }

    const includeToken = process.env.NODE_ENV !== 'production' || process.env.RETURN_ACTIVATION_TOKEN === 'true';
    return res.json({
      success: true,
      message: 'Activation email sent',
      ...(includeToken
        ? {
          activation: {
            token: activationToken,
            url: activationEmail.activationUrl
          }
        }
        : {})
    });
  } catch (error) {
    console.error('Resend activation error:', error);
    return res.status(500).json({ error: 'Failed to resend activation email' });
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
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

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
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    const decoded = jwt.verify(token, jwtSecret);

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

// ==========================================
// FORGOT PASSWORD
// ==========================================
router.post('/forgot-password', authLimiter, async (req, res) => {
  // Always 200 — never reveal whether the email exists
  res.json({ success: true });

  const { email } = req.body;
  if (!email || !emailRegex.test(email)) return;

  try {
    const result = await pool.query(
      "SELECT id, email, full_name FROM users WHERE LOWER(email) = $1 AND status != 'deleted'",
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return;

    const user = result.rows[0];
    const secret = process.env.JWT_SECRET;
    if (!secret) return;

    const resetToken = jwt.sign(
      { purpose: 'password_reset', userId: user.id, email: user.email },
      secret,
      { expiresIn: '15m' }
    );

    const frontendBase = buildFrontendBase();
    const resetUrl = `${frontendBase}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const displayName = user.full_name || user.email;

    const emailService = new EmailService();
    await emailService.sendEmail({
      to: user.email,
      subject: 'Reset your TradeMatch password',
      html: `
        <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f3f7f4;padding:32px 20px">
          <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
            <div style="background:linear-gradient(135deg,#007a3d,#00c268);padding:32px;text-align:center">
              <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.18);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                <span style="font-size:24px">🔑</span>
              </div>
              <h1 style="color:#fff;font-size:1.4rem;font-weight:800;letter-spacing:-.04em;margin:0">Reset your password</h1>
            </div>
            <div style="padding:32px">
              <p style="color:#3d5060;font-size:15px;margin:0 0 8px">Hi ${displayName},</p>
              <p style="color:#3d5060;font-size:14px;line-height:1.7;margin:0 0 24px">We received a request to reset your TradeMatch password. Click the button below — the link expires in <strong>15 minutes</strong>.</p>
              <div style="text-align:center;margin-bottom:28px">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#007a3d,#00c268);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;box-shadow:0 4px 16px rgba(0,194,104,.3)">Reset my password →</a>
              </div>
              <p style="color:#9fb0bc;font-size:12px;text-align:center;margin:0 0 8px">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="color:#9fb0bc;font-size:11px;text-align:center;word-break:break-all;margin:0 0 24px">${resetUrl}</p>
              <hr style="border:none;border-top:1px solid rgba(0,0,0,.07);margin:0 0 20px">
              <p style="color:#9fb0bc;font-size:12px;margin:0">If you didn't request this, you can safely ignore this email — your password won't change.</p>
            </div>
          </div>
          <p style="text-align:center;color:#9fb0bc;font-size:11px;margin-top:20px">© 2026 TradeMatch UK Ltd · <a href="${frontendBase}/privacy" style="color:#9fb0bc">Privacy Policy</a></p>
        </div>`,
      text: `Reset your TradeMatch password\n\nHi ${displayName},\n\nClick the link below to reset your password (expires in 15 minutes):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`
    });
  } catch (err) {
    console.error('Forgot password error:', err);
  }
});

// ==========================================
// RESET PASSWORD
// ==========================================
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password || password.length < 8) {
    return res.status(400).json({ error: 'Token and a password of at least 8 characters are required.' });
  }

  try {
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (e) {
      return res.status(400).json({ error: 'This reset link has expired or is invalid. Please request a new one.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND LOWER(email) = $3 RETURNING id',
      [hashedPassword, decoded.userId, decoded.email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'User not found.' });
    }

    res.json({ success: true, message: 'Password updated. You can now sign in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;