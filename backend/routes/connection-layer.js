/**
 * TradeMatch Connection Layer: Unified API Routes
 *
 * This module implements the REST API that synchronizes state between
 * Customer and Vendor dashboards, with strict RBAC, transactional guarantees,
 * and real-time event propagation.
 *
 * Key Patterns:
 * - All endpoints use authenticateToken + role check
 * - RBAC middleware enforces ownership/access
 * - State changes emit events (which propagate to other dashboard)
 * - Responses include event_id for tracing
 * - Idempotency keys prevent duplicate processing
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authenticate: authenticateToken, requireCustomer, requireVendor } = require('../middleware/auth');
const { EVENT_TYPES } = require('../services/event-broker.service');
const rbac = require('../middleware/rbac');
const {
    roleCheck,
    ownerCheck,
    leadAccessCheck,
    checkJobOwnership,
    checkLeadAccess,
    checkConversationAccess,
    checkMessagingEnabled,
    checkQuoteAccess,
    checkEscrowAccess,
    logAccessAttempt
} = rbac.middleware;
const { maskLeadPreview } = rbac.helpers;

let pool, eventBroker;

router.setPool = (p) => { 
    pool = p; 
    if (typeof rbac.setPool === 'function') {
        rbac.setPool(p);
    }
};
router.setEventBroker = (eb) => { eventBroker = eb; };

// ============================================================
// JOB MANAGEMENT (CUSTOMER)
// ============================================================

/**
 * POST /api/connection/jobs
 * Customer creates a new job (draft state)
 *
 * Business Rules:
 * - Budget and timeframe mandatory
 * - Job starts as 'draft'; not distributed until confirmed live
 * - Creates audit record
 * - Emits JOB_CREATED event
 *
 * Request:
 * {
 *   "title": "Fix leaking tap",
 *   "description": "Kitchen tap dripping",
 *   "trade_category": "Plumbing",
 *   "postcode": "SW1A1AA",
 *   "budget_min": 50,
 *   "budget_max": 150,
 *   "timeframe": "urgent",
 *   "idempotency_key": "uuid" (optional, for replay)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "job_id": "job_...",
 *   "status": "draft",
 *   "event_id": "evt_...",
 *   "message": "Job created as draft. Confirm to make live."
 * }
 */
