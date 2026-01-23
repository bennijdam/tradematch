/**
 * Super Admin Routes
 * 
 * Handles all super admin operations including:
 * - User management
 * - Vendor approval
 * - Review moderation
 * - System analytics
 * - Payment oversight
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

let pool, eventBroker;

router.setPool = (p) => { pool = p; };
router.setEventBroker = (eb) => { eventBroker = eb; };

// Apply super admin authentication to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

// ============================================================
// DASHBOARD STATS
// ============================================================

/**
 * GET /api/admin/stats
 * Get dashboard overview statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        
        // Calculate date range
        const daysAgo = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        // Total users
        const usersResult = await pool.query(
            `SELECT COUNT(*) as total,
                    COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_count
             FROM users`,
            [startDate]
        );
        
        // Active vendors
        const vendorsResult = await pool.query(
            `SELECT COUNT(*) as total,
                    COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_count
             FROM users
             WHERE role = 'vendor' AND status = 'active'`,
            [startDate]
        );
        
        // Total jobs/quotes
        const jobsResult = await pool.query(
            `SELECT COUNT(*) as total,
                    COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_count
             FROM jobs`,
            [startDate]
        );
        
        // Revenue (from payments)
        const revenueResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(CASE WHEN created_at >= $1 THEN amount ELSE 0 END), 0) as period_amount
             FROM payments
             WHERE status = 'paid'`,
            [startDate]
        );
        
        // Calculate growth percentages
        const calculateGrowth = (current, total) => {
            const previous = total - current;
            if (previous === 0) return 0;
            return ((current / previous) * 100 - 100).toFixed(1);
        };
        
        const stats = {
            totalUsers: {
                count: parseInt(usersResult.rows[0].total),
                growth: calculateGrowth(
                    parseInt(usersResult.rows[0].new_count),
                    parseInt(usersResult.rows[0].total)
                )
            },
            activeVendors: {
                count: parseInt(vendorsResult.rows[0].total),
                growth: calculateGrowth(
                    parseInt(vendorsResult.rows[0].new_count),
                    parseInt(vendorsResult.rows[0].total)
                )
            },
            totalJobs: {
                count: parseInt(jobsResult.rows[0].total),
                growth: calculateGrowth(
                    parseInt(jobsResult.rows[0].new_count),
                    parseInt(jobsResult.rows[0].total)
                )
            },
            revenue: {
                total: parseFloat(revenueResult.rows[0].total || 0),
                period: parseFloat(revenueResult.rows[0].period_amount || 0),
                growth: calculateGrowth(
                    parseFloat(revenueResult.rows[0].period_amount || 0),
                    parseFloat(revenueResult.rows[0].total || 0)
                )
            },
            period: period
        };
        
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

/**
 * GET /api/admin/activity
 * Get recent platform activity
 */
