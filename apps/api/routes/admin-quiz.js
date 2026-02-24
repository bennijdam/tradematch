/**
 * apps/api/routes/admin-quiz.js
 *
 * Admin routes for the Professional Knowledge Verification (Quiz) system.
 * All routes require admin authentication.
 *
 * Endpoints:
 *   GET  /api/admin/quiz/stats            — aggregate counts
 *   GET  /api/admin/quiz/attempts         — paginated attempt log (?trade=&result=&limit=)
 *   GET  /api/admin/quiz/flagged          — attempts flagged for review (score<40 or fraud)
 *   GET  /api/admin/quiz/attempt/:id      — single attempt detail
 *   POST /api/admin/quiz/review           — admin action: allow_retake | reject
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { authenticate, requireAdmin } = require('../middleware/auth');

let pool;
router.setPool = (p) => { pool = p; };

// ─── Helper: audit log ──────────────────────────────────────────────────────

async function auditLog(vendorId, action, actor, notes) {
    try {
        await pool.query(
            `INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, notes)
             VALUES ($1, $2, $3, 'vendor_quiz_results', $4)`,
            [vendorId, action, actor, notes || null]
        );
    } catch (_) { /* non-critical */ }
}

// ─── GET /stats ─────────────────────────────────────────────────────────────

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                COUNT(*)                                                                   AS total,
                COUNT(*) FILTER (WHERE score >= 60)                                        AS passed,
                COUNT(*) FILTER (WHERE score >= 80)                                        AS verified,
                COUNT(*) FILTER (
                    WHERE score < 40
                       OR (answers ? 'fraudFlags'
                           AND jsonb_array_length(answers->'fraudFlags') > 0)
                )                                                                          AS flagged
            FROM vendor_quiz_results
        `);
        const row = rows[0];
        res.json({
            total:    parseInt(row.total,    10),
            passed:   parseInt(row.passed,   10),
            verified: parseInt(row.verified, 10),
            flagged:  parseInt(row.flagged,  10),
        });
    } catch (err) {
        console.error('admin-quiz /stats error:', err);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// ─── GET /attempts ──────────────────────────────────────────────────────────

router.get('/attempts', authenticate, requireAdmin, async (req, res) => {
    try {
        const limit  = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const trade  = req.query.trade  || null;  // bank key: gas, electrical, ...
        const result = req.query.result || null;  // 'pass' | 'fail'

        const conditions = [];
        const params     = [];

        if (trade) {
            params.push(`%${trade}%`);
            conditions.push(`vqr.quiz_version ILIKE $${params.length}`);
        }
        if (result === 'pass')  conditions.push('vqr.passed = TRUE');
        if (result === 'fail')  conditions.push('vqr.passed = FALSE');

        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        params.push(limit);

        const { rows } = await pool.query(`
            SELECT
                vqr.id,
                vqr.vendor_id,
                COALESCE(v.business_name, v.name, 'Vendor #' || vqr.vendor_id) AS vendor_name,
                vqr.quiz_version,
                vqr.score,
                vqr.passed,
                vqr.time_taken_secs,
                vqr.attempt_number,
                vqr.created_at,
                vqr.answers->>'trustRating'                          AS trust_rating,
                vqr.answers->'fraudFlags'                            AS fraud_flags,
                vqr.answers->'competencyScores'                      AS competency_scores
            FROM vendor_quiz_results vqr
            JOIN vendors v ON v.id = vqr.vendor_id
            ${where}
            ORDER BY vqr.created_at DESC
            LIMIT $${params.length}
        `, params);

        // Parse JSONB fields for the client
        const attempts = rows.map((r) => ({
            ...r,
            fraud_flags:        safeJson(r.fraud_flags, []),
            competency_scores:  safeJson(r.competency_scores, {}),
        }));

        res.json({ attempts });
    } catch (err) {
        console.error('admin-quiz /attempts error:', err);
        res.status(500).json({ error: 'Failed to load attempts' });
    }
});

// ─── GET /flagged ───────────────────────────────────────────────────────────

router.get('/flagged', authenticate, requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                vqr.id,
                vqr.vendor_id,
                COALESCE(v.business_name, v.name, 'Vendor #' || vqr.vendor_id) AS vendor_name,
                v.email                                                         AS vendor_email,
                vqr.quiz_version,
                vqr.score,
                vqr.passed,
                vqr.time_taken_secs,
                vqr.attempt_number,
                vqr.created_at,
                vqr.answers->'fraudFlags'                                       AS fraud_flags,
                vqr.answers->>'trustRating'                                     AS trust_rating
            FROM vendor_quiz_results vqr
            JOIN vendors v ON v.id = vqr.vendor_id
            WHERE vqr.score < 40
               OR (vqr.answers ? 'fraudFlags'
                   AND jsonb_array_length(vqr.answers->'fraudFlags') > 0)
            ORDER BY vqr.created_at DESC
            LIMIT 100
        `);

        const flagged = rows.map((r) => ({
            ...r,
            fraud_flags: safeJson(r.fraud_flags, []),
        }));

        res.json({ flagged });
    } catch (err) {
        console.error('admin-quiz /flagged error:', err);
        res.status(500).json({ error: 'Failed to load flagged attempts' });
    }
});