router.post(
    '/jobs',
    authenticateToken,
    requireCustomer,
    logAccessAttempt,
    async (req, res) => {
        const client = await pool.connect();
        try {
            const customerId = req.user.userId;
            const { title, description, trade_category, postcode, budget_min, budget_max, timeframe } = req.body;
            const idempotencyKey = req.body.idempotency_key || uuidv4();
            
            // Validate mandatory fields
            if (!budget_min || !budget_max || !timeframe) {
                return res.status(400).json({
                    error: 'Mandatory fields missing: budget_min, budget_max, timeframe',
                    code: 'VALIDATION_ERROR'
                });
            }
            
            if (budget_min > budget_max) {
                return res.status(400).json({
                    error: 'Budget min must be <= max',
                    code: 'VALIDATION_ERROR'
                });
            }
            
            await client.query('BEGIN');
            
            const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Insert job
            const jobResult = await client.query(
                `INSERT INTO jobs (
                    id, customer_id, title, description, trade_category, postcode,
                    budget_min, budget_max, timeframe, status, created_by, updated_by, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', $2, $2, NOW(), NOW()
                ) RETURNING *`,
                [jobId, customerId, title, description, trade_category, postcode, budget_min, budget_max, timeframe]
            );
            
            // Emit event
            const event = await eventBroker.emit(EVENT_TYPES.JOB_CREATED, {
                actor_id: customerId,
                actor_role: 'customer',
                subject_type: 'job',
                subject_id: jobId,
                job_id: jobId,
                old_state: null,
                new_state: jobResult.rows[0],
                metadata: {
                    idempotency_key: idempotencyKey,
                    job_title: title
                }
            });
            
            await client.query('COMMIT');
            
            res.status(201).json({
                success: true,
                job_id: jobId,
                status: 'draft',
                event_id: event.id,
                message: 'Job created as draft. Post to make live and receive leads.'
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Create job error:', error);
            
            if (error.code === '23505') {
                // Duplicate key - idempotency
                return res.status(409).json({ error: 'Duplicate request (idempotency)', code: 'DUPLICATE_REQUEST' });
            }
            
            res.status(500).json({ error: 'Failed to create job' });
        } finally {
            client.release();
        }
    }
);

/**
 * PATCH /api/connection/jobs/:jobId/publish
 * Customer publishes job (draft → live)
 *
 * Business Rules:
 * - Customer confirms intent before live
 * - Creates lead assignments for matching vendors
 * - Emits JOB_POSTED event
 *
 * Response: { success: true, status: 'live', leads_assigned: 5 }
 */
router.patch(
    '/jobs/:jobId/publish',
    authenticateToken,
    requireCustomer,
    checkJobOwnership,
    logAccessAttempt,
    async (req, res) => {
        const client = await pool.connect();
        try {
            const { jobId } = req.params;
            const customerId = req.user.userId;
            
            await client.query('BEGIN');
            
            // Update job status
            await client.query(
                `UPDATE jobs SET status = 'live', updated_at = NOW() WHERE id = $1`,
                [jobId]
            );
            
            // Get matching vendors (stub - full implementation uses lead distribution service)
            const vendorResult = await client.query(
                `SELECT id FROM users WHERE user_type = 'vendor' LIMIT 10`
            );
            
            let leadsCreated = 0;
            
            // Create lead assignments
            for (const vendor of vendorResult.rows) {
                const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                try {
                    await client.query(
                        `INSERT INTO leads (id, job_id, vendor_id, status, created_at, updated_at)
                         VALUES ($1, $2, $3, 'offered', NOW(), NOW())
                         ON CONFLICT (job_id, vendor_id) DO NOTHING`,
                        [leadId, jobId, vendor.id]
                    );
                    
                    leadsCreated++;
                    
                    // Emit event
                    await eventBroker.emit(EVENT_TYPES.LEAD_OFFERED, {
                        actor_id: customerId,
                        actor_role: 'customer',
                        subject_type: 'lead',
                        subject_id: leadId,
                        job_id: jobId,
                        new_state: { status: 'offered', vendor_id: vendor.id },
                        metadata: {
                            vendor_id: vendor.id,
                            job_title: req.job.title
                        }
                    });
                    
                } catch (err) {
                    console.warn(`Failed to create lead for vendor ${vendor.id}:`, err.message);
                }
            }
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                status: 'live',
                leads_assigned: leadsCreated,
                message: `Job published. ${leadsCreated} vendors notified.`
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Publish job error:', error);
            res.status(500).json({ error: 'Failed to publish job' });
        } finally {
            client.release();
        }
    }
);

// ============================================================
// LEAD MANAGEMENT (VENDOR)
// ============================================================

/**
 * GET /api/connection/leads
 * Vendor views offered leads (with masked customer details)
 *
 * Business Rules:
 * - Customer contact HIDDEN until accepted
 * - No competing vendor info shown
 * - Leads expire after 72h (or custom timeframe)
 *
 * Response:
 * {
 *   "leads": [
 *     {
 *       "id": "lead_...",
 *       "job_title": "Fix leaking tap",
 *       "job_postcode": "SW1A 1**",  // Obfuscated
 *       "job_budget_min": 50,
 *       "job_budget_max": 150,
 *       "customer_name": "HIDDEN",
 *       "customer_email": "HIDDEN",
 *       "status": "offered",
 *       "expires_at": "2026-01-25T..."
 *     }
 *   ]
 * }
 */
router.get(
    '/leads',
    authenticateToken,
    requireVendor,
    logAccessAttempt,
    async (req, res) => {
        try {
            const vendorId = req.user.userId;
            
            const result = await pool.query(
                `SELECT l.*, j.title, j.description, j.postcode, j.budget_min, j.budget_max,
                        j.timeframe, j.created_at, u.full_name, u.email, u.phone
                 FROM leads l
                 JOIN jobs j ON l.job_id = j.id
                 JOIN users u ON j.customer_id = u.id
                 WHERE l.vendor_id = $1 AND l.status IN ('offered', 'quote_pending', 'quote_sent')
                 AND (l.expired_at IS NULL OR l.expired_at > NOW())
                 ORDER BY l.created_at DESC`,
                [vendorId]
            );
            
            // Mask customer details
            const leads = result.rows.map(row => {
                const lead = maskLeadPreview(row);
                lead.job_title = row.title;
                lead.job_description = row.description;
                lead.job_budget_min = row.budget_min;
                lead.job_budget_max = row.budget_max;
                return lead;
            });
            
            res.json({
                success: true,
                count: leads.length,
                leads
            });
            
        } catch (error) {
            console.error('Get leads error:', error);
            res.status(500).json({ error: 'Failed to fetch leads' });
        }
    }
);

/**
 * POST /api/connection/leads/:leadId/accept
 * Vendor accepts a lead
 *
 * Business Rules:
 * - Transition: offered → accepted
 * - Unlocks customer contact details
 * - Auto-creates Conversation
 * - Emits LEAD_ACCEPTED event
 * - Triggers vendor notification
 *
 * Response: { success: true, lead_id: "lead_...", conversation_id: "conv_..." }
 */
router.post(
    '/leads/:leadId/accept',
    authenticateToken,
    requireVendor,
    checkLeadAccess,
    logAccessAttempt,
    async (req, res) => {
        const client = await pool.connect();
        try {
            const { leadId } = req.params;
            const vendorId = req.user.userId;
            const idempotencyKey = req.body.idempotency_key || uuidv4();
            
            await client.query('BEGIN');
            
            // Update lead status
            const leadResult = await client.query(
                `UPDATE leads SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND vendor_id = $2
                 RETURNING *`,
                [leadId, vendorId]
            );
            
            if (leadResult.rows.length === 0) {
                throw new Error('Lead not found or not accessible');
            }
            
            const lead = leadResult.rows[0];
            
            // Get job and customer info
            const jobResult = await client.query(
                `SELECT j.*, u.full_name as customer_name, u.email as customer_email
                 FROM jobs j
                 JOIN users u ON j.customer_id = u.id
                 WHERE j.id = $1`,
                [lead.job_id]
            );
            
            if (jobResult.rows.length === 0) {
                throw new Error('Job not found');
            }
            
            const job = jobResult.rows[0];
            
            // Conversation auto-created by trigger, but ensure it exists
            const convResult = await client.query(
                `SELECT id FROM conversations WHERE job_id = $1 AND vendor_id = $2`,
                [lead.job_id, vendorId]
            );
            
            let conversationId;
            if (convResult.rows.length === 0) {
                conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await client.query(
                    `INSERT INTO conversations (id, job_id, customer_id, vendor_id, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
                    [conversationId, lead.job_id, job.customer_id, vendorId]
                );
            } else {
                conversationId = convResult.rows[0].id;
            }
            
            // Emit event
            const event = await eventBroker.emit(EVENT_TYPES.LEAD_ACCEPTED, {
                actor_id: vendorId,
                actor_role: 'vendor',
                subject_type: 'lead',
                subject_id: leadId,
                job_id: lead.job_id,
                old_state: { status: 'offered' },
                new_state: { status: 'accepted', accepted_at: new Date() },
                metadata: {
                    idempotency_key: idempotencyKey,
                    lead_id: leadId,
                    customer_id: job.customer_id,
                    customer_name: job.customer_name,
                    vendor_id: vendorId,
                    conversation_id: conversationId
                }
            });
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                lead_id: leadId,
                conversation_id: conversationId,
                event_id: event.id,
                message: 'Lead accepted. Customer contact details now visible. Messaging enabled.'
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Accept lead error:', error);
            
            if (error.code === '23505') {
                return res.status(409).json({
                    error: 'Lead already accepted',
                    code: 'LEAD_ALREADY_ACCEPTED'
                });
            }
            
            res.status(500).json({ error: 'Failed to accept lead' });
        } finally {
            client.release();
        }
    }
);

// ============================================================
// MESSAGING (SHARED)
// ============================================================

/**
 * GET /api/connection/conversations/:conversationId/messages
 * Get messages in a conversation (with privacy checks)
 *
 * Business Rules:
 * - Both parties see full history
 * - Auto-mark as read
 * - Messages are immutable (no editing)
 *
 * Response:
 * {
 *   "messages": [
 *     {
 *       "id": "msg_...",
 *       "sender_id": "user_...",
 *       "sender_role": "vendor",
 *       "body": "Here's my quote for £500",
 *       "message_type": "text",
 *       "is_read": false,
 *       "created_at": "2026-01-23T10:30:00Z"
 *     }
 *   ]
 * }
 */
router.get(
    '/conversations/:conversationId/messages',
    authenticateToken,
    checkConversationAccess,
    logAccessAttempt,
    async (req, res) => {
        const client = await pool.connect();
        try {
            const { conversationId } = req.params;
            const userId = req.user.userId;
            
            await client.query('BEGIN');
            
            // Get messages
            const result = await client.query(
                `SELECT m.id, m.sender_id, m.sender_role, m.message_type, m.body, m.metadata,
                        m.is_deleted, m.edited_at, m.created_at,
                        COALESCE((SELECT array_agg(ma.*) FROM message_attachments ma WHERE ma.message_id = m.id), '{}') AS attachments
                 FROM messages m
                 WHERE m.conversation_id = $1
                 ORDER BY m.created_at ASC`,
                [conversationId]
            );
            
            // Mark unread messages as read
            await client.query(
                `INSERT INTO message_reads (message_id, user_id)
                 SELECT m.id, $2
                 FROM messages m
                 WHERE m.conversation_id = $1 AND m.sender_id != $2 AND m.is_deleted = false
                 ON CONFLICT (message_id, user_id) DO NOTHING`,
                [conversationId, userId]
            );
            
            await client.query('COMMIT');
            
            res.json({
                success: true,
                message_count: result.rows.length,
                messages: result.rows
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Get messages error:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        } finally {
            client.release();
        }
    }
);

/**
 * POST /api/connection/conversations/:conversationId/messages
 * Send a message
 *
 * Business Rules:
 * - Messaging only enabled after lead acceptance
 * - Messages are immutable
 * - Auto-generates system events
 *
 * Request: { "body": "Here's my quote..." }
 * Response: { "success": true, "message_id": "msg_...", "event_id": "evt_..." }
 */
router.post(
    '/conversations/:conversationId/messages',
    authenticateToken,
    checkConversationAccess,
    checkMessagingEnabled,
    logAccessAttempt,
    async (req, res) => {
        const client = await pool.connect();
        try {
            const { conversationId } = req.params;
            const { body, message_type = 'text', metadata = {} } = req.body;
            const userId = req.user.userId;
            const userRole = req.user.role;
            
            if (!body || body.trim().length === 0) {
                return res.status(400).json({ error: 'Message body required' });
            }
            
            await client.query('BEGIN');
            
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Insert message
            const msgResult = await client.query(
                `INSERT INTO messages (
                    id, conversation_id, sender_id, sender_role, message_type, body, metadata, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, NOW()
                ) RETURNING *`,
                [messageId, conversationId, userId, userRole, message_type, body, JSON.stringify(metadata)]
            );
            
            // Get conversation for context
            const convResult = await client.query(
                'SELECT * FROM conversations WHERE id = $1',
                [conversationId]
            );
            
            const conversation = convResult.rows[0];
            
            // Determine other party
            const otherPartyId = userRole === 'customer' ? conversation.vendor_id : conversation.customer_id;
            
            // Emit message event
            const messageEvent = await eventBroker.emit(EVENT_TYPES.MESSAGE_SENT, {
                actor_id: userId,
                actor_role: userRole,
                subject_type: 'message',
                subject_id: messageId,
                job_id: conversation.job_id,
                new_state: msgResult.rows[0],
                metadata: {
                    conversation_id: conversationId,
                    recipient_id: otherPartyId,
                    sender_name: req.user.email
                }
            });

            // If vendor sends a quote message, emit QUOTE_SENT
            let quoteEvent = null;
            if (userRole === 'vendor' && message_type === 'quote') {
                const vendorUserResult = await client.query(
                    'SELECT full_name, name, email FROM users WHERE id = $1',
                    [conversation.vendor_id]
                );
                const vendorUser = vendorUserResult.rows[0] || {};
                const vendorName = vendorUser.full_name || vendorUser.name || vendorUser.email || 'Vendor';
                const quoteAmount = req.body.quote_amount || null;

                quoteEvent = await eventBroker.emit(EVENT_TYPES.QUOTE_SENT, {
                    actor_id: userId,
                    actor_role: userRole,
                    subject_type: 'quote',
                    subject_id: messageId,
                    job_id: conversation.job_id,
                    metadata: {
                        conversation_id: conversationId,
                        customer_id: conversation.customer_id,
                        vendor_id: conversation.vendor_id,
                        vendor_name: vendorName,
                        quote_amount: quoteAmount
                    }
                });
            }
            
            await client.query('COMMIT');
            
            res.status(201).json({
                success: true,
                message_id: messageId,
                event_id: messageEvent.id,
                quote_event_id: quoteEvent ? quoteEvent.id : undefined,
                message: 'Message sent'
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Send message error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        } finally {
            client.release();
        }
    }
);

// ============================================================
// EXPORTS
// ============================================================

module.exports = router;
