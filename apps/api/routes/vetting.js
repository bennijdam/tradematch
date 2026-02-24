/**
 * apps/api/routes/vetting.js
 *
 * Vendor Vetting & Credential Verification Routes
 *
 * Vendor routes (require authenticate + requireVendor):
 *   GET    /api/vetting/status                    — current vetting status + score
 *   POST   /api/vetting/identity/start            — start GOV.UK One Login OIDC flow
 *   GET    /api/vetting/identity/callback          — OIDC callback handler
 *   POST   /api/vetting/insurance                 — submit insurance document
 *   PUT    /api/vetting/insurance/:id             — update/re-upload insurance doc
 *   POST   /api/vetting/trade-registration        — submit trade registration
 *   PUT    /api/vetting/trade-registration/:id    — update trade registration
 *   POST   /api/vetting/quiz/submit               — submit quiz answers
 *   GET    /api/vetting/quiz/questions            — get quiz questions for current version
 *
 * Admin routes (require authenticate + requireAdmin):
 *   GET    /api/admin/vetting/queue               — pending submissions list
 *   GET    /api/admin/vetting/vendor/:vendorId    — full vetting profile for one vendor
 *   POST   /api/admin/vetting/insurance/:id/verify    — verify insurance doc
 *   POST   /api/admin/vetting/insurance/:id/reject    — reject insurance doc
 *   POST   /api/admin/vetting/trade/:id/verify        — verify trade registration
 *   POST   /api/admin/vetting/trade/:id/reject        — reject trade registration
 *   POST   /api/admin/vetting/vendor/:vendorId/status — change overall status
 *
 * Public route (no auth):
 *   GET    /api/vendors/:vendorId/credentials     — public credentials summary
 */

'use strict';

const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

const { authenticate, requireVendor, requireAdmin } = require('../middleware/auth');
const {
    verifyTradeRegistration,
    getGovukOneLoginAuthUrl,
    exchangeGovukOneLoginCode
} = require('../services/vetting-apis');
const {
    sendSubmissionReceived,
    sendDocumentVerified,
    sendDocumentRejected,
    sendFullyVerified,
    sendAdminNewSubmission
} = require('../services/vetting-emails');

let pool;
router.setPool = (p) => { pool = p; };

// ─── Quiz questions (static, versioned) ──────────────────────────────────────

const QUIZ_V1 = [
    {
        id: 'q1',
        question: 'What does PAT testing stand for?',
        options: [
            'Portable Appliance Testing',
            'Professional Accreditation Testing',
            'Primary Approval Testing',
            'Public Appliance Testing'
        ],
        correct: 0
    },
    {
        id: 'q2',
        question: 'Which regulation governs gas work in the UK?',
        options: [
            'Gas Safety (Installation and Use) Regulations 1998',
            'Health and Safety at Work Act 1974',
            'Building Regulations 2010',
            'Electricity at Work Regulations 1989'
        ],
        correct: 0
    },
    {
        id: 'q3',
        question: 'What minimum public liability insurance coverage is recommended for most tradespeople?',
        options: [
            '£500,000',
            '£1,000,000',
            '£250,000',
            '£2,500,000'
        ],
        correct: 1
    },
    {
        id: 'q4',
        question: 'Under GDPR, how long may you retain a customer\'s contact details without a legal basis?',
        options: [
            'Indefinitely',
            '7 years',
            'No longer than necessary for the purpose',
            '5 years'
        ],
        correct: 2
    },
    {
        id: 'q5',
        question: 'Which document proves you are registered to work on gas appliances in the UK?',
        options: [
            'NICEIC registration card',
            'Gas Safe Register card',
            'NAPIT membership certificate',
            'CORGI certificate (legacy)'
        ],
        correct: 1
    }
];

const PASS_SCORE = 80; // % to pass (4/5 correct)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getVendorIdForUser(userId) {
    const { rows } = await pool.query(
        'SELECT id FROM vendors WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    return rows[0] ? rows[0].id : null;
}

async function getVendorProfile(vendorId) {
    const { rows } = await pool.query(
        `SELECT v.id, v.business_name, u.email, v.overall_vetting_status, v.vetting_score,
                v.identity_verified, v.identity_verified_at, v.identity_provider,
                v.vetting_reviewed_by, v.vetting_reviewed_at, v.vetting_notes
           FROM vendors v
           JOIN users u ON u.id = v.user_id
          WHERE v.id = $1`,
        [vendorId]
    );
    return rows[0] || null;
}

