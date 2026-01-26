const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;

router.setPool = (p) => { pool = p; };

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'finance_admin']);
const CONTRACT_STATUSES = new Set(['draft', 'sent', 'accepted', 'cancelled']);
const MILESTONE_STATUSES = new Set(['planned', 'completed', 'disputed']);
const DISPUTE_OUTCOMES = new Set(['customer_favoured', 'vendor_favoured', 'neutral']);

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const userIsParticipant = async (conversationId, userId) => {
    const result = await pool.query(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
    );
    return result.rows.length > 0;
};

const ensureConversationAccess = async (conversationId, user) => {
    if (ADMIN_ROLES.has(user.role)) return true;
    return userIsParticipant(conversationId, user.userId);
};

const getConversation = async (conversationId) => {
    const result = await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId]);
    return result.rows[0];
};

const addSystemEvent = async (conversationId, eventType, actorId, metadata = {}) => {
    const eventId = createId('evt');
    await pool.query(
        `INSERT INTO system_events (id, conversation_id, event_type, actor_id, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, conversationId, eventType, actorId, JSON.stringify(metadata)]
    );
    return eventId;
};

const addSystemMessage = async (client, conversationId, body, metadata = {}, actorId = null) => {
    const messageId = createId('msg');
    await client.query(
        `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
         VALUES ($1, $2, $3, 'system', 'system_alert', $4, $5)`,
        [messageId, conversationId, actorId, body, JSON.stringify(metadata)]
    );

    await client.query(
        `UPDATE conversations
         SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [messageId, conversationId]
    );

    return messageId;
};

const addContractAudit = async (client, contractId, actorId, action, details = {}) => {
    const auditId = createId('cad');
    await client.query(
        `INSERT INTO contract_audit (id, contract_id, actor_id, action, details)
         VALUES ($1, $2, $3, $4, $5)` ,
        [auditId, contractId, actorId, action, JSON.stringify(details)]
    );
    return auditId;
};

const addMilestoneAudit = async (client, milestoneId, actorId, action, details = {}) => {
    const auditId = createId('mad');
    await client.query(
        `INSERT INTO milestone_audit (id, milestone_id, actor_id, action, details)
         VALUES ($1, $2, $3, $4, $5)` ,
        [auditId, milestoneId, actorId, action, JSON.stringify(details)]
    );
    return auditId;
};

const createDisputeRecord = async ({ client, contract, milestoneId, reason, user }) => {
    const existing = await client.query(
        `SELECT * FROM contract_disputes WHERE contract_id = $1 AND COALESCE(milestone_id, '') = COALESCE($2, '') AND status = 'open'`,
        [contract.id, milestoneId || null]
    );
    if (existing.rows.length > 0) {
        return { dispute: existing.rows[0], created: false };
    }

    const disputeId = createId('dis');
    await client.query(
        `INSERT INTO contract_disputes (id, contract_id, milestone_id, conversation_id, raised_by, raised_role, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7)` ,
        [disputeId, contract.id, milestoneId || null, contract.conversation_id, user.userId, user.role, reason]
    );

    await client.query(
        `UPDATE contracts SET is_locked = true, updated_at = NOW() WHERE id = $1`,
        [contract.id]
    );

    await client.query(
        `UPDATE conversations SET is_disputed = true, is_locked = true, updated_at = NOW() WHERE id = $1`,
        [contract.conversation_id]
    );

    if (milestoneId) {
        await client.query(
            `UPDATE contract_milestones SET status = 'disputed', is_disputed = true, updated_at = NOW() WHERE id = $1`,
            [milestoneId]
        );
        await addMilestoneAudit(client, milestoneId, user.userId, 'disputed', { reason });
    }

    await addContractAudit(client, contract.id, user.userId, 'disputed', { reason, milestone_id: milestoneId || null });

    await addSystemMessage(client, contract.conversation_id, 'Dispute raised', {
        contract_id: contract.id,
        milestone_id: milestoneId || null,
        reason
    }, user.userId);

    return { dispute: { id: disputeId }, created: true };
};

const paymentNotice = 'Payment arranged directly between customer and vendor';

// TODO: If escrow is added in future, extend payment_event to trigger PaymentIntent creation.
// TODO: UI rendering for contract/milestone/payment_event cards.
// TODO: Email notifications for contract lifecycle events.
// TODO: Optional PDF generation for contract export.

