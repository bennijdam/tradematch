const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
let pool;

router.setPool = (p) => { pool = p; };

const ADMIN_ROLES = new Set(['admin', 'super_admin', 'finance_admin']);
const MILESTONE_STATUSES = new Set(['planned', 'completed', 'disputed']);
const paymentNotice = 'Payment arranged directly between customer and vendor';

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

const addMilestoneAudit = async (client, milestoneId, actorId, action, details = {}) => {
    const auditId = createId('mad');
    await client.query(
        `INSERT INTO milestone_audit (id, milestone_id, actor_id, action, details)
         VALUES ($1, $2, $3, $4, $5)` ,
        [auditId, milestoneId, actorId, action, JSON.stringify(details)]
    );
    return auditId;
};

router.put('/:milestoneId/status', authenticate, async (req, res) => {
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

        if (contract.is_locked && status !== 'disputed') {
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

        res.json({ success: true, status });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update milestone status error:', error);
        res.status(500).json({ error: 'Failed to update milestone status' });
    } finally {
        client.release();
    }
});

module.exports = router;
