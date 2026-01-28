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
router.get('/microsoft/callback', passport.authenticate('microsoft', { 
    failureRedirect: `${FRONTEND_URL}/auth-login?error=microsoft_failed`,
    session: false 
}), async (req, res) => {
    try {
        // Generate JWT token
        const token = microsoftAuth.generateToken(req.user);
        
        // Get redirect URL from state
        let returnTo = FRONTEND_URL;
        try {
            const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
            returnTo = state.returnTo || FRONTEND_URL;
        } catch (error) {
            console.warn('Failed to parse OAuth state:', error);
        }
        
        // Redirect to auth-login so the opener can store token and navigate in the original tab
        const redirectUrl = `${returnTo}/auth-login?token=${token}&source=microsoft`;
        
        // Log successful OAuth login
        console.log(`Microsoft OAuth login successful: ${req.user.email} (${req.user.user_type || 'no role'})`);
        
        // Redirect to frontend
        res.redirect(redirectUrl);
        
    } catch (error) {
        console.error('Microsoft OAuth callback error:', error);
        res.redirect(`${FRONTEND_URL}/auth-login?error=microsoft_callback_failed`);
    }
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