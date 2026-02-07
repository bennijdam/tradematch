const express = require('express');
const crypto = require('crypto');
const { authenticate, requireAdmin, requireSuperAdmin, requireFinanceAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;

router.setPool = (p) => { pool = p; };

const MESSAGE_TYPES = new Set([
    'text',
    'image',
    'document',
    'quote_card',
    'system',
    'contract_card',
    'milestone_card',
    'payment_event',
    'system_alert'
]);

const CONVERSATION_TYPES = new Set([
    'job',
    'pre_quote',
    'post_award',
    'dispute',
    'system'
]);

const CONTACT_PLACEHOLDER = '[Contact details hidden for safety]';

const CONTACT_PATTERNS = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    /\b(?:https?:\/\/|www\.)\S+/gi,
    /\b(?:wa\.me|whatsapp)\b\S*/gi,
    /\+?\d[\d\s().-]{7,}\d/gi
];

const sanitizeContactDetails = (body) => {
    if (!body) return body;
    let sanitized = body;
    for (const pattern of CONTACT_PATTERNS) {
        sanitized = sanitized.replace(pattern, CONTACT_PLACEHOLDER);
    }
    return sanitized;
};

const canSeeContactDetails = (conversation) => {
    if (!conversation) return false;
    if (conversation.contact_allowed) return true;
    if (conversation.conversation_type === 'post_award') return true;
    if (conversation.conversation_type === 'dispute') return true;
    return false;
};

const userIsParticipant = async (conversationId, userId) => {
    const result = await pool.query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
    );
    return result.rows.length > 0;
};

const ensureParticipant = async (conversationId, userId, role) => {
    const participantId = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
        `INSERT INTO conversation_participants (id, conversation_id, user_id, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [participantId, conversationId, userId, role]
    );
};

const ensureConversationAccess = async (conversationId, user) => {
    if (['admin', 'super_admin', 'finance_admin'].includes(user.role)) {
        return true;
    }
    return userIsParticipant(conversationId, user.userId);
};

const addSystemEvent = async (conversationId, eventType, actorId, metadata = {}) => {
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
        `INSERT INTO system_events (id, conversation_id, event_type, actor_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, conversationId, eventType, actorId, JSON.stringify(metadata)]
    );
    return eventId;
};

