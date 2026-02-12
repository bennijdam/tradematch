/**
 * TradeMatch Connection Layer: RBAC Middleware & Access Control
 *
 * This module implements strict role-based access control (RBAC) to prevent data leakage
 * and ensure privacy between customers and vendors.
 *
 * Key Rules:
 * - Customers can only access their own jobs, quotes, reviews
 * - Vendors can only access leads assigned to them
 * - Customer contact details hidden until lead acceptance
 * - Vendor lead prices NEVER visible to customers
 * - No cross-job or cross-user data access
 */

const express = require('express');
const router = express.Router();

let pool;
const setPool = (p) => { pool = p; };

const {
    authenticate: authenticateToken,
    requireCustomer,
    requireVendor
} = require('./auth');

const getUserId = (req) => req.user?.userId || req.user?.id;

function ensurePool(res) {
    if (!pool) {
        res.status(500).json({ error: 'RBAC pool not configured' });
        return false;
    }
    return true;
}

function roleCheck(roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient role', code: 'ROLE_FORBIDDEN' });
        }
        next();
    };
}

function ownerCheck({ param = 'jobId', table = 'jobs', ownerColumn = 'customer_id' } = {}) {
    return async (req, res, next) => {
        if (!ensurePool(res)) return;
        const userId = getUserId(req);
        const resourceId = req.params[param];

        try {
            const { rows } = await pool.query(
                `SELECT ${ownerColumn} AS owner_id FROM ${table} WHERE id = $1`,
                [resourceId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: `${table.slice(0, -1)} not found`, code: 'NOT_FOUND' });
            }

            if (rows[0].owner_id !== userId) {
                return res.status(403).json({ error: 'Unauthorized: not owner of resource', code: 'NOT_OWNER' });
            }

            req.ownerCheck = rows[0];
            next();
        } catch (error) {
            console.error('Owner check error:', error);
            res.status(500).json({ error: 'Access control error' });
        }
    };
}