async function auditLog(vendorId, action, actor, targetTable, targetId, oldVal, newVal, notes) {
    await pool.query(`
        INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, old_value, new_value, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
        vendorId, action, actor, targetTable || null, targetId || null,
        oldVal ? JSON.stringify(oldVal) : null,
        newVal ? JSON.stringify(newVal) : null,
        notes || null
    ]);
}

async function recomputeScore(vendorId) {
    await pool.query('SELECT recompute_vetting_score($1)', [vendorId]);
    const { rows } = await pool.query(
        'SELECT vetting_score, overall_vetting_status FROM vendors WHERE id = $1',
        [vendorId]
    );
    return rows[0] || {};
}

// ─── VENDOR ROUTES ────────────────────────────────────────────────────────────

// GET /api/vetting/status
router.get('/status', authenticate, requireVendor, async (req, res) => {
    try {
        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor profile not found' });

        const vendor = await getVendorProfile(vendorId);

        const [insRows, tradeRows, quizRows] = await Promise.all([
            pool.query('SELECT * FROM vendor_insurance WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]),
            pool.query('SELECT * FROM vendor_trade_registrations WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]),
            pool.query('SELECT * FROM vendor_quiz_results WHERE vendor_id = $1 ORDER BY attempt_number DESC LIMIT 1', [vendorId])
        ]);

        res.json({
            vendorId,
            overallStatus: vendor.overall_vetting_status,
            vettingScore:  vendor.vetting_score,
            identity: {
                verified:    vendor.identity_verified,
                verifiedAt:  vendor.identity_verified_at,
                provider:    vendor.identity_provider
            },
            insurance:          insRows.rows,
            tradeRegistrations: tradeRows.rows,
            quiz:               quizRows.rows[0] || null
        });
    } catch (err) {
        console.error('GET /vetting/status error:', err);
        res.status(500).json({ error: 'Failed to load vetting status' });
    }
});

// POST /api/vetting/identity/start
router.post('/identity/start', authenticate, requireVendor, async (req, res) => {
    try {
        const state    = crypto.randomBytes(16).toString('hex');
        const authUrl  = getGovukOneLoginAuthUrl(state);

        if (!authUrl) {
            // GOV.UK One Login not configured — mock verify for dev
            const vendorId = await getVendorIdForUser(req.user.userId);
            if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

            await pool.query(`
                UPDATE vendors
                   SET identity_verified = TRUE,
                       identity_verified_at = NOW(),
                       identity_provider = 'mock_dev'
                 WHERE id = $1
            `, [vendorId]);
            await recomputeScore(vendorId);
            await auditLog(vendorId, 'identity_verified', req.user.email || 'vendor', 'vendors', vendorId, null, { identity_verified: true }, 'Mock dev verification');
            return res.json({ verified: true, mock: true });
        }

        // Store state in session or short-lived DB record so callback can verify it
        // For simplicity, return it to the client to include in redirect
        res.json({ redirectUrl: authUrl, state });
    } catch (err) {
        console.error('POST /vetting/identity/start error:', err);
        res.status(500).json({ error: 'Failed to start identity verification' });
    }
});

// GET /api/vetting/identity/callback
router.get('/identity/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`/vendor-dashboard-enhanced?vetting_error=${encodeURIComponent(error)}`);
        }

        if (!code) {
            return res.redirect('/vendor-dashboard-enhanced?vetting_error=no_code');
        }

        const result = await exchangeGovukOneLoginCode(code);

        if (!result.success) {
            return res.redirect(`/vendor-dashboard-enhanced?vetting_error=${encodeURIComponent(result.error)}`);
        }

        // Find vendor by the GOV.UK subject or the email returned
        const { rows } = await pool.query(`
            SELECT v.id, u.email FROM vendors v
              JOIN users u ON u.id = v.user_id
             WHERE u.email = $1 OR v.govuk_subject = $2
             LIMIT 1
        `, [result.email, result.subject]);

        if (!rows[0]) {
            return res.redirect('/vendor-dashboard-enhanced?vetting_error=vendor_not_found');
        }

        const vendorId = rows[0].id;

        await pool.query(`
            UPDATE vendors
               SET identity_verified = TRUE,
                   identity_verified_at = NOW(),
                   identity_provider = 'govuk_onelogin',
                   govuk_subject = $2
             WHERE id = $1
        `, [vendorId, result.subject]).catch(() => {
            // govuk_subject column may not exist yet — add it gracefully
        });

        // Also try without govuk_subject if column doesn't exist
        await pool.query(`
            UPDATE vendors
               SET identity_verified = TRUE,
                   identity_verified_at = NOW(),
                   identity_provider = 'govuk_onelogin'
             WHERE id = $1 AND (identity_verified IS FALSE OR identity_verified IS NULL)
        `, [vendorId]);

        await recomputeScore(vendorId);
        await auditLog(vendorId, 'identity_verified', 'govuk_onelogin', 'vendors', vendorId, null, { identity_verified: true }, `GOV.UK sub: ${result.subject}`);

        res.redirect('/vendor-dashboard-enhanced?vetting_success=identity');
    } catch (err) {
        console.error('GET /vetting/identity/callback error:', err);
        res.redirect('/vendor-dashboard-enhanced?vetting_error=server_error');
    }
});

// GET /api/vetting/quiz/questions
router.get('/quiz/questions', authenticate, requireVendor, (req, res) => {
    // Return questions without correct answers
    const sanitised = QUIZ_V1.map(({ id, question, options }) => ({ id, question, options }));
    res.json({ version: 'v1', questions: sanitised });
});

// POST /api/vetting/quiz/submit
router.post('/quiz/submit', authenticate, requireVendor, async (req, res) => {
    try {
        const { answers, timeTakenSecs } = req.body;
        if (!answers || typeof answers !== 'object') {
            return res.status(400).json({ error: 'answers object required' });
        }

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        // Check attempt count
        const { rows: prevAttempts } = await pool.query(
            'SELECT COUNT(*) FROM vendor_quiz_results WHERE vendor_id = $1',
            [vendorId]
        );
        const attemptNumber = parseInt(prevAttempts[0].count, 10) + 1;

        // Score the quiz
        let correct = 0;
        QUIZ_V1.forEach((q) => {
            if (parseInt(answers[q.id], 10) === q.correct) correct++;
        });
        const score  = Math.round((correct / QUIZ_V1.length) * 100);
        const passed = score >= PASS_SCORE;

        await pool.query(`
            INSERT INTO vendor_quiz_results (vendor_id, quiz_version, score, passed, answers, time_taken_secs, attempt_number)
            VALUES ($1, 'v1', $2, $3, $4, $5, $6)
        `, [vendorId, score, passed, JSON.stringify(answers), timeTakenSecs || null, attemptNumber]);

        await recomputeScore(vendorId);
        await auditLog(vendorId, passed ? 'quiz_passed' : 'quiz_failed', req.user.email || 'vendor',
            'vendor_quiz_results', null, null, { score, passed, attemptNumber }, null);

        res.json({ score, passed, correct, total: QUIZ_V1.length, attemptNumber });
    } catch (err) {
        console.error('POST /vetting/quiz/submit error:', err);
        res.status(500).json({ error: 'Failed to submit quiz' });
    }
});

// POST /api/vetting/quiz/complete  — full QuizEngine result payload
router.post('/quiz/complete', authenticate, requireVendor, async (req, res) => {
    try {
        const {
            trade, tradeName, overall, correct, total,
            competencyScores, trustRating, fraudFlags,
            completionTimeSecs, bestStreak, answers
        } = req.body;

        if (typeof overall !== 'number') {
            return res.status(400).json({ error: 'overall score required' });
        }

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        // Retake rate-limit: max 3 per 24 h per trade
        const { rows: recentAttempts } = await pool.query(`
            SELECT COUNT(*) FROM vendor_quiz_results
             WHERE vendor_id = $1
               AND quiz_version LIKE $2
               AND created_at > NOW() - INTERVAL '24 hours'
        `, [vendorId, `%${trade || 'generic'}%`]);

        if (parseInt(recentAttempts[0].count, 10) >= 3) {
            return res.status(429).json({ error: 'RETAKE_LIMIT', message: 'Maximum 3 attempts per 24 hours reached' });
        }

        const { rows: prev } = await pool.query(
            'SELECT COUNT(*) FROM vendor_quiz_results WHERE vendor_id = $1',
            [vendorId]
        );
        const attemptNumber = parseInt(prev[0].count, 10) + 1;
        const passed        = overall >= 60;
        const quizVersion   = `engine-v2-${trade || 'generic'}`;

        await pool.query(`
            INSERT INTO vendor_quiz_results
                (vendor_id, quiz_version, score, passed, answers, time_taken_secs, attempt_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            vendorId, quizVersion, overall, passed,
            JSON.stringify({ answers, competencyScores, trustRating, fraudFlags, bestStreak }),
            completionTimeSecs || null,
            attemptNumber
        ]);

        const scoreData = await recomputeScore(vendorId);

        // Auto-promote overall status on pass
        if (passed) {
            const badge = overall >= 80 ? 'knowledge_verified' : 'conditionally_approved';
            await pool.query(`
                UPDATE vendors
                   SET overall_vetting_status = CASE WHEN overall_vetting_status = 'unverified' THEN 'pending_review' ELSE overall_vetting_status END,
                       vetting_notes = COALESCE(vetting_notes, '') || ' | Quiz ' || $2 || ' score=' || $3
                 WHERE id = $1
            `, [vendorId, badge, overall]);
        }

        // Flag for manual review if score < 40 or fraud detected
        if (overall < 40 || (fraudFlags && fraudFlags.length >= 2)) {
            await pool.query(`
                UPDATE vendors
                   SET overall_vetting_status = 'pending_review',
                       vetting_notes = COALESCE(vetting_notes, '') || ' | FLAGGED: quiz score=' || $2 || ' flags=' || $3
                 WHERE id = $1
            `, [vendorId, overall, (fraudFlags || []).join(',')]);
        }

        await auditLog(
            vendorId,
            passed ? 'quiz_passed' : 'quiz_failed',
            req.user.email || 'vendor',
            'vendor_quiz_results', null, null,
            { overall, trade, trustRating, fraudFlags, attemptNumber },
            `Trade: ${trade}, Score: ${overall}%, Trust: ${trustRating}`
        );

        res.json({
            success:       true,
            score:         overall,
            passed,
            attemptNumber,
            newVettingScore: scoreData.vetting_score,
            badge: overall >= 80 ? 'knowledge_verified' : overall >= 60 ? 'conditionally_approved' : null,
        });
    } catch (err) {
        console.error('POST /vetting/quiz/complete error:', err);
        res.status(500).json({ error: 'Failed to save quiz results' });
    }
});