const addSystemMessage = async (client, conversationId, body, metadata = {}, actorId = null) => {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const db = client || pool;
    await db.query(
        `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
         VALUES ($1, $2, $3, 'system', 'system_alert', $4, $5)`,
        [messageId, conversationId, actorId, body, JSON.stringify(metadata)]
    );

    await db.query(
        `UPDATE conversations
         SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [messageId, conversationId]
    );

    return messageId;
};

const addNotification = async ({ userId, type, title, body, metadata }) => {
    const notificationId = `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
        `INSERT INTO user_notifications (id, user_id, notification_type, title, body, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [notificationId, userId, type, title, body, JSON.stringify(metadata || {})]
    );
    return notificationId;
};

const ensureConversationArchivesTable = async () => {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS conversation_archives (
            id VARCHAR(80) PRIMARY KEY,
            conversation_id VARCHAR(60) NOT NULL,
            user_id VARCHAR(60) NOT NULL,
            archived_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
    );
    await pool.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_archives_unique
         ON conversation_archives(conversation_id, user_id)`
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_conversation_archives_user
         ON conversation_archives(user_id)`
    );
};

const ensureConversationReportsTable = async () => {
    await pool.query(
        `CREATE TABLE IF NOT EXISTS conversation_reports (
            id VARCHAR(80) PRIMARY KEY,
            conversation_id VARCHAR(60) NOT NULL,
            user_id VARCHAR(60) NOT NULL,
            reason VARCHAR(40) NOT NULL,
            details TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'open',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`
    );
    await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_conversation_reports_conversation
         ON conversation_reports(conversation_id)`
    );
};

const maskPostcodeDistrict = (postcode) => {
    if (!postcode) return null;
    const trimmed = String(postcode).trim();
    if (!trimmed) return null;
    return trimmed.split(/\s+/)[0].toUpperCase();
};

// ============================================================
// Conversations
// ============================================================

router.get('/conversations', authenticate, async (req, res) => {
    try {
        const { status, type, search, limit = 25, offset = 0 } = req.query;
        const userId = req.user.userId;
        const isAdmin = ['admin', 'super_admin', 'finance_admin'].includes(req.user.role);

        const filters = [];
        const params = [userId];

        if (!isAdmin) {
            params.push(userId);
            filters.push(`cp.user_id = $${params.length}`);
        }

        if (status) {
            params.push(status);
            filters.push(`c.status = $${params.length}`);
        }

        if (type) {
            params.push(type);
            filters.push(`c.conversation_type = $${params.length}`);
        }

        if (search) {
            params.push(`%${search}%`);
            filters.push(`(c.job_id ILIKE $${params.length} OR c.customer_id ILIKE $${params.length} OR c.vendor_id ILIKE $${params.length})`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        params.push(limit);
        params.push(offset);

        await ensureConversationArchivesTable();

        const result = await pool.query(
            `SELECT c.*,
                    q.title AS job_title,
                    q.status AS job_status,
                    q.postcode AS job_postcode,
                    q.budget_min,
                    q.budget_max,
                    cp.notification_pref,
                    cp.muted_until,
                    CASE WHEN ca.conversation_id IS NULL THEN false ELSE true END AS is_archived,
                    COALESCE((SELECT COUNT(*) FROM messages m
                        WHERE m.conversation_id = c.id
                          AND m.is_deleted = false
                          AND m.sender_id != $1
                          AND NOT EXISTS (
                              SELECT 1 FROM message_reads mr
                              WHERE mr.message_id = m.id AND mr.user_id = $1
                          )), 0) AS unread_count
             FROM conversations c
             LEFT JOIN quotes q ON q.id = c.job_id
             LEFT JOIN conversation_participants cp
                ON c.id = cp.conversation_id AND cp.user_id = $1
             LEFT JOIN conversation_archives ca
                ON c.id = ca.conversation_id AND ca.user_id = $1
             ${whereClause}
             ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({ success: true, conversations: result.rows });
    } catch (error) {
        console.error('Fetch conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

router.post('/conversations', authenticate, async (req, res) => {
    try {
        const { job_id, customer_id, vendor_id, conversation_type = 'job' } = req.body;
        if (!job_id || !customer_id || !vendor_id) {
            return res.status(400).json({ error: 'job_id, customer_id, vendor_id required' });
        }

        if (!CONVERSATION_TYPES.has(conversation_type)) {
            return res.status(400).json({ error: 'Invalid conversation_type' });
        }

        if (conversation_type === 'system' && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'System conversations require admin' });
        }

        const convoId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
            `INSERT INTO conversations (id, job_id, customer_id, vendor_id, conversation_type, status, contact_allowed, is_system, is_locked)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (job_id, customer_id, vendor_id, conversation_type) DO NOTHING`,
            [
                convoId,
                job_id,
                customer_id,
                vendor_id,
                conversation_type,
                conversation_type === 'system' ? 'locked' : 'open',
                conversation_type === 'post_award',
                conversation_type === 'system',
                conversation_type === 'system'
            ]
        );

        const convoResult = await pool.query(
            `SELECT * FROM conversations WHERE job_id = $1 AND customer_id = $2 AND vendor_id = $3 AND conversation_type = $4`,
            [job_id, customer_id, vendor_id, conversation_type]
        );

        const convo = convoResult.rows[0];
        await ensureParticipant(convo.id, customer_id, 'customer');
        await ensureParticipant(convo.id, vendor_id, 'vendor');

        res.status(201).json({ success: true, conversation: convo });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

router.get('/conversations/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        res.json({ success: true, conversation: result.rows[0] });
    } catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

// ============================================================
// Messages
// ============================================================

router.get('/conversations/:conversationId/messages', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        const userId = req.user.userId;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const result = await pool.query(
            `SELECT m.*,
                    COALESCE((SELECT array_agg(ma.*) FROM message_attachments ma WHERE ma.message_id = m.id), '{}') AS attachments
             FROM messages m
             WHERE m.conversation_id = $1
             ORDER BY m.created_at ASC
             LIMIT $2 OFFSET $3`,
            [conversationId, limit, offset]
        );

        await pool.query(
            `INSERT INTO message_reads (id, message_id, user_id)
             SELECT CONCAT('mr_', md5(m.id || ':' || $2::varchar)), m.id, $2::varchar
             FROM messages m
             WHERE m.conversation_id = $1 AND m.sender_id != $2::varchar AND m.is_deleted = false
             ON CONFLICT (message_id, user_id) DO NOTHING`,
            [conversationId, userId]
        );

        res.json({ success: true, messages: result.rows });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

router.post('/conversations/:conversationId/messages', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { conversationId } = req.params;
        const { body, message_type = 'text', attachments = [], reply_to_message_id } = req.body;
        const userId = req.user.userId;
        const role = req.user.role;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (!MESSAGE_TYPES.has(message_type)) {
            return res.status(400).json({ error: 'Invalid message_type' });
        }

        const convResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });

        const conversation = convResult.rows[0];
        if (conversation.is_locked || ['archived', 'locked'].includes(conversation.status)) {
            if (!['admin', 'super_admin'].includes(role)) {
                return res.status(423).json({ error: 'Conversation is locked' });
            }
        }

        const userStatusResult = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
        if (userStatusResult.rows.length && userStatusResult.rows[0].status !== 'active') {
            return res.status(403).json({ error: 'Account inactive' });
        }

        let sanitizedBody = body || null;
        if (!canSeeContactDetails(conversation)) {
            sanitizedBody = sanitizeContactDetails(sanitizedBody);
        }

        const contactAttempted = !canSeeContactDetails(conversation)
            && typeof body === 'string'
            && sanitizedBody !== body;

        if (message_type === 'text' && (!sanitizedBody || sanitizedBody.trim().length === 0)) {
            return res.status(400).json({ error: 'Message body required' });
        }

        if (message_type === 'payment_event' && (!sanitizedBody || sanitizedBody.trim().length === 0)) {
            return res.status(400).json({ error: 'Payment event label required' });
        }

        if (message_type === 'contract_card') {
            const contractId = req.body?.metadata?.contract_id || req.body?.contract?.id;
            if (!contractId) return res.status(400).json({ error: 'contract_id required for contract_card' });
        }

        if (message_type === 'milestone_card') {
            const milestoneId = req.body?.metadata?.milestone_id || req.body?.milestone?.id;
            if (!milestoneId) return res.status(400).json({ error: 'milestone_id required for milestone_card' });
        }

        if (message_type === 'system_alert' && !['admin', 'super_admin', 'finance_admin'].includes(role)) {
            return res.status(403).json({ error: 'System alerts require admin' });
        }

        if (message_type === 'quote_card') {
            const quote = req.body.quote || {};
            if (!quote.price || !quote.scope || !quote.timeline || !quote.validity_days) {
                return res.status(400).json({ error: 'Quote card requires price, scope, timeline, validity_days' });
            }
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const attachmentCount = Array.isArray(attachments) ? attachments.length : 0;
        if (attachmentCount > 0) {
            const allowedAttachments = new Set(['image', 'document']);
            for (const attachment of attachments) {
                if (!allowedAttachments.has(attachment.attachment_type)) {
                    return res.status(400).json({ error: 'Invalid attachment type' });
                }
                if (!attachment.url) {
                    return res.status(400).json({ error: 'Attachment url required' });
                }
            }
        }

        await client.query('BEGIN');

        const baseMetadata = req.body.metadata || {};
        const finalMetadata = message_type === 'quote_card'
            ? { ...baseMetadata, quote: req.body.quote }
            : baseMetadata;

        await client.query(
            `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata, reply_to_message_id, attachment_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                messageId,
                conversationId,
                userId,
                role,
                message_type,
                sanitizedBody,
                JSON.stringify(finalMetadata),
                reply_to_message_id || null,
                attachmentCount
            ]
        );

        if (attachmentCount > 0) {
            for (const attachment of attachments) {
                const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await client.query(
                    `INSERT INTO message_attachments (id, message_id, attachment_type, url, file_name, mime_type, size_bytes)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        attachmentId,
                        messageId,
                        attachment.attachment_type,
                        attachment.url,
                        attachment.file_name || null,
                        attachment.mime_type || null,
                        attachment.size_bytes || null
                    ]
                );
            }
        }

        await client.query(
            `UPDATE conversations
             SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [messageId, conversationId]
        );

        await addSystemEvent(conversationId, 'message_sent', userId, { message_id: messageId });

        if (contactAttempted) {
            await addSystemMessage(client, conversationId, 'Contact details removed until contract acceptance', {
                reason: 'contact_details_blocked'
            }, userId);
            await addSystemEvent(conversationId, 'contact_details_blocked', userId, { message_id: messageId });
        }

        const recipientId = role === 'customer' ? conversation.vendor_id : conversation.customer_id;
        const participantResult = await client.query(
            `SELECT notification_pref, muted_until FROM conversation_participants
             WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, recipientId]
        );

        const participant = participantResult.rows[0];
        const muted = participant?.muted_until && new Date(participant.muted_until) > new Date();
        if (!muted && participant?.notification_pref !== 'mute') {
            await addNotification({
                userId: recipientId,
                type: 'message',
                title: 'New message',
                body: sanitizedBody || message_type,
                metadata: { conversation_id: conversationId, message_id: messageId }
            });
        }

        await client.query('COMMIT');

        res.status(201).json({ success: true, message_id: messageId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    } finally {
        client.release();
    }
});

// ============================================================
// Conversation Actions (Mute, Archive, Details, Reports, Files)
// ============================================================

router.get('/conversations/preferences', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        await ensureConversationArchivesTable();

        const mutedResult = await pool.query(
            `SELECT conversation_id
             FROM conversation_participants
             WHERE user_id = $1 AND notification_pref = 'mute'`,
            [userId]
        );

        const archivedResult = await pool.query(
            `SELECT conversation_id
             FROM conversation_archives
             WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            mutedConversationIds: mutedResult.rows.map(row => row.conversation_id),
            archivedConversationIds: archivedResult.rows.map(row => row.conversation_id)
        });
    } catch (error) {
        console.error('Conversation preferences error:', error);
        res.status(500).json({ error: 'Failed to load preferences' });
    }
});

router.get('/conversations/:conversationId/job-details', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const convoResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (!convoResult.rows.length) return res.status(404).json({ error: 'Conversation not found' });

        const conversation = convoResult.rows[0];
        const jobResult = await pool.query(
            `SELECT id, title, description, status, postcode, budget_min, budget_max
             FROM quotes
             WHERE id = $1`,
            [conversation.job_id]
        );

        if (!jobResult.rows.length) {
            return res.status(404).json({ error: 'Job not found' });
        }

        const job = jobResult.rows[0];
        res.json({
            success: true,
            job: {
                id: job.id,
                title: job.title,
                description: job.description,
                status: job.status,
                postcode_district: maskPostcodeDistrict(job.postcode),
                budget_min: job.budget_min,
                budget_max: job.budget_max
            }
        });
    } catch (error) {
        console.error('Job details error:', error);
        res.status(500).json({ error: 'Failed to load job details' });
    }
});

router.get('/conversations/:conversationId/accepted-quote', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const convoResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (!convoResult.rows.length) return res.status(404).json({ error: 'Conversation not found' });

        const conversation = convoResult.rows[0];
        const bidResult = await pool.query(
            `SELECT b.id, b.price, b.message, b.estimated_duration, b.availability, b.vendor_id
             FROM bids b
             WHERE b.quote_id = $1 AND b.status = 'accepted'
             ORDER BY b.created_at DESC
             LIMIT 1`,
            [conversation.job_id]
        );

        if (!bidResult.rows.length) {
            return res.status(404).json({ error: 'Accepted quote not found' });
        }

        const bid = bidResult.rows[0];
        res.json({
            success: true,
            quote: {
                bid_id: bid.id,
                price: bid.price,
                scope: bid.message || 'Scope details available in the bid message.',
                timeline: bid.estimated_duration || 'Timeline not specified',
                vendor_notes: bid.availability || 'No additional notes.'
            }
        });
    } catch (error) {
        console.error('Accepted quote error:', error);
        res.status(500).json({ error: 'Failed to load accepted quote' });
    }
});