router.get('/admin/contracts', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status } = req.query;
        const params = [];
        const filters = [];

        if (status && CONTRACT_STATUSES.has(status)) {
            params.push(status);
            filters.push(`status = $${params.length}`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await pool.query(
            `SELECT * FROM contracts ${whereClause} ORDER BY created_at DESC LIMIT 200`,
            params
        );

        res.json({ success: true, contracts: result.rows });
    } catch (error) {
        console.error('Admin get contracts error:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

router.get('/admin/disputes', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status = 'open' } = req.query;
        const params = [];
        const filters = [];

        if (status) {
            params.push(status);
            filters.push(`status = $${params.length}`);
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await pool.query(
            `SELECT * FROM contract_disputes ${whereClause} ORDER BY created_at DESC LIMIT 200`,
            params
        );

        res.json({ success: true, disputes: result.rows });
    } catch (error) {
        console.error('Admin get disputes error:', error);
        res.status(500).json({ error: 'Failed to fetch disputes' });
    }
});

router.post('/payment-events', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { conversation_id, contract_id, milestone_id, event_label, metadata = {} } = req.body || {};

        if (!conversation_id || !event_label) {
            return res.status(400).json({ error: 'conversation_id and event_label are required' });
        }

        const access = await ensureConversationAccess(conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await client.query('BEGIN');

        const paymentEventId = createId('pay');
        await client.query(
            `INSERT INTO payment_events (id, conversation_id, contract_id, milestone_id, user_id, role, event_label, metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)` ,
            [
                paymentEventId,
                conversation_id,
                contract_id || null,
                milestone_id || null,
                req.user.userId,
                req.user.role,
                event_label,
                JSON.stringify({ ...metadata, payment_notice: paymentNotice })
            ]
        );

        const messageId = createId('msg');
        await client.query(
            `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
             VALUES ($1,$2,$3,$4,'payment_event',$5,$6)` ,
            [
                messageId,
                conversation_id,
                req.user.userId,
                req.user.role,
                event_label,
                JSON.stringify({
                    payment_event_id: paymentEventId,
                    contract_id: contract_id || null,
                    milestone_id: milestone_id || null,
                    payment_notice: paymentNotice
                })
            ]
        );

        await client.query(
            `UPDATE conversations SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW() WHERE id = $2`,
            [messageId, conversation_id]
        );

        await client.query('COMMIT');

        await addSystemEvent(conversation_id, 'payment_event_logged', req.user.userId, {
            payment_event_id: paymentEventId
        });

        res.status(201).json({ success: true, payment_event_id: paymentEventId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Payment event error:', error);
        res.status(500).json({ error: 'Failed to log payment event' });
    } finally {
        client.release();
    }
});

router.get('/payment-events', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.query;
        if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const result = await pool.query(
            `SELECT * FROM payment_events WHERE conversation_id = $1 ORDER BY created_at DESC`,
            [conversationId]
        );

        res.json({ success: true, payment_events: result.rows });
    } catch (error) {
        console.error('Get payment events error:', error);
        res.status(500).json({ error: 'Failed to fetch payment events' });
    }
});