// POST /api/vetting/insurance
router.post('/insurance', authenticate, requireVendor, async (req, res) => {
    try {
        const {
            insuranceType, providerName, policyNumber,
            coverageAmountGbp, validFrom, expiresAt, documentUrl
        } = req.body;

        if (!insuranceType || !providerName || !policyNumber || !coverageAmountGbp || !validFrom || !expiresAt) {
            return res.status(400).json({ error: 'Missing required insurance fields' });
        }

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        const { rows } = await pool.query(`
            INSERT INTO vendor_insurance
                (vendor_id, insurance_type, provider_name, policy_number, coverage_amount_gbp, valid_from, expires_at, document_url, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            ON CONFLICT (vendor_id, insurance_type, policy_number)
            DO UPDATE SET
                provider_name       = EXCLUDED.provider_name,
                coverage_amount_gbp = EXCLUDED.coverage_amount_gbp,
                valid_from          = EXCLUDED.valid_from,
                expires_at          = EXCLUDED.expires_at,
                document_url        = EXCLUDED.document_url,
                status              = 'pending',
                updated_at          = NOW()
            RETURNING *
        `, [vendorId, insuranceType, providerName, policyNumber, coverageAmountGbp, validFrom, expiresAt, documentUrl || null]);

        const vendor = await getVendorProfile(vendorId);
        await sendSubmissionReceived(vendor);
        await auditLog(vendorId, 'insurance_submitted', req.user.email || 'vendor', 'vendor_insurance', rows[0].id, null, rows[0], null);

        // Notify admin
        const adminEmail = process.env.VETTING_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
        if (adminEmail) {
            await sendAdminNewSubmission(adminEmail, vendor, insuranceType,
                providerName + ' — ' + insuranceType.replace(/_/g, ' '));
        }

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /vetting/insurance error:', err);
        res.status(500).json({ error: 'Failed to submit insurance' });
    }
});

