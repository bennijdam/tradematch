const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

const GOOGLE_CALLBACK_FALLBACK = 'https://tradematch.onrender.com/auth/google/callback';

let pool;

module.exports = {
    setPool: (p) => {
        pool = p;
    },

    // Configure Google OAuth Strategy
    initialize: () => {
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL || GOOGLE_CALLBACK_FALLBACK,
            scope: ['profile', 'email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                // Extract user info from Google profile
                const { id, name, email, email_verified } = profile._json;
                
                // Find or create user
                let user;
                const existingUser = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );
                
                if (existingUser.rows.length > 0) {
                    user = existingUser.rows[0];
                    
                    // Link Google login to existing user (account linking)
                    await pool.query(
                        `UPDATE users 
                         SET auth_provider = CASE 
                             WHEN auth_provider IS NULL OR auth_provider = 'local' THEN 'google'
                             ELSE auth_provider || ',google'
                         END,
                         provider_id = CASE 
                             WHEN provider_id IS NULL THEN $1
                             ELSE provider_id || ',' || $1
                         END,
                         email_verified = COALESCE($2, email_verified)
                         WHERE id = $3`,
                        [id, email_verified, user.id]
                    );
                } else {
                    // Create new user from Google profile
                    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    await pool.query(
                        `INSERT INTO users (
                            id, email, first_name, last_name, auth_provider, 
                            provider_id, email_verified, user_type, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, true, null, 'active')`,
                        [
                            userId,
                            email,
                            name.givenName || '',
                            name.familyName || '',
                            'google',
                            id,
                            email_verified || false
                        ]
                    );
                    
                    user = {
                        id: userId,
                        email,
                        first_name: name.givenName || '',
                        last_name: name.familyName || '',
                        auth_provider: 'google',
                        email_verified: email_verified || false,
                        user_type: null
                    };
                }
                
                return done(null, user);
            } catch (error) {
                console.error('Google OAuth error:', error);
                return done(error, null);
            }
        }));

        // Serialize user for session
        passport.serializeUser((user, done) => {
            done(null, user);
        });

        // Deserialize user from session
        passport.deserializeUser((user, done) => {
            done(null, user);
        });
    },

    // Generate JWT token
    generateToken: (user) => {
        return jwt.sign(
            {
                userId: user.id,
                email: user.email,
                userType: user.user_type,
                authProvider: user.auth_provider
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }
};