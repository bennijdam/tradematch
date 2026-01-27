const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const GOOGLE_CALLBACK_FALLBACK = 'https://tradematch.onrender.com/auth/google/callback';

let userColumnsCache = null;

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
                const fullName = [name?.givenName, name?.familyName].filter(Boolean).join(' ') || profile.displayName || email;

                const getUserColumns = async () => {
                    if (userColumnsCache) return userColumnsCache;
                    const result = await pool.query(
                        `SELECT column_name, column_default, is_nullable
                         FROM information_schema.columns
                         WHERE table_name = 'users'`
                    );
                    const columns = new Set(result.rows.map((row) => row.column_name));
                    const defaults = new Map(result.rows.map((row) => [row.column_name, row.column_default]));
                    const nullable = new Map(result.rows.map((row) => [row.column_name, row.is_nullable]));
                    userColumnsCache = { columns, defaults, nullable };
                    return userColumnsCache;
                };

                const { columns, defaults, nullable } = await getUserColumns();
                
                // Find or create user
                let user;
                const existingUser = await pool.query(
                    'SELECT * FROM users WHERE email = $1',
                    [email]
                );
                
                if (existingUser.rows.length > 0) {
                    user = existingUser.rows[0];
                    
                    // Link Google login to existing user (account linking)
                    const updates = [];
                    const values = [];
                    let idx = 1;

                    if (columns.has('oauth_provider')) {
                        updates.push(`oauth_provider = $${idx++}`);
                        values.push('google');
                    }
                    if (columns.has('oauth_id')) {
                        updates.push(`oauth_id = $${idx++}`);
                        values.push(id);
                    }
                    if (columns.has('auth_provider')) {
                        updates.push(`auth_provider = $${idx++}`);
                        values.push('google');
                    }
                    if (columns.has('provider_id')) {
                        updates.push(`provider_id = $${idx++}`);
                        values.push(id);
                    }
                    if (columns.has('email_verified')) {
                        updates.push(`email_verified = $${idx++}`);
                        values.push(!!email_verified);
                    }
                    if (columns.has('full_name')) {
                        updates.push(`full_name = COALESCE($${idx++}, full_name)`);
                        values.push(fullName);
                    }
                    if (columns.has('name')) {
                        updates.push(`name = COALESCE($${idx++}, name)`);
                        values.push(fullName);
                    }

                    if (updates.length) {
                        values.push(user.id);
                        await pool.query(
                            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
                            values
                        );
                    }
                } else {
                    // Create new user from Google profile
                    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const passwordSeed = crypto.randomBytes(24).toString('hex');
                    const passwordHash = await bcrypt.hash(passwordSeed, 10);

                    const insertColumns = [];
                    const insertValues = [];
                    const params = [];
                    let idx = 1;

                    const addColumn = (columnName, value) => {
                        insertColumns.push(columnName);
                        insertValues.push(`$${idx++}`);
                        params.push(value);
                    };

                    if (columns.has('id') && !(defaults.get('id') || '').includes('nextval')) {
                        addColumn('id', userId);
                    }

                    addColumn('email', email);

                    if (columns.has('full_name')) {
                        addColumn('full_name', fullName);
                    }
                    if (columns.has('name')) {
                        addColumn('name', fullName);
                    }
                    if (columns.has('first_name')) {
                        addColumn('first_name', name?.givenName || '');
                    }
                    if (columns.has('last_name')) {
                        addColumn('last_name', name?.familyName || '');
                    }

                    if (columns.has('user_type')) {
                        addColumn('user_type', 'customer');
                    }

                    if (columns.has('password_hash')) {
                        addColumn('password_hash', passwordHash);
                    }
                    if (columns.has('password')) {
                        addColumn('password', passwordHash);
                    }

                    if (columns.has('oauth_provider')) {
                        addColumn('oauth_provider', 'google');
                    }
                    if (columns.has('oauth_id')) {
                        addColumn('oauth_id', id);
                    }
                    if (columns.has('auth_provider')) {
                        addColumn('auth_provider', 'google');
                    }
                    if (columns.has('provider_id')) {
                        addColumn('provider_id', id);
                    }

                    if (columns.has('email_verified')) {
                        addColumn('email_verified', !!email_verified);
                    }
                    if (columns.has('status') && nullable.get('status') === 'NO') {
                        addColumn('status', 'active');
                    }
                    if (columns.has('active') && nullable.get('active') === 'NO') {
                        addColumn('active', true);
                    }

                    const insertSql = `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING *`;
                    const insertResult = await pool.query(insertSql, params);
                    user = insertResult.rows[0];
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