// PUT /api/vetting/insurance/:id
router.put('/insurance/:id', authenticate, requireVendor, async (req, res) => {
    try {
        const { id } = req.params;
        const { providerName, policyNumber, coverageAmountGbp, validFrom, expiresAt, documentUrl } = req.body;

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        const { rows } = await pool.query(`
            UPDATE vendor_insurance
               SET provider_name = COALESCE($1, provider_name),
                   policy_number = COALESCE($2, policy_number),
                   coverage_amount_gbp = COALESCE($3, coverage_amount_gbp),
                   valid_from   = COALESCE($4, valid_from),
                   expires_at   = COALESCE($5, expires_at),
                   document_url = COALESCE($6, document_url),
                   status       = 'pending',
                   updated_at   = NOW()
             WHERE id = $7 AND vendor_id = $8
             RETURNING *
        `, [providerName, policyNumber, coverageAmountGbp, validFrom, expiresAt, documentUrl, id, vendorId]);

        if (!rows[0]) return res.status(404).json({ error: 'Insurance record not found' });

        await auditLog(vendorId, 'insurance_resubmitted', req.user.email || 'vendor', 'vendor_insurance', parseInt(id), null, rows[0], 'Vendor re-uploaded/updated document');
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /vetting/insurance/:id error:', err);
        res.status(500).json({ error: 'Failed to update insurance' });
    }
});