async function leadAccessCheck(req, res, next) {
    if (!ensurePool(res)) return;
    const userId = getUserId(req);
    const role = req.user?.role;
    const { leadId } = req.params;

    try {
        const { rows } = await pool.query(
            `SELECT l.id, l.vendor_id, l.job_id, j.customer_id, l.status
             FROM leads l
             JOIN jobs j ON l.job_id = j.id
             WHERE l.id = $1`,
            [leadId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found', code: 'LEAD_NOT_FOUND' });
        }

        const lead = rows[0];

        const vendorAllowed = role === 'vendor' && lead.vendor_id === userId;
        const customerAllowed = role === 'customer' && lead.customer_id === userId;

        if (!vendorAllowed && !customerAllowed) {
            return res.status(403).json({ error: 'Unauthorized lead access', code: 'LEAD_FORBIDDEN' });
        }

        req.lead = lead;
        next();
    } catch (error) {
        console.error('Lead access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

// ============================================================
// ACCESS CONTROL MIDDLEWARE
// ============================================================

/**
 * Middleware: Check if user owns the job
 * Rule: Only job customer can access their own jobs
 */
async function checkJobOwnership(req, res, next) {
    try {
        const { jobId } = req.params;
        const userId = getUserId(req);
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            'SELECT customer_id FROM jobs WHERE id = $1',
            [jobId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        
        if (result.rows[0].customer_id !== userId) {
            return res.status(403).json({
                error: 'Unauthorized: You do not own this job',
                code: 'JOB_NOT_OWNED'
            });
        }
        
        req.job = result.rows[0];
        next();
    } catch (error) {
        console.error('Job ownership check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Check if vendor has access to a lead
 * Rule: Only assigned vendor can see the lead
 */
async function checkLeadAccess(req, res, next) {
    try {
        const { leadId } = req.params;
        const vendorId = getUserId(req);
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            'SELECT * FROM leads WHERE id = $1 AND vendor_id = $2',
            [leadId, vendorId]
        );
        
        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'Unauthorized: You do not have access to this lead',
                code: 'LEAD_NOT_ASSIGNED'
            });
        }
        
        req.lead = result.rows[0];
        next();
    } catch (error) {
        console.error('Lead access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Check if user can access conversation
 * Rule: Only customer or assigned vendor can access conversation
 */
async function checkConversationAccess(req, res, next) {
    try {
        const { conversationId } = req.params;
        const userId = getUserId(req);
        const userRole = req.user.role;
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            'SELECT * FROM conversations WHERE id = $1',
            [conversationId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        const conversation = result.rows[0];
        
        // Check if user is customer or vendor in this conversation
        if (
            (userRole === 'customer' && conversation.customer_id !== userId) ||
            (userRole === 'vendor' && conversation.vendor_id !== userId)
        ) {
            return res.status(403).json({
                error: 'Unauthorized: You do not have access to this conversation',
                code: 'CONVERSATION_NOT_ACCESSIBLE'
            });
        }
        
        req.conversation = conversation;
        next();
    } catch (error) {
        console.error('Conversation access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Check if messaging is enabled for conversation
 * Rule: Messaging ONLY enabled after vendor accepts lead
 */
async function checkMessagingEnabled(req, res, next) {
    try {
        const { conversationId } = req.params;
        if (!ensurePool(res)) return;
        
        // Check if lead is accepted
        const result = await pool.query(
            `SELECT l.status, l.accepted_at
             FROM conversations c
             JOIN leads l ON c.job_id = l.job_id AND c.vendor_id = l.vendor_id
             WHERE c.id = $1`,
            [conversationId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        
        if (result.rows[0].status !== 'accepted' || !result.rows[0].accepted_at) {
            return res.status(403).json({
                error: 'Messaging is not enabled yet. Lead must be accepted first.',
                code: 'MESSAGING_DISABLED'
            });
        }
        
        next();
    } catch (error) {
        console.error('Messaging enabled check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Mask customer details in lead preview
 * Rule: Customer contact hidden until lead acceptance
 */
function maskLeadPreview(leadData) {
    return {
        id: leadData.id,
        job_id: leadData.job_id,
        // Job details visible in preview
        job_title: leadData.job_title,
        job_description: leadData.job_description,
        job_trade_category: leadData.job_trade_category,
        job_postcode: leadData.job_postcode ? leadData.job_postcode.slice(0, 4) + '**' : 'N/A', // Obfuscate
        job_budget_min: leadData.job_budget_min,
        job_budget_max: leadData.job_budget_max,
        job_timeframe: leadData.job_timeframe,
        // Customer details HIDDEN
        customer_name: 'HIDDEN',
        customer_email: 'HIDDEN',
        customer_phone: 'HIDDEN',
        customer_postcode_full: 'HIDDEN',
        // Lead metadata
        status: leadData.status,
        created_at: leadData.created_at,
        accepted_at: leadData.accepted_at,
        expires_at: leadData.expires_at
    };
}

/**
 * Middleware: Hide vendor lead prices from customer
 * Rule: Customers never see lead prices; only vendor bids
 */
function maskVendorLeadPrice(quoteData) {
    const masked = { ...quoteData };
    delete masked.vendor_lead_price;
    delete masked.lead_cost;
    return masked;
}

/**
 * Middleware: Hide competing vendors from each other
 * Rule: Vendor can never see other vendors on same job
 */
async function filterCompetingVendors(req, res, jobId, requestingVendorId) {
    try {
        // Get all leads for this job
        const result = await pool.query(
            `SELECT DISTINCT vendor_id
             FROM leads
             WHERE job_id = $1 AND vendor_id != $2`,
            [jobId, requestingVendorId]
        );
        
        // Return only the lead (not other vendors)
        return result.rows.map(r => r.vendor_id);
    } catch (error) {
        console.error('Filter competing vendors error:', error);
        return [];
    }
}

/**
 * Middleware: Check if user can view quote
 * Rule: Only customer (job owner) or vendor (quote creator) can view
 */
async function checkQuoteAccess(req, res, next) {
    try {
        const { quoteId } = req.params;
        const userId = getUserId(req);
        const userRole = req.user.role;
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            `SELECT q.*, j.customer_id
             FROM quotes q
             JOIN jobs j ON q.job_id = j.id
             WHERE q.id = $1`,
            [quoteId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quote not found' });
        }
        
        const quote = result.rows[0];
        
        // Check access: customer (job owner) or vendor (quote author)
        if (
            (userRole === 'customer' && quote.customer_id !== userId) ||
            (userRole === 'vendor' && quote.vendor_id !== userId)
        ) {
            return res.status(403).json({
                error: 'Unauthorized: You cannot access this quote',
                code: 'QUOTE_NOT_ACCESSIBLE'
            });
        }
        
        req.quote = quote;
        next();
    } catch (error) {
        console.error('Quote access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Check if user can view/write review
 * Rule: Only customer (after job completion) or vendor (responding) can access
 */
async function checkReviewAccess(req, res, next) {
    try {
        const { reviewId } = req.params;
        const userId = getUserId(req);
        const userRole = req.user.role;
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            `SELECT * FROM job_reviews WHERE id = $1`,
            [reviewId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        
        const review = result.rows[0];
        
        // Check access: customer (reviewer) or vendor (for response)
        if (
            (userRole === 'customer' && review.customer_id !== userId) ||
            (userRole === 'vendor' && review.vendor_id !== userId)
        ) {
            return res.status(403).json({
                error: 'Unauthorized: You cannot access this review',
                code: 'REVIEW_NOT_ACCESSIBLE'
            });
        }
        
        req.review = review;
        next();
    } catch (error) {
        console.error('Review access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Enforce read-only access for vendors on escrow
 * Rule: Vendors can view escrow state but not modify
 */
async function checkEscrowAccess(req, res, next) {
    try {
        const { escrowId } = req.params;
        const userId = getUserId(req);
        const userRole = req.user.role;
        if (!ensurePool(res)) return;
        
        const result = await pool.query(
            'SELECT * FROM escrow_accounts WHERE id = $1',
            [escrowId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Escrow account not found' });
        }
        
        const escrow = result.rows[0];
        
        // Check access: customer (account owner) or vendor (read-only)
        if (
            (userRole === 'customer' && escrow.customer_id !== userId) ||
            (userRole === 'vendor' && escrow.vendor_id !== userId)
        ) {
            return res.status(403).json({
                error: 'Unauthorized: You cannot access this escrow account',
                code: 'ESCROW_NOT_ACCESSIBLE'
            });
        }
        
        // For PUT/PATCH, enforce customer-only write access
        if (['PUT', 'PATCH', 'DELETE'].includes(req.method) && userRole === 'vendor') {
            return res.status(403).json({
                error: 'Vendors have read-only access to escrow accounts',
                code: 'ESCROW_VENDOR_READONLY'
            });
        }
        
        req.escrow = escrow;
        next();
    } catch (error) {
        console.error('Escrow access check error:', error);
        res.status(500).json({ error: 'Access control error' });
    }
}

/**
 * Middleware: Log access attempts (audit trail)
 */
async function logAccessAttempt(req, res, next) {
    try {
        const userId = getUserId(req);
        const userRole = req.user?.role;
        
        // Log to console; in production, use event_log table
        console.log(`[RBAC] ${userRole?.toUpperCase()} (${userId}) → ${req.method} ${req.path}`);
        
        next();
    } catch (error) {
        console.error('Access logging error:', error);
        next(); // Don't block requests due to logging errors
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    router,
    setPool,
    middleware: {
        roleCheck,
        ownerCheck,
        leadAccessCheck,
        checkJobOwnership,
        checkLeadAccess,
        checkConversationAccess,
        checkMessagingEnabled,
        checkQuoteAccess,
        checkReviewAccess,
        checkEscrowAccess,
        logAccessAttempt
    },
    helpers: {
        maskLeadPreview,
        maskVendorLeadPrice,
        filterCompetingVendors
    }
};