router.post('/', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            conversation_id,
            title,
            scope_of_work,
            total_price,
            milestones = [],
            start_date,
            end_date,
            cancellation_terms,
            variation_terms,
            status
        } = req.body || {};

        if (!conversation_id || !scope_of_work) {
            return res.status(400).json({ error: 'conversation_id and scope_of_work are required' });
        }

        const conversation = await getConversation(conversation_id);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        const access = await ensureConversationAccess(conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (!['customer', 'vendor'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only customers or vendors can create contracts' });
        }

        const existing = await pool.query(
            `SELECT id FROM contracts WHERE conversation_id = $1 AND status IN ('draft', 'sent', 'accepted')`,
            [conversation_id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Active contract already exists' });
        }

        if (milestones && !Array.isArray(milestones)) {
            return res.status(400).json({ error: 'milestones must be an array' });
        }

        for (const milestone of milestones) {
            if (!milestone.title) return res.status(400).json({ error: 'milestone title required' });
            if (milestone.amount && Number.isNaN(Number(milestone.amount))) {
                return res.status(400).json({ error: 'milestone amount invalid' });
            }
        }

        const contractId = createId('ctr');
        const initialStatus = CONTRACT_STATUSES.has(status) ? status : 'sent';

        await client.query('BEGIN');

        await client.query(
            `INSERT INTO contracts (
                id, conversation_id, job_id, customer_id, vendor_id, status, title, scope_of_work,
                total_price, milestone_summary, start_date, end_date, cancellation_terms,
                variation_terms, created_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [
                contractId,
                conversation_id,
                conversation.job_id,
                conversation.customer_id,
                conversation.vendor_id,
                initialStatus,
                title || null,
                scope_of_work,
                total_price || null,
                JSON.stringify({ milestones, payment_notice: paymentNotice }),
                start_date || null,
                end_date || null,
                cancellation_terms || null,
                variation_terms || null,
                req.user.userId
            ]
        );

        for (const milestone of milestones) {
            const milestoneId = createId('ms');
            await client.query(
                `INSERT INTO contract_milestones
                 (id, contract_id, conversation_id, title, description, amount, due_date, status, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8)` ,
                [
                    milestoneId,
                    contractId,
                    conversation_id,
                    milestone.title,
                    milestone.description || null,
                    milestone.amount || null,
                    milestone.due_date || null,
                    req.user.userId
                ]
            );

            await addMilestoneAudit(client, milestoneId, req.user.userId, 'created', { status: 'planned' });

            await addSystemMessage(client, conversation_id, 'Milestone proposed', {
                milestone_id: milestoneId,
                contract_id: contractId,
                title: milestone.title,
                amount: milestone.amount || null,
                due_date: milestone.due_date || null,
                payment_notice: paymentNotice
            }, req.user.userId);
        }

        const contractCardId = createId('msg');
        await client.query(
            `INSERT INTO messages (id, conversation_id, sender_id, sender_role, message_type, body, metadata)
             VALUES ($1,$2,$3,$4,'contract_card',$5,$6)`,
            [
                contractCardId,
                conversation_id,
                req.user.userId,
                req.user.role,
                'Contract proposed',
                JSON.stringify({
                    contract_id: contractId,
                    title: title || null,
                    scope_of_work,
                    total_price: total_price || null,
                    milestones,
                    start_date: start_date || null,
                    end_date: end_date || null,
                    cancellation_terms: cancellation_terms || null,
                    variation_terms: variation_terms || null,
                    payment_notice: paymentNotice
                })
            ]
        );

        await client.query(
            `UPDATE conversations
             SET last_message_id = $1, last_message_at = NOW(), updated_at = NOW()
             WHERE id = $2`,
            [contractCardId, conversation_id]
        );

        if (initialStatus !== 'draft') {
            await addSystemMessage(client, conversation_id, 'Contract sent for review', {
                contract_id: contractId
            }, req.user.userId);
        }

        await addContractAudit(client, contractId, req.user.userId, 'created', { scope_of_work, total_price });

        await client.query('COMMIT');

        if (initialStatus !== 'draft') {
            await addSystemEvent(conversation_id, 'contract_sent', req.user.userId, { contract_id: contractId });
        }

        res.status(201).json({ success: true, contract_id: contractId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create contract error:', error);
        res.status(500).json({ error: 'Failed to create contract' });
    } finally {
        client.release();
    }
});

router.get('/conversation/:conversationId', authenticate, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const access = await ensureConversationAccess(conversationId, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const contracts = await pool.query(
            `SELECT * FROM contracts WHERE conversation_id = $1 ORDER BY created_at DESC`,
            [conversationId]
        );

        res.json({ success: true, contracts: contracts.rows });
    } catch (error) {
        console.error('Get contracts error:', error);
        res.status(500).json({ error: 'Failed to fetch contracts' });
    }
});

router.get('/:contractId', authenticate, async (req, res) => {
    try {
        const { contractId } = req.params;
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const milestones = await pool.query(
            `SELECT * FROM contract_milestones WHERE contract_id = $1 ORDER BY created_at ASC`,
            [contractId]
        );
        const acceptances = await pool.query(
            `SELECT * FROM contract_acceptances WHERE contract_id = $1`,
            [contractId]
        );
        const disputes = await pool.query(
            `SELECT * FROM contract_disputes WHERE contract_id = $1 ORDER BY created_at DESC`,
            [contractId]
        );

        res.json({
            success: true,
            contract,
            milestones: milestones.rows,
            acceptances: acceptances.rows,
            disputes: disputes.rows
        });
    } catch (error) {
        console.error('Get contract error:', error);
        res.status(500).json({ error: 'Failed to fetch contract' });
    }
});

router.post('/:contractId/accept', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { contractId } = req.params;
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (!['customer', 'vendor'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only customers or vendors can accept contracts' });
        }

        if (contract.status === 'cancelled') {
            return res.status(409).json({ error: 'Contract cancelled' });
        }

        if (contract.status === 'draft') {
            return res.status(409).json({ error: 'Contract must be sent before acceptance' });
        }

        if (contract.immutable && contract.status === 'accepted') {
            const existingAcceptance = await pool.query(
                `SELECT * FROM contract_acceptances WHERE contract_id = $1 AND user_id = $2`,
                [contractId, req.user.userId]
            );
            return res.json({ success: true, contract_status: contract.status, accepted: existingAcceptance.rows.length > 0 });
        }

        await client.query('BEGIN');

        const existing = await client.query(
            `SELECT * FROM contract_acceptances WHERE contract_id = $1 AND user_id = $2`,
            [contractId, req.user.userId]
        );

        if (existing.rows.length === 0) {
            const acceptanceId = createId('cta');
            await client.query(
                `INSERT INTO contract_acceptances (id, contract_id, user_id, role, ip_address, user_agent)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    acceptanceId,
                    contractId,
                    req.user.userId,
                    req.user.role,
                    req.ip,
                    req.headers['user-agent'] || null
                ]
            );

            if (req.user.role === 'customer') {
                await client.query(
                    `UPDATE contracts
                     SET customer_accepted_at = NOW(), customer_accept_ip = $1, customer_user_agent = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [req.ip, req.headers['user-agent'] || null, contractId]
                );
            }

            if (req.user.role === 'vendor') {
                await client.query(
                    `UPDATE contracts
                     SET vendor_accepted_at = NOW(), vendor_accept_ip = $1, vendor_user_agent = $2, updated_at = NOW()
                     WHERE id = $3`,
                    [req.ip, req.headers['user-agent'] || null, contractId]
                );
            }

            await addContractAudit(client, contractId, req.user.userId, 'accepted', {
                role: req.user.role
            });

            await addSystemMessage(client, contract.conversation_id, `Contract accepted by ${req.user.role}`, {
                contract_id: contractId,
                role: req.user.role
            }, req.user.userId);
        }

        const acceptanceUsers = await client.query(
            `SELECT DISTINCT user_id FROM contract_acceptances WHERE contract_id = $1`,
            [contractId]
        );

        const acceptedUserIds = new Set(acceptanceUsers.rows.map((row) => row.user_id));
        const fullyAccepted = acceptedUserIds.has(contract.customer_id) && acceptedUserIds.has(contract.vendor_id);

        if (fullyAccepted) {
            await client.query(
                `UPDATE contracts
                 SET status = 'accepted', immutable = true, is_locked = true, locked_at = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [contractId]
            );

            await client.query(
                `UPDATE conversations
                 SET contact_allowed = true, conversation_type = 'post_award', updated_at = NOW()
                 WHERE id = $1`,
                [contract.conversation_id]
            );

            await addContractAudit(client, contractId, req.user.userId, 'accepted', { status: 'accepted' });

            await addSystemMessage(client, contract.conversation_id, 'Contract accepted by both parties', {
                contract_id: contractId
            }, req.user.userId);
        }

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'contract_accept', req.user.userId, {
            contract_id: contractId,
            fully_accepted: fullyAccepted
        });

        res.json({ success: true, contract_status: fullyAccepted ? 'accepted' : 'sent' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Accept contract error:', error);
        res.status(500).json({ error: 'Failed to accept contract' });
    } finally {
        client.release();
    }
});