// POST /api/vetting/trade-registration
router.post('/trade-registration', authenticate, requireVendor, async (req, res) => {
    try {
        const {
            registrationType, registrationNumber, registeredName,
            issuingBody, validFrom, expiresAt, documentUrl
        } = req.body;

        if (!registrationType || !registrationNumber) {
            return res.status(400).json({ error: 'registrationType and registrationNumber required' });
        }

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        // Attempt API verification for supported types
        const apiResult = await verifyTradeRegistration(registrationType, registrationNumber);
        const verificationMethod = apiResult.raw && !apiResult.raw.mock && apiResult.raw.method !== 'manual' ? 'api' : 'manual';
        const status = verificationMethod === 'api' && apiResult.verified === true
            ? 'api_verified'
            : verificationMethod === 'api' && apiResult.verified === false
                ? 'rejected'
                : 'pending';

        const { rows } = await pool.query(`
            INSERT INTO vendor_trade_registrations
                (vendor_id, registration_type, registration_number, registered_name,
                 issuing_body, valid_from, expires_at, document_url,
                 status, verification_method, api_response)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (vendor_id, registration_type, registration_number)
            DO UPDATE SET
                registered_name     = EXCLUDED.registered_name,
                issuing_body        = EXCLUDED.issuing_body,
                valid_from          = EXCLUDED.valid_from,
                expires_at          = EXCLUDED.expires_at,
                document_url        = EXCLUDED.document_url,
                status              = EXCLUDED.status,
                verification_method = EXCLUDED.verification_method,
                api_response        = EXCLUDED.api_response,
                updated_at          = NOW()
            RETURNING *
        `, [
            vendorId, registrationType, registrationNumber,
            registeredName || apiResult.registeredName || null,
            issuingBody || null,
            validFrom || null,
            expiresAt || apiResult.expiresAt || null,
            documentUrl || null,
            status, verificationMethod,
            JSON.stringify(apiResult.raw)
        ]);

        await recomputeScore(vendorId);

        const vendor = await getVendorProfile(vendorId);
        if (status === 'pending') {
            await sendSubmissionReceived(vendor);
        }
        await auditLog(vendorId, 'trade_registration_submitted', req.user.email || 'vendor',
            'vendor_trade_registrations', rows[0].id, null, rows[0], `Status: ${status}`);

        if (status === 'pending') {
            const adminEmail = process.env.VETTING_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
            if (adminEmail) {
                await sendAdminNewSubmission(adminEmail, vendor, registrationType,
                    registrationType.replace(/_/g, ' ').toUpperCase());
            }
        }

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('POST /vetting/trade-registration error:', err);
        res.status(500).json({ error: 'Failed to submit trade registration' });
    }
});