router.post('/conversations/:conversationId/files', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { conversationId } = req.params;
        const { attachments = [], note } = req.body;
        const userId = req.user.userId;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const convResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
        if (!convResult.rows.length) return res.status(404).json({ error: 'Conversation not found' });
        const conversation = convResult.rows[0];
        if (conversation.is_locked || ['archived', 'locked'].includes(conversation.status)) {
            if (!['admin', 'super_admin'].includes(req.user.role)) {
                return res.status(423).json({ error: 'Conversation is locked' });
            }
        }

        if (!Array.isArray(attachments) || attachments.length === 0) {
            return res.status(400).json({ error: 'attachments are required' });
        }

        const allowedTypes = new Set(['image', 'document']);
        for (const attachment of attachments) {
            if (!allowedTypes.has(attachment.attachment_type)) {
                return res.status(400).json({ error: 'Invalid attachment type' });
            }
            if (!attachment.url) {
                return res.status(400).json({ error: 'Attachment url required' });
            }
        }

        const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const body = note || `Shared ${attachments.length} file${attachments.length > 1 ? 's' : ''}`;

        await client.query('BEGIN');

        await client.query(
            `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata, attachment_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                messageId,
                conversationId,
                userId,
                req.user.role,
                'document',
                body,
                JSON.stringify({ attachment_share: true }),
                attachments.length
            ]
        );

        for (const attachment of attachments) {
            const attachmentId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await client.query(
                `INSERT INTO message_attachments (id, message_id, attachment_type, url, file_name, mime_type, size_bytes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    attachmentId,
                    messageId,
                    attachment.attachment_type,
                    attachment.url,
                    attachment.file_name || null,
                    attachment.mime_type || null,
                    attachment.size_bytes || null
                ]
            );
        }

        await client.query(
            `UPDATE conversations
             SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [messageId, conversationId]
        );

        await addSystemEvent(conversationId, 'files_shared', userId, { message_id: messageId });
        await client.query('COMMIT');

        res.status(201).json({ success: true, message_id: messageId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Share files error:', error);
        res.status(500).json({ error: 'Failed to share files' });
    } finally {
        client.release();
    }
});

router.post('/conversations/:conversationId/mute', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { muted = true } = req.body;
        const userId = req.user.userId;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await ensureParticipant(conversationId, userId, req.user.role);

        await pool.query(
            `UPDATE conversation_participants
             SET notification_pref = $1, muted_until = NULL
             WHERE conversation_id = $2 AND user_id = $3`,
            [muted ? 'mute' : null, conversationId, userId]
        );

        res.json({ success: true, muted: !!muted });
    } catch (error) {
        console.error('Mute conversation error:', error);
        res.status(500).json({ error: 'Failed to update mute preference' });
    }
});

router.post('/conversations/:conversationId/archive', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await ensureConversationArchivesTable();
        const archiveId = `arch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
            `INSERT INTO conversation_archives (id, conversation_id, user_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (conversation_id, user_id) DO NOTHING`,
            [archiveId, conversationId, userId]
        );

        await addSystemEvent(conversationId, 'conversation_archived', userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Archive conversation error:', error);
        res.status(500).json({ error: 'Failed to archive conversation' });
    }
});