// ─── GET /attempt/:id ───────────────────────────────────────────────────────

router.get('/attempt/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid attempt id' });

        const { rows } = await pool.query(`
            SELECT
                vqr.*,
                COALESCE(v.business_name, v.name, 'Vendor #' || vqr.vendor_id) AS vendor_name,
                v.email AS vendor_email
            FROM vendor_quiz_results vqr
            JOIN vendors v ON v.id = vqr.vendor_id
            WHERE vqr.id = $1
        `, [id]);

        if (!rows.length) return res.status(404).json({ error: 'Attempt not found' });

        const row = rows[0];
        // answers JSONB: keep as raw object for the admin to parse client-side
        row.answers = typeof row.answers === 'string' ? row.answers : JSON.stringify(row.answers);

        res.json({ attempt: row });
    } catch (err) {
        console.error('admin-quiz /attempt/:id error:', err);
        res.status(500).json({ error: 'Failed to load attempt' });
    }
});

// ─── POST /review ────────────────────────────────────────────────────────────

router.post('/review', authenticate, requireAdmin, async (req, res) => {
    try {
        const { vendorId, action } = req.body;
        if (!vendorId || !['allow_retake', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Invalid payload. action must be allow_retake or reject' });
        }

        const adminEmail = req.user?.email || 'admin';

        if (action === 'allow_retake') {
            // Delete the most recent flagged attempt so the vendor can retake the quiz.
            // The server-side rate-limit check in /quiz/complete uses a 24h window;
            // removing the DB record lets them take a fresh attempt.
            await pool.query(`
                DELETE FROM vendor_quiz_results
                WHERE id = (
                    SELECT id FROM vendor_quiz_results
                    WHERE vendor_id = $1
                      AND (score < 40
                           OR (answers ? 'fraudFlags'
                               AND jsonb_array_length(answers->'fraudFlags') > 0))
                    ORDER BY created_at DESC
                    LIMIT 1
                )
            `, [vendorId]);

            await auditLog(
                vendorId,
                'quiz_retake_allowed',
                adminEmail,
                `Admin (${adminEmail}) cleared flagged attempt — retake allowed`
            );

            res.json({ success: true, message: 'Retake allowed — flagged attempt cleared' });

        } else {
            // action === 'reject': mark the vendor's vetting_status as rejected
            await pool.query(
                `UPDATE vendors SET vetting_status = 'rejected', updated_at = NOW()
                  WHERE id = $1`,
                [vendorId]
            );

            await auditLog(
                vendorId,
                'quiz_rejected',
                adminEmail,
                `Admin (${adminEmail}) rejected vendor after quiz fraud review`
            );

            res.json({ success: true, message: 'Vendor application rejected' });
        }
    } catch (err) {
        console.error('admin-quiz /review error:', err);
        res.status(500).json({ error: 'Review action failed' });
    }
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function safeJson(val, fallback) {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (_) { return fallback; }
}

module.exports = router;