// PUT /api/vetting/trade-registration/:id
router.put('/trade-registration/:id', authenticate, requireVendor, async (req, res) => {
    try {
        const { id } = req.params;
        const { registrationNumber, registeredName, issuingBody, validFrom, expiresAt, documentUrl } = req.body;

        const vendorId = await getVendorIdForUser(req.user.userId);
        if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });

        const { rows } = await pool.query(`
            UPDATE vendor_trade_registrations
               SET registration_number = COALESCE($1, registration_number),
                   registered_name     = COALESCE($2, registered_name),
                   issuing_body        = COALESCE($3, issuing_body),
                   valid_from          = COALESCE($4, valid_from),
                   expires_at          = COALESCE($5, expires_at),
                   document_url        = COALESCE($6, document_url),
                   status              = 'pending',
                   updated_at          = NOW()
             WHERE id = $7 AND vendor_id = $8
             RETURNING *
        `, [registrationNumber, registeredName, issuingBody, validFrom, expiresAt, documentUrl, id, vendorId]);

        if (!rows[0]) return res.status(404).json({ error: 'Trade registration not found' });

        await auditLog(vendorId, 'trade_registration_resubmitted', req.user.email || 'vendor',
            'vendor_trade_registrations', parseInt(id), null, rows[0], 'Vendor re-uploaded/updated document');
        res.json(rows[0]);
    } catch (err) {
        console.error('PUT /vetting/trade-registration/:id error:', err);
        res.status(500).json({ error: 'Failed to update trade registration' });
    }
});

// ─── PUBLIC ROUTE ─────────────────────────────────────────────────────────────

