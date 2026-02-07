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
const { authenticate, requireAdmin, requireAdminRole } = require('../middleware/auth');
const { adminAudit } = require('../middleware/admin-audit');

let pool, eventBroker;

router.setPool = (p) => { pool = p; };
router.setEventBroker = (eb) => { eventBroker = eb; };

const ADMIN_READ_ROLES = [
    'admin',
    'super_admin',
    'finance_admin',
    'trust_safety_admin',
    'support_admin',
    'read_only_admin'
];
const ADMIN_WRITE_ROLES = [
    'admin',
    'super_admin',
    'finance_admin',
    'trust_safety_admin',
    'support_admin'
];
const TRUST_SAFETY_ROLES = ['admin', 'super_admin', 'trust_safety_admin', 'support_admin'];
const FINANCE_ROLES = ['admin', 'super_admin', 'finance_admin'];
const SUPPORT_ROLES = ['admin', 'super_admin', 'support_admin', 'trust_safety_admin'];
const SUPER_ROLES = ['admin', 'super_admin'];

const resolveVendorCredits = async (vendorId) => {
    if (!pool) return null;
    try {
        const columnsResult = await pool.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_credits'`
        );
        const columns = new Set(columnsResult.rows.map(row => row.column_name));
        if (columns.size === 0) return null;

        if (columns.has('available_credits')) {
            const result = await pool.query(
                `SELECT available_credits, total_purchased_credits, total_spent_credits, expires_at
                 FROM vendor_credits WHERE vendor_id = $1`,
                [vendorId]
            );
            return result.rows[0] || null;
        }

        if (columns.has('balance')) {
            const result = await pool.query(
                `SELECT balance, total_purchased, total_spent, total_refunded
                 FROM vendor_credits WHERE vendor_id = $1`,
                [vendorId]
            );
            return result.rows[0] || null;
        }

        return null;
    } catch (error) {
        console.warn('Vendor credits lookup failed:', error.message);
        return null;
    }
};

