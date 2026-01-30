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

/**
 * GET /api/admin/charts
 * Get chart data for dashboard (time series + user type breakdown)
 */
router.get('/charts', async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - (days - 1));
        startDate.setHours(0, 0, 0, 0);

        const labels = [];
        const dayIndex = new Map();

        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            labels.push(d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
            dayIndex.set(key, i);
        }

        const initSeries = () => new Array(days).fill(0);
        const usersSeries = initSeries();
        const jobsSeries = initSeries();
        const quotesSeries = initSeries();
        const revenueSeries = initSeries();

        const safeQuery = async (sql, params) => {
            try {
                return await pool.query(sql, params);
            } catch (error) {
                console.warn('Chart query failed:', error.message);
                return { rows: [] };
            }
        };

        const assignSeries = (rows, target) => {
            rows.forEach(row => {
                const dayValue = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day);
                const idx = dayIndex.get(dayValue);
                if (idx !== undefined) {
                    target[idx] = parseInt(row.count || 0);
                }
            });
        };

        const assignRevenue = (rows, target) => {
            rows.forEach(row => {
                const dayValue = row.day instanceof Date ? row.day.toISOString().slice(0, 10) : String(row.day);
                const idx = dayIndex.get(dayValue);
                if (idx !== undefined) {
                    target[idx] = parseFloat(row.amount || 0);
                }
            });
        };

        const usersResult = await safeQuery(
            `SELECT DATE(created_at) as day, COUNT(*)::int as count
             FROM users
             WHERE created_at >= $1
             GROUP BY day
             ORDER BY day`,
            [startDate]
        );
        assignSeries(usersResult.rows, usersSeries);

        const jobsResult = await safeQuery(
            `SELECT DATE(created_at) as day, COUNT(*)::int as count
             FROM jobs
             WHERE created_at >= $1
             GROUP BY day
             ORDER BY day`,
            [startDate]
        );
        assignSeries(jobsResult.rows, jobsSeries);

        const quotesResult = await safeQuery(
            `SELECT DATE(created_at) as day, COUNT(*)::int as count
             FROM quotes
             WHERE created_at >= $1
             GROUP BY day
             ORDER BY day`,
            [startDate]
        );
        assignSeries(quotesResult.rows, quotesSeries);

        const revenueResult = await safeQuery(
            `SELECT DATE(created_at) as day, COALESCE(SUM(amount), 0)::float as amount
             FROM payments
             WHERE status = 'paid' AND created_at >= $1
             GROUP BY day
             ORDER BY day`,
            [startDate]
        );
        assignRevenue(revenueResult.rows, revenueSeries);

        const roleResult = await safeQuery(
            `SELECT COALESCE(role, user_type) as role, COUNT(*)::int as count
             FROM users
             GROUP BY COALESCE(role, user_type)`
        );

        const userTypes = { customers: 0, vendors: 0, admins: 0 };
        roleResult.rows.forEach(row => {
            const role = String(row.role || '').toLowerCase();
            if (role === 'customer') userTypes.customers += parseInt(row.count || 0);
            else if (role === 'vendor') userTypes.vendors += parseInt(row.count || 0);
            else if (role === 'admin' || role === 'super_admin') userTypes.admins += parseInt(row.count || 0);
        });

        res.json({
            success: true,
            charts: {
                labels,
                users: usersSeries,
                jobs: jobsSeries,
                quotes: quotesSeries,
                revenue: revenueSeries,
                userTypes
            }
        });
    } catch (error) {
        console.error('Charts data error:', error);
        res.status(500).json({ error: 'Failed to fetch chart data' });
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
                id, email, full_name, COALESCE(role, user_type) as role, status, phone,
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
            query += ` AND COALESCE(role, user_type) = $${paramCount}`;
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
            countQuery += ` AND COALESCE(role, user_type) = $${countParamNum}`;
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
        const userRole = user.role || user.user_type;
        if (userRole === 'vendor') {
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
             WHERE COALESCE(u.role, u.user_type) = 'vendor' AND u.status = 'pending'
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
             WHERE id = $1 AND COALESCE(role, user_type) = 'vendor'`,
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
             WHERE id = $1 AND COALESCE(role, user_type) = 'vendor'`,
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
        const columnsResult = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_name = 'job_reviews'`
        );
        const columnSet = new Set(columnsResult.rows.map(row => row.column_name));

        const hasModerationStatus = columnSet.has('moderation_status');
        const commentColumn = columnSet.has('comment')
            ? 'r.comment'
            : (columnSet.has('feedback') ? 'r.feedback' : 'NULL');
        const moderationFilter = hasModerationStatus
            ? "r.moderation_status = 'pending'"
            : 'COALESCE(r.is_moderated, false) = false';

        const result = await pool.query(
            `SELECT 
                r.id, r.rating, ${commentColumn} AS comment, r.created_at,
                r.job_id, r.customer_id, r.vendor_id,
                c.full_name as customer_name,
                v.full_name as vendor_name
             FROM job_reviews r
             JOIN users c ON r.customer_id = c.id
             JOIN users v ON r.vendor_id = v.id
             WHERE ${moderationFilter}
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
        
        const columnsResult = await pool.query(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_name = 'job_reviews'`
        );
        const columnSet = new Set(columnsResult.rows.map(row => row.column_name));

        if (columnSet.has('moderation_status')) {
            const moderationStatus = action === 'approve' ? 'approved' : action === 'hide' ? 'hidden' : 'removed';
            await pool.query(
                `UPDATE job_reviews 
                 SET moderation_status = $1, moderated_at = NOW(), moderated_by = $2
                 WHERE id = $3`,
                [moderationStatus, req.user.userId, reviewId]
            );
        } else {
            const isApproved = action === 'approve';
            await pool.query(
                `UPDATE job_reviews 
                 SET is_moderated = true, is_approved = $1, moderation_reason = $2
                 WHERE id = $3`,
                [isApproved, reason || null, reviewId]
            );
        }
        
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

// ============================================================
// BIDS
// ============================================================

/**
 * GET /api/admin/bids
 * List bids with quote and user context
 */
router.get('/bids', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const params = [];
        let sql = `
            SELECT b.*, 
                   q.title AS quote_title,
                   q.service_type,
                   q.customer_id,
                   cu.full_name AS customer_name,
                   vu.full_name AS vendor_name
            FROM bids b
            LEFT JOIN quotes q ON b.quote_id = q.id
            LEFT JOIN users cu ON q.customer_id = cu.id
            LEFT JOIN users vu ON b.vendor_id = vu.id
        `;

        if (status) {
            params.push(status);
            sql += ` WHERE b.status = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        params.push(parseInt(offset, 10));
        sql += ` ORDER BY b.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(sql, params);
        res.json({ success: true, bids: result.rows });
    } catch (error) {
        console.error('Admin bids error:', error);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * GET /api/admin/audit
 * Get audit log with filters
 */
router.get('/audit', async (req, res) => {
    try {
        const { days = 30, action, target_type, page = 1, limit = 20 } = req.query;
        
        const offset = (page - 1) * limit;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        
        let query = `SELECT a.*, u.email as admin_email 
                     FROM admin_audit_log a
                     LEFT JOIN users u ON a.admin_id = u.id
                     WHERE a.created_at >= $1`;
        const params = [startDate];
        
        let paramIndex = 2;
        
        if (action) {
            query += ` AND a.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }
        
        if (target_type) {
            query += ` AND a.target_type = $${paramIndex}`;
            params.push(target_type);
            paramIndex++;
        }
        
        query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM admin_audit_log 
             WHERE created_at >= $1${action ? ` AND action = $2` : ''}${target_type ? ` AND target_type = $${action ? 3 : 2}` : ''}`,
            action ? (target_type ? [startDate, action, target_type] : [startDate, action]) : [startDate]
        );
        
        res.json({ 
            success: true, 
            logs: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit)
        });
        
    } catch (error) {
        console.error('Audit log fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

// ============================================================
// ADMIN MANAGEMENT
// ============================================================

/**
 * GET /api/admin/admins
 * Get all admin users
 */
router.get('/admins', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, full_name, email, role, status, created_at
             FROM users
             WHERE role IN ('admin', 'super_admin')
             ORDER BY created_at DESC`
        );
        
        res.json({ success: true, admins: result.rows });
        
    } catch (error) {
        console.error('Fetch admins error:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

/**
 * POST /api/admin/admins
 * Create new admin user
 */
router.post('/admins', async (req, res) => {
    try {
        const { full_name, email, temporary_password } = req.body;
        
        if (!full_name || !email || !temporary_password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        // Check if email already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(temporary_password, 10);
        const userId = require('crypto').randomUUID();
        
        await pool.query(
            `INSERT INTO users (id, full_name, email, password_hash, role, user_type, status, email_verified, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [userId, full_name, email, hashedPassword, 'admin', 'admin', 'active', true]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'admin_created', 'admin', userId, JSON.stringify({ full_name, email })]
        );
        
        res.json({ success: true, message: 'Admin account created successfully', admin_id: userId });
        
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Failed to create admin account' });
    }
});

/**
 * DELETE /api/admin/admins/:adminId
 * Remove admin user
 */
router.delete('/admins/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        
        // Prevent removing yourself
        if (adminId === req.user.userId) {
            return res.status(400).json({ error: 'Cannot remove your own admin account' });
        }
        
        // Update user to remove admin role
        await pool.query(
            `UPDATE users SET role = 'customer', user_type = 'customer' WHERE id = $1`,
            [adminId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'admin_removed', 'admin', adminId, JSON.stringify({ removed_by: req.user.userId })]
        );
        
        res.json({ success: true, message: 'Admin account removed successfully' });
        
    } catch (error) {
        console.error('Remove admin error:', error);
        res.status(500).json({ error: 'Failed to remove admin account' });
    }
});

// ============================================================
// ADMIN PASSWORD CHANGE
// ============================================================

/**
 * POST /api/admin/change-password
 * Change admin password
 */
router.post('/change-password', async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        
        // Get current user
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const bcrypt = require('bcrypt');
        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, req.user.userId]
        );
        
        // Log admin action
        await pool.query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [req.user.userId, 'password_changed', 'admin', req.user.userId, JSON.stringify({ changed_at: new Date() })]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
        
    } catch (error) {
        console.error('Password change error:', error);
        const details = process.env.NODE_ENV === 'production'
            ? undefined
            : (error && error.message ? error.message : String(error));

        res.status(500).json({
            error: 'Failed to change password',
            ...(details ? { details } : {})
        });
    }
});

module.exports = router;