// GET /api/vendors/:vendorId/credentials
router.get('/public/:vendorId/credentials', async (req, res) => {
    try {
        const { vendorId } = req.params;

        const vendor = await pool.query(`
            SELECT id, business_name, overall_vetting_status, vetting_score, identity_verified
              FROM vendors WHERE id = $1
        `, [vendorId]);

        if (!vendor.rows[0]) return res.status(404).json({ error: 'Vendor not found' });

        const [insRows, tradeRows] = await Promise.all([
            pool.query(`
                SELECT insurance_type, provider_name, coverage_amount_gbp, expires_at, status
                  FROM vendor_insurance
                 WHERE vendor_id = $1 AND status = 'verified' AND expires_at >= CURRENT_DATE
                 ORDER BY insurance_type
            `, [vendorId]),
            pool.query(`
                SELECT registration_type, registered_name, issuing_body, expires_at, status
                  FROM vendor_trade_registrations
                 WHERE vendor_id = $1 AND status IN ('verified', 'api_verified')
                   AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
                 ORDER BY registration_type
            `, [vendorId])
        ]);

        res.json({
            vendorId:           vendor.rows[0].id,
            businessName:       vendor.rows[0].business_name,
            overallStatus:      vendor.rows[0].overall_vetting_status,
            vettingScore:       vendor.rows[0].vetting_score,
            identityVerified:   vendor.rows[0].identity_verified,
            insurance:          insRows.rows,
            tradeRegistrations: tradeRows.rows
        });
    } catch (err) {
        console.error('GET /api/vendors/:vendorId/credentials error:', err);
        res.status(500).json({ error: 'Failed to load credentials' });
    }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// GET /api/admin/vetting/queue
router.get('/admin/queue', authenticate, requireAdmin, async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get pending insurance docs
        const insQueue = await pool.query(`
            SELECT vi.*, v.business_name AS vendor_name, u.email AS vendor_email,
                   'insurance' AS item_type
              FROM vendor_insurance vi
              JOIN vendors v ON v.id = vi.vendor_id
              JOIN users u ON u.id = v.user_id
             WHERE vi.status = $1
             ORDER BY vi.created_at ASC
             LIMIT $2 OFFSET $3
        `, [status, parseInt(limit), offset]);

        // Get pending trade registrations
        const tradeQueue = await pool.query(`
            SELECT vtr.*, v.business_name AS vendor_name, u.email AS vendor_email,
                   'trade_registration' AS item_type
              FROM vendor_trade_registrations vtr
              JOIN vendors v ON v.id = vtr.vendor_id
              JOIN users u ON u.id = v.user_id
             WHERE vtr.status = $1
             ORDER BY vtr.created_at ASC
             LIMIT $2 OFFSET $3
        `, [status, parseInt(limit), offset]);

        // Count totals
        const [insCount, tradeCount] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM vendor_insurance WHERE status = $1`, [status]),
            pool.query(`SELECT COUNT(*) FROM vendor_trade_registrations WHERE status = $1`, [status])
        ]);

        res.json({
            insurance:          insQueue.rows,
            tradeRegistrations: tradeQueue.rows,
            totals: {
                insurance:          parseInt(insCount.rows[0].count),
                tradeRegistrations: parseInt(tradeCount.rows[0].count)
            },
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error('GET /admin/vetting/queue error:', err);
        res.status(500).json({ error: 'Failed to load vetting queue' });
    }
});

// GET /api/admin/vetting/vendor/:vendorId
router.get('/admin/vendor/:vendorId', authenticate, requireAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const vendor = await getVendorProfile(parseInt(vendorId));
        if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

        const [insRows, tradeRows, quizRows, auditRows] = await Promise.all([
            pool.query('SELECT * FROM vendor_insurance WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]),
            pool.query('SELECT * FROM vendor_trade_registrations WHERE vendor_id = $1 ORDER BY created_at DESC', [vendorId]),
            pool.query('SELECT * FROM vendor_quiz_results WHERE vendor_id = $1 ORDER BY attempt_number DESC', [vendorId]),
            pool.query('SELECT * FROM vetting_audit_log WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 50', [vendorId])
        ]);

        res.json({
            vendor,
            insurance:          insRows.rows,
            tradeRegistrations: tradeRows.rows,
            quizResults:        quizRows.rows,
            auditLog:           auditRows.rows
        });
    } catch (err) {
        console.error('GET /admin/vetting/vendor/:vendorId error:', err);
        res.status(500).json({ error: 'Failed to load vendor vetting profile' });
    }
});

// POST /api/admin/vetting/insurance/:id/verify
router.post('/admin/insurance/:id/verify', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const adminEmail = req.user.email || 'admin';

        const { rows } = await pool.query(`
            UPDATE vendor_insurance
               SET status = 'verified', verified_by = $1, verified_at = NOW(), admin_notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *
        `, [adminEmail, notes || null, id]);

        if (!rows[0]) return res.status(404).json({ error: 'Insurance record not found' });

        const { vendorId } = rows[0];
        const scoreData = await recomputeScore(vendorId);
        const vendor    = await getVendorProfile(vendorId);

        await sendDocumentVerified(vendor, rows[0].insurance_type,
            rows[0].provider_name + ' (' + rows[0].insurance_type.replace(/_/g, ' ') + ')');
        await auditLog(vendorId, 'insurance_verified', adminEmail, 'vendor_insurance', parseInt(id),
            { status: 'pending' }, { status: 'verified' }, notes);

        // Auto-promote to verified if score hits 100
        if (scoreData.vetting_score >= 100 && vendor.overall_vetting_status !== 'verified') {
            await pool.query(`UPDATE vendors SET overall_vetting_status = 'verified' WHERE id = $1`, [vendorId]);
            await sendFullyVerified(vendor, scoreData.vetting_score);
        }

        res.json({ success: true, record: rows[0], newScore: scoreData.vetting_score });
    } catch (err) {
        console.error('POST /admin/vetting/insurance/:id/verify error:', err);
        res.status(500).json({ error: 'Failed to verify insurance' });
    }
});

// POST /api/admin/vetting/insurance/:id/reject
router.post('/admin/insurance/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'rejection reason required' });

        const adminEmail = req.user.email || 'admin';

        const { rows } = await pool.query(`
            UPDATE vendor_insurance
               SET status = 'rejected', verified_by = $1, verified_at = NOW(),
                   rejection_reason = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *
        `, [adminEmail, reason, id]);

        if (!rows[0]) return res.status(404).json({ error: 'Insurance record not found' });

        const vendor = await getVendorProfile(rows[0].vendor_id);
        await sendDocumentRejected(vendor,
            rows[0].provider_name + ' (' + rows[0].insurance_type.replace(/_/g, ' ') + ')', reason);
        await auditLog(rows[0].vendor_id, 'insurance_rejected', adminEmail, 'vendor_insurance', parseInt(id),
            { status: 'pending' }, { status: 'rejected', reason }, null);

        res.json({ success: true, record: rows[0] });
    } catch (err) {
        console.error('POST /admin/vetting/insurance/:id/reject error:', err);
        res.status(500).json({ error: 'Failed to reject insurance' });
    }
});

// POST /api/admin/vetting/trade/:id/verify
router.post('/admin/trade/:id/verify', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const adminEmail = req.user.email || 'admin';

        const { rows } = await pool.query(`
            UPDATE vendor_trade_registrations
               SET status = 'verified', verified_by = $1, verified_at = NOW(), admin_notes = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *
        `, [adminEmail, notes || null, id]);

        if (!rows[0]) return res.status(404).json({ error: 'Trade registration not found' });

        const scoreData = await recomputeScore(rows[0].vendor_id);
        const vendor    = await getVendorProfile(rows[0].vendor_id);

        await sendDocumentVerified(vendor, rows[0].registration_type,
            rows[0].registration_type.replace(/_/g, ' ').toUpperCase() + ' Registration');
        await auditLog(rows[0].vendor_id, 'trade_registration_verified', adminEmail,
            'vendor_trade_registrations', parseInt(id), { status: 'pending' }, { status: 'verified' }, notes);

        if (scoreData.vetting_score >= 100 && vendor.overall_vetting_status !== 'verified') {
            await pool.query(`UPDATE vendors SET overall_vetting_status = 'verified' WHERE id = $1`, [rows[0].vendor_id]);
            await sendFullyVerified(vendor, scoreData.vetting_score);
        }

        res.json({ success: true, record: rows[0], newScore: scoreData.vetting_score });
    } catch (err) {
        console.error('POST /admin/vetting/trade/:id/verify error:', err);
        res.status(500).json({ error: 'Failed to verify trade registration' });
    }
});

// POST /api/admin/vetting/trade/:id/reject
router.post('/admin/trade/:id/reject', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        if (!reason) return res.status(400).json({ error: 'rejection reason required' });

        const adminEmail = req.user.email || 'admin';

        const { rows } = await pool.query(`
            UPDATE vendor_trade_registrations
               SET status = 'rejected', verified_by = $1, verified_at = NOW(),
                   rejection_reason = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING *
        `, [adminEmail, reason, id]);

        if (!rows[0]) return res.status(404).json({ error: 'Trade registration not found' });

        const vendor = await getVendorProfile(rows[0].vendor_id);
        await sendDocumentRejected(vendor,
            rows[0].registration_type.replace(/_/g, ' ').toUpperCase() + ' Registration', reason);
        await auditLog(rows[0].vendor_id, 'trade_registration_rejected', adminEmail,
            'vendor_trade_registrations', parseInt(id), { status: 'pending' }, { status: 'rejected', reason }, null);

        res.json({ success: true, record: rows[0] });
    } catch (err) {
        console.error('POST /admin/vetting/trade/:id/reject error:', err);
        res.status(500).json({ error: 'Failed to reject trade registration' });
    }
});

// POST /api/admin/vetting/vendor/:vendorId/status
router.post('/admin/vendor/:vendorId/status', authenticate, requireAdmin, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { status, notes } = req.body;
        const validStatuses = ['unverified', 'pending_review', 'verified', 'rejected', 'suspended'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
        }

        const adminEmail = req.user.email || 'admin';

        const { rows: oldRows } = await pool.query(
            'SELECT overall_vetting_status FROM vendors WHERE id = $1',
            [vendorId]
        );
        if (!oldRows[0]) return res.status(404).json({ error: 'Vendor not found' });

        await pool.query(`
            UPDATE vendors
               SET overall_vetting_status = $1,
                   vetting_reviewed_by    = $2,
                   vetting_reviewed_at    = NOW(),
                   vetting_notes          = COALESCE($3, vetting_notes)
             WHERE id = $4
        `, [status, adminEmail, notes || null, vendorId]);

        await auditLog(parseInt(vendorId), 'status_changed', adminEmail, 'vendors', parseInt(vendorId),
            { status: oldRows[0].overall_vetting_status }, { status }, notes);

        res.json({ success: true, vendorId, newStatus: status });
    } catch (err) {
        console.error('POST /admin/vetting/vendor/:vendorId/status error:', err);
        res.status(500).json({ error: 'Failed to update vendor status' });
    }
});

module.exports = router;
