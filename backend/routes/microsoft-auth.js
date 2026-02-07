const express = require('express');
const passport = require('passport');
const router = express.Router();
const microsoftAuth = require('../config/microsoft-oauth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.tradematch.uk';

let pool;

// Set pool for database access
router.setPool = (p) => {
    pool = p;
    microsoftAuth.setPool(p);
};

// Initialize Microsoft OAuth
microsoftAuth.initialize();

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

/**
 * @route   GET /auth/microsoft
 * @desc    Initiate Microsoft OAuth login
 * @access   Public
 */
router.get('/microsoft', (req, res, next) => {
    const { returnTo } = req.query;
    const state = JSON.stringify({
        returnTo: returnTo || FRONTEND_URL,
        timestamp: Date.now()
    });
    
    passport.authenticate('microsoft', {
        scope: ['openid', 'email', 'profile'],
        state: Buffer.from(state).toString('base64')
    })(req, res, next);
});

/**
 * @route   GET /auth/microsoft/callback
 * @desc    Microsoft OAuth callback
 * @access   Public
 */
router.get('/microsoft/callback', (req, res, next) => {
    passport.authenticate('microsoft', { session: false }, async (err, user) => {
        if (err || !user) {
            console.error('Microsoft OAuth callback error:', err || 'No user returned');
            return res.redirect(`${FRONTEND_URL}/login?error=microsoft_failed`);
        }

        try {
            // Generate JWT token
            const token = microsoftAuth.generateToken(user);

            // Get redirect URL from state
            let returnTo = FRONTEND_URL;
            try {
                const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                returnTo = state.returnTo || FRONTEND_URL;
            } catch (error) {
                console.warn('Failed to parse OAuth state:', error);
            }

            const returnBase = getReturnBase(returnTo);
            // Redirect to login so the opener can store token and navigate in the original tab
            const redirectUrl = `${returnBase}/login?token=${token}&source=microsoft`;

            // Log successful OAuth login
            console.log(`Microsoft OAuth login successful: ${user.email} (${user.user_type || 'no role'})`);

            // Redirect to frontend
            return res.redirect(redirectUrl);
        } catch (error) {
            console.error('Microsoft OAuth callback error:', error);
            return res.redirect(`${FRONTEND_URL}/login?error=microsoft_callback_failed`);
        }
    })(req, res, next);
});

/**
 * @route   GET /auth/microsoft/status
 * @desc    Check Microsoft OAuth status
 * @access   Public
 */
router.get('/microsoft/status', (req, res) => {
    const status = {
        enabled: !!process.env.MICROSOFT_CLIENT_ID && !!process.env.MICROSOFT_CLIENT_SECRET,
        configured: !!process.env.MICROSOFT_CALLBACK_URL,
        clientId: process.env.MICROSOFT_CLIENT_ID ? 'configured' : 'missing',
        callbackUrl: process.env.MICROSOFT_CALLBACK_URL || 'not configured'
    };
    
    res.json(status);
});

module.exports = router;