router.post('/:contractId/cancel', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { contractId } = req.params;
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (!['customer', 'vendor'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only customers or vendors can cancel contracts' });
        }

        if (contract.immutable || contract.status === 'accepted') {
            return res.status(409).json({ error: 'Accepted contracts cannot be cancelled' });
        }

        await client.query('BEGIN');

        await client.query(
            `UPDATE contracts SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [contractId]
        );

        await addContractAudit(client, contractId, req.user.userId, 'cancelled', { status: 'cancelled' });

        await addSystemMessage(client, contract.conversation_id, 'Contract cancelled', {
            contract_id: contractId
        }, req.user.userId);

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'contract_cancelled', req.user.userId, { contract_id: contractId });

        res.json({ success: true, status: 'cancelled' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cancel contract error:', error);
        res.status(500).json({ error: 'Failed to cancel contract' });
    } finally {
        client.release();
    }
});

router.post('/:contractId/disputes', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { contractId } = req.params;
        const { reason, milestone_id } = req.body || {};

        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await client.query('BEGIN');

        const { dispute, created } = await createDisputeRecord({
            client,
            contract,
            milestoneId: milestone_id || null,
            reason,
            user: req.user
        });

        await client.query('COMMIT');

        if (created) {
            await addSystemEvent(contract.conversation_id, 'contract_dispute_opened', req.user.userId, {
                contract_id: contractId,
                milestone_id: milestone_id || null
            });
        }

        res.status(created ? 201 : 200).json({ success: true, dispute_id: dispute.id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create dispute error:', error);
        res.status(500).json({ error: 'Failed to create dispute' });
    } finally {
        client.release();
    }
});

router.post('/disputes/:disputeId/evidence', authenticate, async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { evidence = [] } = req.body || {};

        if (!Array.isArray(evidence) || evidence.length === 0) {
            return res.status(400).json({ error: 'evidence array required' });
        }

        const disputeResult = await pool.query('SELECT * FROM contract_disputes WHERE id = $1', [disputeId]);
        if (disputeResult.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

        const dispute = disputeResult.rows[0];
        const access = await ensureConversationAccess(dispute.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        for (const item of evidence) {
            if (!item.url) return res.status(400).json({ error: 'Evidence url required' });
            await pool.query(
                `INSERT INTO dispute_evidence (id, dispute_id, uploaded_by, url, file_name, mime_type, size_bytes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)` ,
                [createId('evi'), disputeId, req.user.userId, item.url, item.file_name || null, item.mime_type || null, item.size_bytes || null]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Add dispute evidence error:', error);
        res.status(500).json({ error: 'Failed to add evidence' });
    }
});

router.post('/disputes/:disputeId/notes', authenticate, async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { note, is_internal = false } = req.body || {};

        if (!note) return res.status(400).json({ error: 'note is required' });

        if (is_internal && !ADMIN_ROLES.has(req.user.role)) {
            return res.status(403).json({ error: 'Admin only internal notes' });
        }

        const disputeResult = await pool.query('SELECT * FROM contract_disputes WHERE id = $1', [disputeId]);
        if (disputeResult.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

        const dispute = disputeResult.rows[0];
        const access = await ensureConversationAccess(dispute.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await pool.query(
            `INSERT INTO dispute_notes (id, dispute_id, author_id, note, is_internal)
             VALUES ($1, $2, $3, $4, $5)` ,
            [createId('dnt'), disputeId, req.user.userId, note, !!is_internal]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Add dispute note error:', error);
        res.status(500).json({ error: 'Failed to add note' });
    }
});

router.post('/disputes/:disputeId/resolve', authenticate, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { disputeId } = req.params;
        const { outcome } = req.body || {};

        if (!DISPUTE_OUTCOMES.has(outcome)) {
            return res.status(400).json({ error: 'Invalid outcome' });
        }

        const disputeResult = await pool.query('SELECT * FROM contract_disputes WHERE id = $1', [disputeId]);
        if (disputeResult.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

        const dispute = disputeResult.rows[0];
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [dispute.contract_id]);
        const contract = contractResult.rows[0];

        await client.query('BEGIN');

        await client.query(
            `UPDATE contract_disputes
             SET status = 'resolved', outcome = $1, resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
             WHERE id = $3`,
            [outcome, req.user.userId, disputeId]
        );

        const acceptanceUsers = await client.query(
            `SELECT DISTINCT user_id FROM contract_acceptances WHERE contract_id = $1`,
            [contract.id]
        );
        const acceptedUserIds = new Set(acceptanceUsers.rows.map((row) => row.user_id));
        const fullyAccepted = acceptedUserIds.has(contract.customer_id) && acceptedUserIds.has(contract.vendor_id);

        const nextStatus = fullyAccepted ? 'accepted' : 'sent';
        await client.query(
            `UPDATE contracts
             SET status = $1, is_locked = false, immutable = $2, updated_at = NOW()
             WHERE id = $3`,
            [nextStatus, fullyAccepted, contract.id]
        );

        await client.query(
            `UPDATE conversations SET is_disputed = false, is_locked = false, updated_at = NOW() WHERE id = $1`,
            [contract.conversation_id]
        );

        await addContractAudit(client, contract.id, req.user.userId, 'dispute_resolved', { outcome, status: nextStatus });

        await addSystemMessage(client, contract.conversation_id, 'Dispute resolved by admin', {
            contract_id: contract.id,
            dispute_id: disputeId,
            outcome
        }, req.user.userId);

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'contract_dispute_resolved', req.user.userId, {
            contract_id: contract.id,
            dispute_id: disputeId,
            outcome
        });

        res.json({ success: true, status: nextStatus });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Resolve dispute error:', error);
        res.status(500).json({ error: 'Failed to resolve dispute' });
    } finally {
        client.release();
    }
});

router.get('/:contractId/milestones', authenticate, async (req, res) => {
    try {
        const { contractId } = req.params;
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const milestones = await pool.query(
            `SELECT * FROM contract_milestones WHERE contract_id = $1 ORDER BY created_at ASC`,
            [contractId]
        );

        res.json({ success: true, milestones: milestones.rows });
    } catch (error) {
        console.error('Get milestones error:', error);
        res.status(500).json({ error: 'Failed to fetch milestones' });
    }
});

router.post('/:contractId/milestones', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { contractId } = req.params;
        const { title, description, amount, due_date } = req.body || {};

        if (!title) return res.status(400).json({ error: 'title is required' });

        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contractId]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (contract.is_locked || contract.status === 'cancelled') {
            return res.status(409).json({ error: 'Contract is locked or disputed' });
        }

        await client.query('BEGIN');

        const milestoneId = createId('ms');
        await client.query(
            `INSERT INTO contract_milestones
             (id, contract_id, conversation_id, title, description, amount, due_date, status, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'planned',$8)` ,
            [
                milestoneId,
                contractId,
                contract.conversation_id,
                title,
                description || null,
                amount || null,
                due_date || null,
                req.user.userId
            ]
        );

        await addMilestoneAudit(client, milestoneId, req.user.userId, 'created', { status: 'planned' });

        await addSystemMessage(client, contract.conversation_id, 'Milestone proposed', {
            milestone_id: milestoneId,
            contract_id: contractId,
            title,
            amount: amount || null,
            due_date: due_date || null,
            payment_notice: paymentNotice
        }, req.user.userId);

        await client.query(
            `UPDATE contracts SET updated_at = NOW() WHERE id = $1`,
            [contractId]
        );

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'milestone_created', req.user.userId, {
            contract_id: contractId,
            milestone_id: milestoneId
        });

        res.status(201).json({ success: true, milestone_id: milestoneId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create milestone error:', error);
        res.status(500).json({ error: 'Failed to create milestone' });
    } finally {
        client.release();
    }
});

router.patch('/milestones/:milestoneId/status', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { milestoneId } = req.params;
        const { status } = req.body || {};

        if (!MILESTONE_STATUSES.has(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const milestoneResult = await pool.query('SELECT * FROM contract_milestones WHERE id = $1', [milestoneId]);
        if (milestoneResult.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

        const milestone = milestoneResult.rows[0];
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [milestone.contract_id]);
        const contract = contractResult.rows[0];

        const access = await ensureConversationAccess(milestone.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        if (contract.is_locked && contract.status !== 'accepted' && status !== 'disputed') {
            return res.status(409).json({ error: 'Contract is disputed' });
        }

        const allowedTransitions = {
            planned: new Set(['completed', 'disputed']),
            completed: new Set([]),
            disputed: new Set([])
        };

        const currentStatus = milestone.status === 'agreed' || milestone.status === 'proposed' ? 'planned' : milestone.status;
        if (!allowedTransitions[currentStatus]?.has(status)) {
            return res.status(400).json({ error: `Invalid transition from ${milestone.status} to ${status}` });
        }

        await client.query('BEGIN');

        await client.query(
            `UPDATE contract_milestones SET status = $1, updated_at = NOW(), is_disputed = $2 WHERE id = $3`,
            [status, status === 'disputed', milestoneId]
        );

        await addMilestoneAudit(client, milestoneId, req.user.userId, 'status_updated', { from: milestone.status, to: status });

        await addSystemMessage(client, milestone.conversation_id, `Milestone ${status}`, {
            milestone_id: milestoneId,
            contract_id: milestone.contract_id,
            status,
            payment_notice: paymentNotice
        }, req.user.userId);

        if (status === 'disputed') {
            await client.query(
                `UPDATE contracts SET is_locked = true, updated_at = NOW() WHERE id = $1`,
                [milestone.contract_id]
            );
            await client.query(
                `UPDATE conversations SET is_disputed = true, is_locked = true, updated_at = NOW() WHERE id = $1`,
                [milestone.conversation_id]
            );
        }

        await client.query('COMMIT');

        await addSystemEvent(milestone.conversation_id, 'milestone_status', req.user.userId, {
            milestone_id: milestoneId,
            status
        });

        res.json({ success: true, status });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update milestone status error:', error);
        res.status(500).json({ error: 'Failed to update milestone status' });
    } finally {
        client.release();
    }
});

router.post('/milestones/:milestoneId/dispute', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { milestoneId } = req.params;
        const { reason } = req.body || {};

        if (!reason) return res.status(400).json({ error: 'reason is required' });

        const milestoneResult = await pool.query('SELECT * FROM contract_milestones WHERE id = $1', [milestoneId]);
        if (milestoneResult.rows.length === 0) return res.status(404).json({ error: 'Milestone not found' });

        const milestone = milestoneResult.rows[0];
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [milestone.contract_id]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });

        const contract = contractResult.rows[0];
        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        await client.query('BEGIN');

        const { dispute, created } = await createDisputeRecord({
            client,
            contract,
            milestoneId,
            reason,
            user: req.user
        });

        await client.query('COMMIT');

        if (created) {
            await addSystemEvent(contract.conversation_id, 'contract_dispute_opened', req.user.userId, {
                contract_id: contract.id,
                milestone_id: milestoneId
            });
        }

        res.status(created ? 201 : 200).json({ success: true, dispute_id: dispute.id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create milestone dispute error:', error);
        res.status(500).json({ error: 'Failed to create milestone dispute' });
    } finally {
        client.release();
    }
});


router.post('/automation/run', authenticate, requireAdmin, async (req, res) => {
    try {
        const quoteDelayDays = Number(process.env.QUOTE_TO_CONTRACT_DAYS || 7);
        const contractIdleDays = Number(process.env.CONTRACT_INACTIVITY_DAYS || 14);
        const disputeWindowDays = Number(process.env.DISPUTE_REPEAT_WINDOW_DAYS || 90);
        const disputeThreshold = Number(process.env.DISPUTE_REPEAT_THRESHOLD || 2);

        const alerts = [];

        const quoteWithoutContract = await pool.query(
            `SELECT m.conversation_id, m.id AS message_id
             FROM messages m
                         LEFT JOIN contracts c
                             ON c.conversation_id = m.conversation_id
                            AND c.status IN ('draft', 'sent', 'accepted')
             WHERE m.message_type = 'quote_card'
               AND (m.metadata->>'quote_status') = 'accept'
                             AND m.created_at < NOW() - ($1::text || ' days')::interval
               AND c.id IS NULL`,
            [quoteDelayDays]
        );

        for (const row of quoteWithoutContract.rows) {
            const exists = await pool.query(
                `SELECT 1 FROM system_events WHERE conversation_id = $1 AND event_type = 'alert_quote_no_contract' AND (metadata->>'message_id') = $2`,
                [row.conversation_id, row.message_id]
            );
            if (exists.rows.length === 0) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await addSystemMessage(client, row.conversation_id, 'Accepted quote has no contract', {
                        reason: 'quote_no_contract',
                        message_id: row.message_id
                    });
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                } finally {
                    client.release();
                }
                await addSystemEvent(row.conversation_id, 'alert_quote_no_contract', req.user.userId, {
                    message_id: row.message_id
                });
                alerts.push({ type: 'quote_no_contract', conversation_id: row.conversation_id });
            }
        }

        const inactiveContracts = await pool.query(
            `SELECT id, conversation_id
             FROM contracts
             WHERE status = 'accepted'
                             AND updated_at < NOW() - ($1::text || ' days')::interval`,
            [contractIdleDays]
        );

        for (const contract of inactiveContracts.rows) {
            const exists = await pool.query(
                `SELECT 1 FROM system_events WHERE conversation_id = $1 AND event_type = 'alert_contract_inactive' AND (metadata->>'contract_id') = $2`,
                [contract.conversation_id, contract.id]
            );
            if (exists.rows.length === 0) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await addSystemMessage(client, contract.conversation_id, 'Contract has no activity', {
                        reason: 'contract_inactive',
                        contract_id: contract.id
                    });
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                } finally {
                    client.release();
                }

                await addSystemEvent(contract.conversation_id, 'alert_contract_inactive', req.user.userId, {
                    contract_id: contract.id
                });
                alerts.push({ type: 'contract_inactive', contract_id: contract.id });
            }
        }

        const overdueMilestones = await pool.query(
            `SELECT id, conversation_id, contract_id
             FROM contract_milestones
             WHERE due_date IS NOT NULL
               AND due_date < NOW()::date
               AND status NOT IN ('completed', 'disputed')`
        );

        for (const milestone of overdueMilestones.rows) {
            const exists = await pool.query(
                `SELECT 1 FROM system_events WHERE conversation_id = $1 AND event_type = 'alert_milestone_overdue' AND (metadata->>'milestone_id') = $2`,
                [milestone.conversation_id, milestone.id]
            );
            if (exists.rows.length === 0) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await addSystemMessage(client, milestone.conversation_id, 'Milestone overdue', {
                        reason: 'milestone_overdue',
                        milestone_id: milestone.id,
                        contract_id: milestone.contract_id
                    });
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                } finally {
                    client.release();
                }

                await addSystemEvent(milestone.conversation_id, 'alert_milestone_overdue', req.user.userId, {
                    milestone_id: milestone.id,
                    contract_id: milestone.contract_id
                });
                alerts.push({ type: 'milestone_overdue', milestone_id: milestone.id });
            }
        }

        const repeatDisputes = await pool.query(
            `SELECT raised_by, COUNT(*) AS dispute_count
             FROM contract_disputes
             WHERE created_at > NOW() - ($1::text || ' days')::interval
             GROUP BY raised_by
             HAVING COUNT(*) >= $2`,
            [disputeWindowDays, disputeThreshold]
        );

        for (const row of repeatDisputes.rows) {
            const latest = await pool.query(
                `SELECT conversation_id, id FROM contract_disputes WHERE raised_by = $1 ORDER BY created_at DESC LIMIT 1`,
                [row.raised_by]
            );
            const convoId = latest.rows[0]?.conversation_id;
            if (!convoId) continue;

            const exists = await pool.query(
                `SELECT 1 FROM system_events WHERE conversation_id = $1 AND event_type = 'alert_repeat_disputes' AND (metadata->>'user_id') = $2`,
                [convoId, row.raised_by]
            );
            if (exists.rows.length === 0) {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');
                    await addSystemMessage(client, convoId, 'Repeated disputes detected', {
                        reason: 'repeat_disputes',
                        user_id: row.raised_by,
                        count: Number(row.dispute_count)
                    });
                    await client.query('COMMIT');
                } catch (error) {
                    await client.query('ROLLBACK');
                } finally {
                    client.release();
                }

                await addSystemEvent(convoId, 'alert_repeat_disputes', req.user.userId, {
                    user_id: row.raised_by,
                    count: Number(row.dispute_count)
                });
                alerts.push({ type: 'repeat_disputes', user_id: row.raised_by });
            }
        }

        res.json({ success: true, alerts_emitted: alerts.length, alerts });
    } catch (error) {
        console.error('Automation run error:', error);
        res.status(500).json({ error: 'Failed to run automation' });
    }
});

module.exports = router;
