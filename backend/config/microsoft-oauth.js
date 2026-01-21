const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const jwt = require('jsonwebtoken');

let pool;

module.exports = {
    setPool: (p) => {
        pool = p;
    },

    // Configure Microsoft OAuth Strategy
    initialize: () => {
        passport.use('microsoft', new MicrosoftStrategy({
            clientID: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            callbackURL: process.env.MICROSOFT_CALLBACK_URL,
            scope: ['openid', 'email', 'profile'],
            tenant: 'common'
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                // Extract user info from Microsoft profile
                const { id, displayName, userPrincipalName, mail } = profile;
                const email = mail || userPrincipalName;
                const nameParts = displayName ? displayName.split(' ') : ['', ''];
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                // Find or create user
                let user;
                const existingUser = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );
                
                if (existingUser.rows.length > 0) {
                    user = existingUser.rows[0];
                    
                    // Link Microsoft login to existing user (account linking)
                    await pool.query(
                        `UPDATE users 
                         SET auth_provider = CASE 
                             WHEN auth_provider IS NULL OR auth_provider = 'local' THEN 'microsoft'
                             ELSE auth_provider || ',microsoft'
                         END,
                         provider_id = CASE 
                             WHEN provider_id IS NULL THEN $1
                             ELSE provider_id || ',' || $1
                         END,
                         email_verified = true,
                         first_name = COALESCE($2, first_name),
                         last_name = COALESCE($3, last_name)
                         WHERE id = $4`,
                        [id, firstName, lastName, user.id]
                    );
                } else {
                    // Create new user from Microsoft profile
                    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    await pool.query(
                        `INSERT INTO users (
                            id, email, first_name, last_name, auth_provider, 
                            provider_id, email_verified, user_type, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, true, null, 'active')`,
                        [
                            userId,
                            email,
                            firstName,
                            lastName,
                            'microsoft',
                            id
                        ]
                    );
                    
                    user = {
                        id: userId,
                        email,
                        first_name: firstName,
                        last_name: lastName,
                        auth_provider: 'microsoft',
                        email_verified: true,
                        user_type: null
                    };
                }
                
                return done(null, user);
            } catch (error) {
                console.error('Microsoft OAuth error:', error);
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