// Apply admin authentication to all routes
router.use(authenticate);
router.use(requireAdmin);

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
        
        const roleExpression = `CASE
            WHEN role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN role
            ELSE COALESCE(user_type, role)
        END`;

        let query = `
            SELECT 
                id, email, full_name, ${roleExpression} as role, status, phone,
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
            query += ` AND ${roleExpression} = $${paramCount}`;
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
            countQuery += ` AND ${roleExpression} = $${countParamNum}`;
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
 * GET /api/admin/users/:userId/jobs
 * Get job history for a user
 */
router.get('/users/:userId/jobs', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT id, title, status, created_at, updated_at
             FROM jobs
             WHERE customer_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
            [userId]
        );

        res.json({ success: true, jobs: result.rows });
    } catch (error) {
        console.error('User jobs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user jobs' });
    }
});

/**
 * GET /api/admin/users/:userId/messages
 * Read-only message history for a user
 */
router.get('/users/:userId/messages', async (req, res) => {
    try {
        const { userId } = req.params;
        const conversations = await pool.query(
            `SELECT id FROM conversations
             WHERE customer_id = $1 OR vendor_id = $1`,
            [userId]
        );

        const conversationIds = conversations.rows.map(row => row.id);
        if (conversationIds.length === 0) {
            return res.json({ success: true, messages: [] });
        }

        const messagesResult = await pool.query(
            `SELECT m.id, m.conversation_id, m.sender_id, m.sender_role, m.message_type, m.body, m.created_at
             FROM messages m
             WHERE m.conversation_id = ANY($1)
             ORDER BY m.created_at DESC
             LIMIT 200`,
            [conversationIds]
        );

        res.json({ success: true, messages: messagesResult.rows });
    } catch (error) {
        console.error('User messages fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user messages' });
    }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Update user status (suspend, activate, ban)
 */
router.patch(
    '/users/:userId/status',
    requireAdminRole(SUPPORT_ROLES),
    adminAudit({
        action: 'user_status_change',
        targetType: 'user',
        getTargetId: (req) => req.params.userId,
        getDetails: (req) => ({
            status: req.body.status,
            reason: req.body.reason || null
        })
    }),
    async (req, res) => {
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
 * GET /api/admin/vendors
 * Get vendors with filters and pagination
 */
router.get('/vendors', async (req, res) => {
    try {
        const { search = '', status = '', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const roleExpression = `CASE
            WHEN role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN role
            ELSE COALESCE(user_type, role)
        END`;

        let query = `
            SELECT id, email, full_name, status, phone, created_at, metadata
            FROM users
            WHERE ${roleExpression} = 'vendor'
        `;
        const params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (email ILIKE $${paramCount} OR full_name ILIKE $${paramCount} OR id ILIKE $${paramCount})`;
            params.push(`%${search}%`);
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
        res.json({ success: true, vendors: result.rows, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
        console.error('Vendors fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
});

/**
 * GET /api/admin/vendors/:vendorId
 * Get detailed vendor information
 */
router.get('/vendors/:vendorId', async (req, res) => {
    try {
        const { vendorId } = req.params;
        const roleExpression = `CASE
            WHEN role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN role
            ELSE COALESCE(user_type, role)
        END`;

        const vendorResult = await pool.query(
            `SELECT *, ${roleExpression} as role
             FROM users
             WHERE id = $1`,
            [vendorId]
        );

        if (vendorResult.rows.length === 0 || vendorResult.rows[0].role !== 'vendor') {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const credits = await resolveVendorCredits(vendorId);
        const payments = await pool.query(
            `SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0) as total
             FROM payments
             WHERE vendor_id = $1 AND status = 'paid'`,
            [vendorId]
        );

        res.json({
            success: true,
            vendor: vendorResult.rows[0],
            credits,
            revenue: payments.rows[0]
        });
    } catch (error) {
        console.error('Vendor detail fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch vendor details' });
    }
});

/**
 * PATCH /api/admin/vendors/:vendorId/status
 * Update vendor status
 */
router.patch(
    '/vendors/:vendorId/status',
    requireAdminRole(SUPPORT_ROLES),
    adminAudit({
        action: 'vendor_status_change',
        targetType: 'vendor',
        getTargetId: (req) => req.params.vendorId,
        getDetails: (req) => ({ status: req.body.status, reason: req.body.reason || null })
    }),
    async (req, res) => {
        try {
            const { vendorId } = req.params;
            const { status } = req.body;
            const validStatuses = ['active', 'suspended', 'restricted', 'pending', 'rejected'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            await pool.query(
                `UPDATE users SET status = $1, updated_at = NOW()
                 WHERE id = $2`,
                [status, vendorId]
            );

            res.json({ success: true, message: `Vendor ${status}` });
        } catch (error) {
            console.error('Vendor status update error:', error);
            res.status(500).json({ error: 'Failed to update vendor status' });
        }
    }
);

/**
 * POST /api/admin/vendors/:vendorId/reverify
 * Trigger vendor re-verification
 */
router.post(
    '/vendors/:vendorId/reverify',
    requireAdminRole(TRUST_SAFETY_ROLES),
    adminAudit({
        action: 'vendor_reverify_requested',
        targetType: 'vendor',
        getTargetId: (req) => req.params.vendorId,
        getDetails: (req) => ({ reason: req.body.reason || null })
    }),
    async (req, res) => {
        try {
            const { vendorId } = req.params;
            await pool.query(
                `UPDATE users
                 SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{verification_status}', '"pending"'::jsonb, true),
                     updated_at = NOW()
                 WHERE id = $1`,
                [vendorId]
            );

            res.json({ success: true, message: 'Vendor re-verification requested' });
        } catch (error) {
            console.error('Vendor reverify error:', error);
            res.status(500).json({ error: 'Failed to request re-verification' });
        }
    }
);

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
                         WHERE (CASE WHEN u.role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN u.role ELSE COALESCE(u.user_type, u.role) END) = 'vendor'
                             AND u.status = 'pending'
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
router.post(
    '/vendors/:vendorId/approve',
    requireAdminRole(TRUST_SAFETY_ROLES),
    adminAudit({
        action: 'vendor_approved',
        targetType: 'user',
        getTargetId: (req) => req.params.vendorId,
        getDetails: (req) => ({ notes: req.body.notes || null })
    }),
    async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { notes } = req.body;
        
        await pool.query(
            `UPDATE users 
             SET status = 'active', updated_at = NOW()
             WHERE id = $1 AND (CASE WHEN role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN role ELSE COALESCE(user_type, role) END) = 'vendor'`,
            [vendorId]
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
router.post(
    '/vendors/:vendorId/reject',
    requireAdminRole(TRUST_SAFETY_ROLES),
    adminAudit({
        action: 'vendor_rejected',
        targetType: 'user',
        getTargetId: (req) => req.params.vendorId,
        getDetails: (req) => ({ reason: req.body.reason || null })
    }),
    async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { reason } = req.body;
        
        await pool.query(
            `UPDATE users 
             SET status = 'rejected', updated_at = NOW()
             WHERE id = $1 AND (CASE WHEN role IN ('admin', 'super_admin', 'finance_admin', 'trust_safety_admin', 'support_admin', 'read_only_admin') THEN role ELSE COALESCE(user_type, role) END) = 'vendor'`,
            [vendorId]
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
router.patch(
    '/reviews/:reviewId/moderate',
    requireAdminRole(TRUST_SAFETY_ROLES),
    adminAudit({
        action: 'review_moderated',
        targetType: 'review',
        getTargetId: (req) => req.params.reviewId,
        getDetails: (req) => ({
            action: req.body.action,
            reason: req.body.reason || null
        })
    }),
    async (req, res) => {
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
// JOBS & LEADS
// ============================================================

/**
 * GET /api/admin/jobs
 * List jobs with filters
 */
router.get('/jobs', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const params = [];
        let sql = `SELECT id, title, status, trade_category, postcode, created_at
                   FROM jobs`;

        if (status) {
            params.push(status);
            sql += ` WHERE status = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        params.push(parseInt(offset, 10));
        sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(sql, params);
        res.json({ success: true, jobs: result.rows });
    } catch (error) {
        console.error('Admin jobs error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

/**
 * GET /api/admin/leads
 * List leads with job and vendor context
 */
router.get('/leads', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const params = [];
        let sql = `
            SELECT l.id, l.status, l.created_at,
                   j.title AS job_title, j.postcode,
                   u.full_name AS vendor_name
            FROM leads l
            JOIN jobs j ON l.job_id = j.id
            JOIN users u ON l.vendor_id = u.id
        `;

        if (status) {
            params.push(status);
            sql += ` WHERE l.status = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        params.push(parseInt(offset, 10));
        sql += ` ORDER BY l.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(sql, params);
        res.json({ success: true, leads: result.rows });
    } catch (error) {
        console.error('Admin leads error:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// ============================================================
// LEAD PRICING
// ============================================================

router.get('/lead-pricing/tiers', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, tier_name, budget_min, budget_max, base_price, description
             FROM lead_pricing_tiers
             ORDER BY budget_min ASC`
        );
        res.json({ success: true, tiers: result.rows });
    } catch (error) {
        console.error('Lead pricing tiers error:', error);
        res.status(500).json({ error: 'Failed to fetch lead pricing tiers' });
    }
});

router.patch(
    '/lead-pricing/tiers/:tierId',
    requireAdminRole(SUPER_ROLES),
    adminAudit({
        action: 'lead_pricing_tier_updated',
        targetType: 'lead_pricing_tier',
        getTargetId: (req) => req.params.tierId,
        getDetails: (req) => req.body
    }),
    async (req, res) => {
        try {
            const { tierId } = req.params;
            const { base_price, budget_min, budget_max, description } = req.body;
            const result = await pool.query(
                `UPDATE lead_pricing_tiers
                 SET base_price = COALESCE($1, base_price),
                     budget_min = COALESCE($2, budget_min),
                     budget_max = COALESCE($3, budget_max),
                     description = COALESCE($4, description)
                 WHERE id = $5
                 RETURNING *`,
                [base_price, budget_min, budget_max, description, tierId]
            );
            res.json({ success: true, tier: result.rows[0] });
        } catch (error) {
            console.error('Lead pricing tier update error:', error);
            res.status(500).json({ error: 'Failed to update lead pricing tier' });
        }
    }
);

router.get('/lead-pricing/rules', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, category, min_budget, max_budget, base_credit_cost,
                    urgency_multiplier, quality_bonus_min_score, quality_bonus_credit_cost,
                    region, active
             FROM lead_pricing_rules
             ORDER BY id ASC`
        );
        res.json({ success: true, rules: result.rows });
    } catch (error) {
        console.error('Lead pricing rules error:', error);
        res.status(500).json({ error: 'Failed to fetch lead pricing rules' });
    }
});

router.patch(
    '/lead-pricing/rules/:ruleId',
    requireAdminRole(SUPER_ROLES),
    adminAudit({
        action: 'lead_pricing_rule_updated',
        targetType: 'lead_pricing_rule',
        getTargetId: (req) => req.params.ruleId,
        getDetails: (req) => req.body
    }),
    async (req, res) => {
        try {
            const { ruleId } = req.params;
            const {
                base_credit_cost,
                urgency_multiplier,
                quality_bonus_min_score,
                quality_bonus_credit_cost,
                active
            } = req.body;

            const result = await pool.query(
                `UPDATE lead_pricing_rules
                 SET base_credit_cost = COALESCE($1, base_credit_cost),
                     urgency_multiplier = COALESCE($2, urgency_multiplier),
                     quality_bonus_min_score = COALESCE($3, quality_bonus_min_score),
                     quality_bonus_credit_cost = COALESCE($4, quality_bonus_credit_cost),
                     active = COALESCE($5, active),
                     updated_at = NOW()
                 WHERE id = $6
                 RETURNING *`,
                [
                    base_credit_cost,
                    urgency_multiplier,
                    quality_bonus_min_score,
                    quality_bonus_credit_cost,
                    active,
                    ruleId
                ]
            );
            res.json({ success: true, rule: result.rows[0] });
        } catch (error) {
            console.error('Lead pricing rule update error:', error);
            res.status(500).json({ error: 'Failed to update lead pricing rule' });
        }
    }
);

// ============================================================
// PLATFORM SETTINGS
// ============================================================

router.get('/platform/settings', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT key, value, updated_at FROM platform_settings ORDER BY key ASC`
        );
        res.json({ success: true, settings: result.rows });
    } catch (error) {
        console.error('Platform settings fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch platform settings' });
    }
});

router.put(
    '/platform/settings',
    requireAdminRole(SUPER_ROLES),
    adminAudit({
        action: 'platform_settings_updated',
        targetType: 'platform_settings',
        getTargetId: () => 'platform_settings',
        getDetails: (req) => req.body
    }),
    async (req, res) => {
        try {
            const { settings } = req.body;
            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ error: 'Settings object required' });
            }

            const updates = Object.entries(settings);
            for (const [key, value] of updates) {
                await pool.query(
                    `INSERT INTO platform_settings (key, value, updated_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                    [key, JSON.stringify(value)]
                );
            }

            res.json({ success: true, message: 'Platform settings updated' });
        } catch (error) {
            console.error('Platform settings update error:', error);
            res.status(500).json({ error: 'Failed to update platform settings' });
        }
    }
);

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
router.post(
    '/admins',
    requireAdminRole(SUPER_ROLES),
    adminAudit({
        action: 'admin_created',
        targetType: 'admin',
        getTargetId: (req, res) => res.locals.createdAdminId || null,
        getDetails: (req) => ({ full_name: req.body.full_name, email: req.body.email })
    }),
    async (req, res) => {
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
        
        res.locals.createdAdminId = userId;
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
router.delete(
    '/admins/:adminId',
    requireAdminRole(SUPER_ROLES),
    adminAudit({
        action: 'admin_removed',
        targetType: 'admin',
        getTargetId: (req) => req.params.adminId,
        getDetails: (req) => ({ removed_by: req.user.userId })
    }),
    async (req, res) => {
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
router.post(
    '/change-password',
    adminAudit({
        action: 'password_changed',
        targetType: 'admin',
        getTargetId: (req) => req.user.userId,
        getDetails: () => ({ changed_at: new Date().toISOString() })
    }),
    async (req, res) => {
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

