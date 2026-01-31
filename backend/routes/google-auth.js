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

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth login
 * @access   Public
 */
router.get('/google', (req, res, next) => {
    const { returnTo } = req.query;
    const state = JSON.stringify({
        returnTo: returnTo || FRONTEND_URL,
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
 * @access   Public
 */
router.get('/google/callback', passport.authenticate('google', { 
    failureRedirect: `${FRONTEND_URL}/auth-login.html?error=oauth_failed`,
    session: false 
}), async (req, res) => {
    try {
        // Generate JWT token
        const token = googleAuth.generateToken(req.user);
        
        // Get redirect URL from state
        let returnTo = FRONTEND_URL;
        try {
            const state = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
            returnTo = state.returnTo || FRONTEND_URL;
        } catch (error) {
            console.warn('Failed to parse OAuth state:', error);
        }
        
        // Redirect to auth-login so the opener can store token and navigate in the original tab
        const redirectUrl = `${returnTo}/auth-login.html?token=${token}&source=google`;
        
        // Log successful OAuth login
        console.log(`Google OAuth login successful: ${req.user.email} (${req.user.user_type || 'no role'})`);
        
        // Redirect to frontend
        res.redirect(redirectUrl);
        
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect(`${FRONTEND_URL}/auth-login.html?error=callback_failed`);
    }
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