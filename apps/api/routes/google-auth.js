const express = require('express');
const passport = require('passport');
const router = express.Router();
const googleAuth = require('../config/google-oauth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.tradematch.uk';

let pool;

// Set pool for database access
router.setPool = (p) => {
    pool = p;
    googleAuth.setPool(p);
};

// Initialize Google OAuth
googleAuth.initialize();

function getReturnBase(value) {
    if (!value) return FRONTEND_URL;
    try {
        return new URL(value).origin;
    } catch (error) {
        try {
            return new URL(value, FRONTEND_URL).origin;
        } catch (nestedError) {
            return FRONTEND_URL;
        }
    }
}

function getReturnBaseFromState(stateValue) {
    if (!stateValue) return getReturnBase(FRONTEND_URL);
    try {
        const decoded = JSON.parse(Buffer.from(stateValue, 'base64').toString());
        return getReturnBase(decoded.returnTo || FRONTEND_URL);
    } catch (_) {
        return getReturnBase(FRONTEND_URL);
    }
}

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth login
 * @access   Public
 */
router.get('/google', (req, res, next) => {
    const { returnTo, userType } = req.query;
    const state = JSON.stringify({
        returnTo: returnTo || FRONTEND_URL,
        userType: userType || null,
        timestamp: Date.now()
    });
    
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: Buffer.from(state).toString('base64')
    })(req, res, next);
});

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback', (req, res, next) => {
    // If user denied consent or we got an incomplete callback, avoid hitting the token endpoint.
    // (Passport otherwise throws TokenError: Bad Request when code is missing.)
    if (req.query && req.query.error) {
        const returnBase = getReturnBaseFromState(req.query.state);
        return res.redirect(`${returnBase}/login?error=google_${encodeURIComponent(String(req.query.error))}`);
    }

    if (!req.query || !req.query.code) {
        const returnBase = getReturnBaseFromState(req.query && req.query.state);
        return res.redirect(`${returnBase}/login?error=google_missing_code`);
    }

    passport.authenticate('google', { session: false }, async (err, user, info) => {
        const errorId = `oauth_google_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        if (err || !user) {
            console.error('Google OAuth callback error:', {
                errorId,
                hasError: Boolean(err),
                message: err && err.message ? err.message : String(err || 'No user returned'),
                info: info && typeof info === 'object' ? {
                    message: info.message,
                    name: info.name
                } : info
            });
            return res.redirect(`${FRONTEND_URL}/login?error=google_failed&errorId=${encodeURIComponent(errorId)}`);
        }

        try {
            // Generate JWT token
            const token = googleAuth.generateToken(user);

            // Get redirect URL from state
            let returnTo = FRONTEND_URL;
            try {
                if (req.query.state) {
                    const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                    returnTo = state.returnTo || FRONTEND_URL;
                }
            } catch (stateError) {
                console.warn('Failed to parse OAuth state:', stateError);
            }

            const returnBase = getReturnBase(returnTo);
            // Redirect to login so the opener can store token and navigate in the original tab
            const redirectUrl = `${returnBase}/login?token=${token}&source=google`;

            console.log(`Google OAuth login successful: ${user.email} (${user.user_type || 'no role'})`);
            return res.redirect(redirectUrl);
        } catch (callbackError) {
            console.error('Google OAuth callback error:', {
                errorId,
                message: callbackError && callbackError.message ? callbackError.message : String(callbackError)
            });
            return res.redirect(`${FRONTEND_URL}/login?error=google_callback_failed&errorId=${encodeURIComponent(errorId)}`);
        }
    })(req, res, next);
});


/**
 * @route   GET /auth/google/status
 * @desc    Check Google OAuth status
 * @access   Public
 */
router.get('/google/status', (req, res) => {
    const status = {
        enabled: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
        configured: !!process.env.GOOGLE_CALLBACK_URL,
        clientId: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'missing',
        callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'not configured'
    };
    
    res.json(status);
});

module.exports = router;