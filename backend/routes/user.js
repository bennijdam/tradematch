const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

let pool;

router.setPool = (p) => {
    pool = p;
};

/**
 * @route   PUT /api/user/update-role
 * @desc    Update user role (for OAuth users without role)
 * @access   Private
 */
router.put('/update-role', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify JWT and get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { userType } = req.body;

        if (!userType || !['customer', 'vendor', 'tradesperson'].includes(userType)) {
            return res.status(400).json({ 
                error: 'Valid userType required (customer, vendor, or tradesperson)' 
            });
        }

        // Update user role in database
        await pool.query(
            'UPDATE users SET user_type = $1 WHERE id = $2',
            [userType, decoded.userId]
        );

        // Get updated user info
        const userResult = await pool.query(
            'SELECT id, email, first_name, last_name, user_type, auth_provider, email_verified FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: {
                id: user.id,
                email: user.email,
                name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email,
                userType: user.user_type,
                authProvider: user.auth_provider,
                emailVerified: user.email_verified
            }
        });

    } catch (error) {
        console.error('Update role error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        res.status(500).json({ 
            error: 'Failed to update user role',
            details: error.message 
        });
    }
});

module.exports = router;