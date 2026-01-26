const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
let pool;

router.setPool = (p) => { pool = p; };

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'finance_admin']);

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

router.post('/', authenticate, async (req, res) => {
    const client = await pool.connect();
    try {
        const { contract_id, milestone_id, reason } = req.body || {};
        if (!contract_id || !reason) {
            return res.status(400).json({ error: 'contract_id and reason are required' });
        }

        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [contract_id]);
        if (contractResult.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
        const contract = contractResult.rows[0];

        const access = await ensureConversationAccess(contract.conversation_id, req.user);
        if (!access) return res.status(403).json({ error: 'Access denied' });

        const existing = await pool.query(
            `SELECT * FROM contract_disputes WHERE contract_id = $1 AND COALESCE(milestone_id, '') = COALESCE($2, '') AND status = 'open'`,
            [contract_id, milestone_id || null]
        );
        if (existing.rows.length > 0) {
            return res.json({ success: true, dispute_id: existing.rows[0].id });
        }

        await client.query('BEGIN');

        const disputeId = createId('dis');
        await client.query(
            `INSERT INTO contract_disputes (id, contract_id, milestone_id, conversation_id, raised_by, raised_role, reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7)` ,
            [disputeId, contract_id, milestone_id || null, contract.conversation_id, req.user.userId, req.user.role, reason]
        );

        await client.query(
            `UPDATE contracts SET is_locked = true, updated_at = NOW() WHERE id = $1`,
            [contract_id]
        );

        await client.query(
            `UPDATE conversations SET is_disputed = true, is_locked = true, updated_at = NOW() WHERE id = $1`,
            [contract.conversation_id]
        );

        if (milestone_id) {
            await client.query(
                `UPDATE contract_milestones SET status = 'disputed', is_disputed = true, updated_at = NOW() WHERE id = $1`,
                [milestone_id]
            );
        }

        await addContractAudit(client, contract_id, req.user.userId, 'disputed', { reason, milestone_id: milestone_id || null });

        await addSystemMessage(client, contract.conversation_id, 'Dispute raised', {
            contract_id,
            milestone_id: milestone_id || null,
            reason
        }, req.user.userId);

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'contract_dispute_opened', req.user.userId, {
            contract_id,
            milestone_id: milestone_id || null
        });

        res.status(201).json({ success: true, dispute_id: disputeId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create dispute error:', error);
        res.status(500).json({ error: 'Failed to create dispute' });
    } finally {
        client.release();
    }
});

router.post('/:disputeId/resolve', authenticate, requireAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
        const { disputeId } = req.params;
        const { outcome, admin_notes, status = 'resolved' } = req.body || {};

        const disputeResult = await pool.query('SELECT * FROM contract_disputes WHERE id = $1', [disputeId]);
        if (disputeResult.rows.length === 0) return res.status(404).json({ error: 'Dispute not found' });

        const dispute = disputeResult.rows[0];
        const contractResult = await pool.query('SELECT * FROM contracts WHERE id = $1', [dispute.contract_id]);
        const contract = contractResult.rows[0];

        await client.query('BEGIN');

        await client.query(
            `UPDATE contract_disputes
             SET status = $1, outcome = $2, admin_notes = COALESCE($3, admin_notes), resolved_by = $4, resolved_at = NOW(), updated_at = NOW()
             WHERE id = $5`,
            [status, outcome || null, admin_notes || null, req.user.userId, disputeId]
        );

        await client.query(
            `UPDATE contracts SET is_locked = false, updated_at = NOW() WHERE id = $1`,
            [contract.id]
        );

        await client.query(
            `UPDATE conversations SET is_disputed = false, is_locked = false, updated_at = NOW() WHERE id = $1`,
            [contract.conversation_id]
        );

        await addContractAudit(client, contract.id, req.user.userId, 'dispute_resolved', { outcome, status });

        await addSystemMessage(client, contract.conversation_id, 'Dispute resolved by admin', {
            contract_id: contract.id,
            dispute_id: disputeId,
            outcome: outcome || null
        }, req.user.userId);

        await client.query('COMMIT');

        await addSystemEvent(contract.conversation_id, 'contract_dispute_resolved', req.user.userId, {
            contract_id: contract.id,
            dispute_id: disputeId,
            outcome: outcome || null
        });

        res.json({ success: true, status });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Resolve dispute error:', error);
        res.status(500).json({ error: 'Failed to resolve dispute' });
    } finally {
        client.release();
    }
});

module.exports = router;