router.get('/activity', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const result = await pool.query(
            `SELECT 
                event_type,
                actor_id,
                actor_role,
                subject_type,
                subject_id,
                created_at,
                metadata
             FROM event_log
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
        );
        
        res.json({ success: true, activity: result.rows });
        
    } catch (error) {
        console.error('Activity fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// ============================================================
// USER MANAGEMENT
// ============================================================

/**
 * GET /api/admin/users
 * Get all users with filters and pagination
 */
router.get('/users', async (req, res) => {
    try {
        const { 
            search = '',
            role = '',
            status = '',
            page = 1,
            limit = 50
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                id, email, full_name, role, status, phone,
                email_verified, phone_verified, created_at, last_login_at
            FROM users
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;
        
        if (search) {
            query += ` AND (
                email ILIKE $${paramCount} OR 
                full_name ILIKE $${paramCount} OR 
                id ILIKE $${paramCount}
            )`;
            params.push(`%${search}%`);
            paramCount++;
        }
        
        if (role) {
            query += ` AND role = $${paramCount}`;
            params.push(role);
            paramCount++;
        }
        
        if (status) {
            query += ` AND status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const countParams = [];
        let countParamNum = 1;
        
        if (search) {
            countQuery += ` AND (email ILIKE $${countParamNum} OR full_name ILIKE $${countParamNum} OR id ILIKE $${countParamNum})`;
            countParams.push(`%${search}%`);
            countParamNum++;
        }
        if (role) {
            countQuery += ` AND role = $${countParamNum}`;
            countParams.push(role);
            countParamNum++;
        }
        if (status) {
            countQuery += ` AND status = $${countParamNum}`;
            countParams.push(status);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            success: true,
            users: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
router.get('/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const userResult = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get job history
        const jobsResult = await pool.query(
            `SELECT id, title, status, created_at
             FROM jobs
             WHERE customer_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId]
        );
        
        // Get payment history
        const paymentsResult = await pool.query(
            `SELECT id, amount, status, created_at
             FROM payments
             WHERE customer_id = $1 OR vendor_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId]
        );
        
        // Get reviews (if vendor)
        let reviews = [];
        if (user.role === 'vendor') {
            const reviewsResult = await pool.query(
                `SELECT rating, comment, created_at
                 FROM job_reviews
                 WHERE vendor_id = $1
                 ORDER BY created_at DESC
                 LIMIT 10`,
                [userId]
            );
            reviews = reviewsResult.rows;
        }
        
        res.json({
            success: true,
            user,
            jobs: jobsResult.rows,
            payments: paymentsResult.rows,
            reviews
        });
        
    } catch (error) {
        console.error('User detail fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Update user status (suspend, activate, ban)
 */
router.patch('/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;
        
        const validStatuses = ['active', 'suspended', 'banned', 'pending'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        await pool.query(
            `UPDATE users SET status = $1, updated_at = NOW()
             WHERE id = $2`,
            [status, userId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'user_status_change', 'user', userId, JSON.stringify({ status, reason })]
        );
        
        res.json({ success: true, message: `User ${status}` });
        
    } catch (error) {
        console.error('User status update error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

// ============================================================
// VENDOR MANAGEMENT
// ============================================================

/**
 * GET /api/admin/vendors/pending
 * Get vendors pending approval
 */
router.get('/vendors/pending', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.id, u.email, u.full_name, u.phone, u.created_at,
                u.metadata
             FROM users u
             WHERE u.role = 'vendor' AND u.status = 'pending'
             ORDER BY u.created_at ASC`
        );
        
        res.json({ success: true, vendors: result.rows });
        
    } catch (error) {
        console.error('Pending vendors fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch pending vendors' });
    }
});

/**
 * POST /api/admin/vendors/:vendorId/approve
 * Approve a vendor application
 */
router.post('/vendors/:vendorId/approve', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { notes } = req.body;
        
        await pool.query(
            `UPDATE users 
             SET status = 'active', updated_at = NOW()
             WHERE id = $1 AND role = 'vendor'`,
            [vendorId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'vendor_approved', 'user', vendorId, JSON.stringify({ notes })]
        );
        
        // TODO: Send approval email to vendor
        
        res.json({ success: true, message: 'Vendor approved' });
        
    } catch (error) {
        console.error('Vendor approval error:', error);
        res.status(500).json({ error: 'Failed to approve vendor' });
    }
});

/**
 * POST /api/admin/vendors/:vendorId/reject
 * Reject a vendor application
 */
router.post('/vendors/:vendorId/reject', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { reason } = req.body;
        
        await pool.query(
            `UPDATE users 
             SET status = 'rejected', updated_at = NOW()
             WHERE id = $1 AND role = 'vendor'`,
            [vendorId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'vendor_rejected', 'user', vendorId, JSON.stringify({ reason })]
        );
        
        // TODO: Send rejection email to vendor
        
        res.json({ success: true, message: 'Vendor rejected' });
        
    } catch (error) {
        console.error('Vendor rejection error:', error);
        res.status(500).json({ error: 'Failed to reject vendor' });
    }
});

// ============================================================
// REVIEW MODERATION
// ============================================================

/**
 * GET /api/admin/reviews/pending
 * Get reviews pending moderation
 */
router.get('/reviews/pending', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                r.id, r.rating, r.comment, r.created_at,
                r.job_id, r.customer_id, r.vendor_id,
                c.full_name as customer_name,
                v.full_name as vendor_name
             FROM job_reviews r
             JOIN users c ON r.customer_id = c.id
             JOIN users v ON r.vendor_id = v.id
             WHERE r.moderation_status = 'pending'
             ORDER BY r.created_at ASC`
        );
        
        res.json({ success: true, reviews: result.rows });
        
    } catch (error) {
        console.error('Pending reviews fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch pending reviews' });
    }
});

/**
 * PATCH /api/admin/reviews/:reviewId/moderate
 * Approve or reject a review
 */
router.patch('/reviews/:reviewId/moderate', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { action, reason } = req.body; // action: 'approve', 'hide', 'remove'
        
        const validActions = ['approve', 'hide', 'remove'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        const moderationStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'removed';
        
        await pool.query(
            `UPDATE job_reviews 
             SET moderation_status = $1, moderated_at = NOW(), moderated_by = $2
             WHERE id = $3`,
            [moderationStatus, req.user.userId, reviewId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'review_moderated', 'review', reviewId, JSON.stringify({ action, reason })]
        );
        
        res.json({ success: true, message: `Review ${action}d` });
        
    } catch (error) {
        console.error('Review moderation error:', error);
        res.status(500).json({ error: 'Failed to moderate review' });
    }
});

module.exports = router;