router.post('/conversations/:conversationId/restore', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.userId;

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await ensureConversationArchivesTable();
        await pool.query(
            `DELETE FROM conversation_archives WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
        );

        await addSystemEvent(conversationId, 'conversation_restored', userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Restore conversation error:', error);
        res.status(500).json({ error: 'Failed to restore conversation' });
    }
});

router.post('/conversations/:conversationId/report', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { reason, details } = req.body;
        const userId = req.user.userId;
        const allowedReasons = new Set(['unresponsive', 'dispute', 'inappropriate']);

        if (!allowedReasons.has(reason)) {
            return res.status(400).json({ error: 'Invalid reason' });
        }

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await ensureConversationReportsTable();
        const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
            `INSERT INTO conversation_reports (id, conversation_id, user_id, reason, details)
             VALUES ($1, $2, $3, $4, $5)`,
            [reportId, conversationId, userId, reason, details || null]
        );

        await addSystemEvent(conversationId, 'conversation_reported', userId, { reason });
        res.json({ success: true, report_id: reportId });
    } catch (error) {
        console.error('Report conversation error:', error);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

router.put('/messages/:messageId', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { body } = req.body;
        const userId = req.user.userId;

        const messageResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        const message = messageResult.rows[0];
        if (message.sender_id !== userId) return res.status(403).json({ error: 'Access denied' });
        if (message.is_deleted) return res.status(400).json({ error: 'Message deleted' });

        const createdAt = new Date(message.created_at);
        if ((Date.now() - createdAt.getTime()) > 5 * 60 * 1000) {
            return res.status(400).json({ error: 'Edit window expired' });
        }

        const convoResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [message.conversation_id]);
        const conversation = convoResult.rows[0];
        const sanitizedBody = canSeeContactDetails(conversation) ? body : sanitizeContactDetails(body);

        await pool.query(
            `UPDATE messages SET body = $1, edited_at = NOW() WHERE id = $2`,
            [sanitizedBody, messageId]
        );

        await pool.query(
            `INSERT INTO message_audit (id, message_id, actor_id, action, old_body, new_body)
             VALUES ($1, $2, $3, 'edit', $4, $5)`,
            [`aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, messageId, userId, message.body, sanitizedBody]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

router.delete('/messages/:messageId', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.userId;

        const messageResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        const message = messageResult.rows[0];
        if (message.sender_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await pool.query(
            `UPDATE messages SET is_deleted = true, deleted_at = NOW(), body = NULL WHERE id = $1`,
            [messageId]
        );

        await pool.query(
            `INSERT INTO message_audit (id, message_id, actor_id, action, old_body, new_body)
             VALUES ($1, $2, $3, 'delete', $4, NULL)`,
            [`aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, messageId, userId, message.body]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

router.post('/messages/:messageId/quote-action', authenticate, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { action } = req.body;
        const userId = req.user.userId;
        const allowed = new Set(['accept', 'reject', 'revise']);

        if (!allowed.has(action)) return res.status(400).json({ error: 'Invalid action' });

        const messageResult = await pool.query('SELECT * FROM messages WHERE id = $1', [messageId]);
        if (messageResult.rows.length === 0) return res.status(404).json({ error: 'Message not found' });

        const message = messageResult.rows[0];
        if (message.message_type !== 'quote_card') {
            return res.status(400).json({ error: 'Not a quote card' });
        }

        const convoResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [message.conversation_id]);
        const conversation = convoResult.rows[0];
        if (conversation.customer_id !== userId) {
            return res.status(403).json({ error: 'Only customer can respond' });
        }

        const updatedMetadata = { ...(message.metadata || {}), quote_status: action, locked_at: new Date().toISOString() };
        await pool.query(
            `UPDATE messages SET metadata = $1 WHERE id = $2`,
            [JSON.stringify(updatedMetadata), messageId]
        );

        const systemMessageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
            `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
             VALUES ($1, $2, $3, 'system', 'system', $4, $5)`,
            [systemMessageId, message.conversation_id, userId, `Quote ${action}`, JSON.stringify({ quote_message_id: messageId })]
        );

        if (action === 'accept') {
            await pool.query(
                `UPDATE conversations SET contact_allowed = true, conversation_type = 'post_award', updated_at = NOW()
                 WHERE id = $1`,
                [message.conversation_id]
            );
        }

        await addSystemEvent(message.conversation_id, `quote_${action}`, userId, { message_id: messageId });

        res.json({ success: true });
    } catch (error) {
        console.error('Quote action error:', error);
        res.status(500).json({ error: 'Failed to handle quote action' });
    }
});

// Typing indicators
router.post('/conversations/:conversationId/typing', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { is_typing = true } = req.body;
        const userId = req.user.userId;
        const role = req.user.role;

        if (!await ensureConversationAccess(conversationId, req.user)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (is_typing) {
            await pool.query(
                `INSERT INTO conversation_typing (conversation_id, user_id, role, last_seen_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (conversation_id, user_id)
                 DO UPDATE SET last_seen_at = NOW(), role = $3`,
                [conversationId, userId, role]
            );
        } else {
            await pool.query(
                `DELETE FROM conversation_typing WHERE conversation_id = $1 AND user_id = $2`,
                [conversationId, userId]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Typing indicator error:', error);
        res.status(500).json({ error: 'Failed to update typing status' });
    }
});

router.get('/conversations/:conversationId/typing', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        if (!await ensureConversationAccess(conversationId, req.user)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT user_id, role, last_seen_at
             FROM conversation_typing
             WHERE conversation_id = $1 AND last_seen_at > NOW() - INTERVAL '10 seconds'`,
            [conversationId]
        );

        res.json({ success: true, typing: result.rows });
    } catch (error) {
        console.error('Get typing indicator error:', error);
        res.status(500).json({ error: 'Failed to fetch typing status' });
    }
});

// Notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 50, offset = 0, unread } = req.query;
        const limitValue = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const offsetValue = Math.max(parseInt(offset, 10) || 0, 0);
        const filters = ['user_id = $1'];
        const params = [userId];

        if (String(unread).toLowerCase() === 'true') {
            filters.push('is_read = false');
        }

        const result = await pool.query(
            `SELECT * FROM user_notifications
             WHERE ${filters.join(' AND ')}
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [...params, limitValue, offsetValue]
        );
        res.json({ success: true, notifications: result.rows });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

router.get('/notifications/unread-count', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query(
            `SELECT COUNT(*)::int AS unread_count
             FROM user_notifications
             WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        res.json({ success: true, unreadCount: result.rows[0]?.unread_count || 0 });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

router.post('/notifications/read', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        await pool.query(
            `UPDATE user_notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Notifications read error:', error);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

router.post('/notifications/:notificationId/read', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { notificationId } = req.params;
        const result = await pool.query(
            `UPDATE user_notifications
             SET is_read = true
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [notificationId, userId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Notification read error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// ============================================================
// Admin & moderation
// ============================================================

router.get('/admin/conversations', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status, type, job_id } = req.query;
        const filters = [];
        const params = [];

        if (status) {
            params.push(status);
            filters.push(`status = $${params.length}`);
        }
        if (type) {
            params.push(type);
            filters.push(`conversation_type = $${params.length}`);
        }
        if (job_id) {
            params.push(job_id);
            filters.push(`job_id = $${params.length}`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await pool.query(`SELECT * FROM conversations ${whereClause} ORDER BY updated_at DESC LIMIT 100`, params);

        res.json({ success: true, conversations: result.rows });
    } catch (error) {
        console.error('Admin conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

router.post('/admin/conversations/:conversationId/lock', authenticate, requireAdmin, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { locked = true } = req.body;
        await pool.query(
            `UPDATE conversations SET is_locked = $1, status = CASE WHEN $1 THEN 'locked' ELSE status END, updated_at = NOW() WHERE id = $2`,
            [locked, conversationId]
        );
        await addSystemEvent(conversationId, locked ? 'conversation_locked' : 'conversation_unlocked', req.user.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Lock conversation error:', error);
        res.status(500).json({ error: 'Failed to lock conversation' });
    }
});

router.post('/admin/conversations/:conversationId/join', authenticate, requireAdmin, async (req, res) => {
    try {
        const { conversationId } = req.params;
        await ensureParticipant(conversationId, req.user.userId, req.user.role);
        await addSystemEvent(conversationId, 'admin_joined', req.user.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Admin join error:', error);
        res.status(500).json({ error: 'Failed to join conversation' });
    }
});

router.post('/admin/messages/:messageId/flag', authenticate, requireAdmin, async (req, res) => {
    try {
        const { messageId } = req.params;
        const { reason } = req.body;
        const flagId = `flag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await pool.query(
            `INSERT INTO moderation_flags (id, message_id, flagged_by, reason)
             VALUES ($1, $2, $3, $4)`,
            [flagId, messageId, req.user.userId, reason || 'admin_flag']
        );
        res.json({ success: true, flag_id: flagId });
    } catch (error) {
        console.error('Flag message error:', error);
        res.status(500).json({ error: 'Failed to flag message' });
    }
});

router.get('/admin/export', authenticate, requireAdmin, async (req, res) => {
    try {
        const { conversation_id } = req.query;
        if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });

        const conversationResult = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversation_id]);
        const messagesResult = await pool.query(
            `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
            [conversation_id]
        );
        const eventsResult = await pool.query(
            `SELECT * FROM system_events WHERE conversation_id = $1 ORDER BY created_at ASC`,
            [conversation_id]
        );

        res.json({
            success: true,
            conversation: conversationResult.rows[0],
            messages: messagesResult.rows,
            events: eventsResult.rows
        });
    } catch (error) {
        console.error('Export conversation error:', error);
        res.status(500).json({ error: 'Failed to export conversation' });
    }
});

router.post('/admin/gdpr/anonymize/:userId', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query(
            `UPDATE messages
             SET body = NULL,
                 metadata = jsonb_set(metadata, '{anonymized}', 'true', true)
             WHERE sender_id = $1`,
            [userId]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('GDPR anonymize error:', error);
        res.status(500).json({ error: 'Failed to anonymize messages' });
    }
});

// Finance admin read-only views
router.get('/finance/conversations', authenticate, requireFinanceAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM conversations WHERE is_disputed = true ORDER BY updated_at DESC LIMIT 100`
        );
        res.json({ success: true, conversations: result.rows });
    } catch (error) {
        console.error('Finance conversations error:', error);
        res.status(500).json({ error: 'Failed to fetch finance conversations' });
    }
});

module.exports = router;