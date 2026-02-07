/**
 * Finance Admin Routes
 * Refund-safe ledger operations, credits, reconciliation.
 */
const express = require('express');
const crypto = require('crypto');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const { authenticate, requireFinanceAdmin } = require('../middleware/auth');
const { adminAudit } = require('../middleware/admin-audit');

const router = express.Router();
let pool;

router.setPool = (p) => { pool = p; };

router.use(authenticate);
router.use(requireFinanceAdmin);

const REASON_CODES = [
    { code: 'duplicate_charge', description: 'Duplicate charge', severity: 'low' },
    { code: 'service_not_delivered', description: 'Service not delivered', severity: 'high' },
    { code: 'quality_issue', description: 'Quality issue', severity: 'medium' },
    { code: 'fraud_suspected', description: 'Fraud suspected', severity: 'critical' },
    { code: 'goodwill', description: 'Goodwill gesture', severity: 'low' },
    { code: 'pricing_error', description: 'Pricing error', severity: 'medium' },
    { code: 'vendor_dispute', description: 'Vendor dispute', severity: 'high' },
    { code: 'other', description: 'Other', severity: 'low' }
];

const ensureStripeKey = () => {
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe secret key not configured');
    }
};

const toCents = (amount) => {
    if (typeof amount === 'number') {
        return Math.round(amount * 100);
    }
    if (typeof amount === 'string') {
        return Math.round(parseFloat(amount) * 100);
    }
    return 0;
};

const createLedgerEntry = async ({
    userId,
    amountCents,
    currency = 'GBP',
    entryType,
    reasonCode,
    createdBy,
    stripeRef = null,
    idempotencyKey = null,
    metadata = {}
}) => {
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO finance_ledger_entries
            (id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_by, idempotency_key, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`
        , [id, stripeRef, userId, amountCents, currency, entryType, reasonCode, createdBy, idempotencyKey, JSON.stringify(metadata)]
    );
    return id;
};

const consumeCredits = async ({ vendorId, amountCents, usedFor, createdBy }) => {
    // Priority: earliest expiry first, then oldest created
    const lotsResult = await pool.query(
        `SELECT id, remaining_cents, expires_at, created_at
         FROM finance_credit_lots
         WHERE vendor_id = $1 AND remaining_cents > 0
         ORDER BY expires_at NULLS LAST, created_at ASC`,
        [vendorId]
    );

    let remaining = amountCents;
    let consumed = 0;

    for (const lot of lotsResult.rows) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, parseInt(lot.remaining_cents, 10));
        remaining -= take;
        consumed += take;

        await pool.query(
            `UPDATE finance_credit_lots
             SET remaining_cents = remaining_cents - $1
             WHERE id = $2`,
            [take, lot.id]
        );

        await pool.query(
            `INSERT INTO finance_credit_usage (id, credit_lot_id, vendor_id, amount_cents, used_for)
             VALUES ($1,$2,$3,$4,$5)`,
            [crypto.randomUUID(), lot.id, vendorId, take, usedFor]
        );
    }

    if (consumed > 0) {
        await createLedgerEntry({
            userId: vendorId,
            amountCents: -consumed,
            currency: 'GBP',
            entryType: 'credit_consumed',
            reasonCode: 'credit_usage',
            createdBy,
            metadata: { usedFor }
        });
    }

    return { requested: amountCents, consumed, remaining };
};

// Reason codes
router.get('/reason-codes', async (req, res) => {
    res.json({ success: true, reasons: REASON_CODES });
});

// Refund request
router.post(
    '/refunds',
    adminAudit({
        action: 'finance_refund_requested',
        targetType: 'payment',
        getTargetId: (req, res) => res.locals.refundTargetId || req.body.stripePaymentIntentId || null,
        getDetails: (req, res) => ({
            refundId: res.locals.refundRecordId || null,
            amount: req.body.amount,
            reasonCode: req.body.reasonCode || null,
            memo: req.body.memo || null
        })
    }),
    async (req, res) => {
    try {
        ensureStripeKey();
        const {
            paymentId,
            stripePaymentIntentId,
            amount,
            reasonCode,
            memo
        } = req.body;

        if (!stripePaymentIntentId || !amount || !reasonCode) {
            return res.status(400).json({ error: 'stripePaymentIntentId, amount, and reasonCode are required' });
        }

        const amountCents = toCents(amount);
        if (amountCents <= 0) {
            return res.status(400).json({ error: 'Invalid refund amount' });
        }

        const idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();

        const refundRecordId = crypto.randomUUID();
        res.locals.refundRecordId = refundRecordId;
        res.locals.refundTargetId = stripePaymentIntentId;
        await pool.query(
            `INSERT INTO finance_refunds
                (id, payment_id, stripe_payment_intent_id, amount_cents, currency, status, reason_code, requested_by, approved_by, approved_at, memo, idempotency_key)
             VALUES ($1,$2,$3,$4,'GBP','pending',$5,$6,$6,NOW(),$7,$8)`
            , [refundRecordId, paymentId || null, stripePaymentIntentId, amountCents, reasonCode, req.user.userId, memo || null, idempotencyKey]
        );

        await createLedgerEntry({
            userId: req.user.userId,
            amountCents: 0,
            currency: 'GBP',
            entryType: 'refund_initiated',
            reasonCode,
            createdBy: req.user.userId,
            stripeRef: stripePaymentIntentId,
            idempotencyKey,
            metadata: { memo }
        });

        const refund = await stripe.refunds.create({
            payment_intent: stripePaymentIntentId,
            amount: amountCents,
            reason: 'requested_by_customer',
            metadata: {
                refund_id: refundRecordId,
                reason_code: reasonCode,
                requested_by: req.user.userId
            }
        }, { idempotencyKey });

        await pool.query(
            `UPDATE finance_refunds SET status = 'succeeded', stripe_refund_id = $1 WHERE id = $2`,
            [refund.id, refundRecordId]
        );

        await createLedgerEntry({
            userId: req.user.userId,
            amountCents: 0,
            currency: 'GBP',
            entryType: 'refund_succeeded',
            reasonCode,
            createdBy: req.user.userId,
            stripeRef: refund.id,
            idempotencyKey,
            metadata: { memo }
        });

        res.json({ success: true, refundId: refundRecordId, stripeRefundId: refund.id });
    } catch (error) {
        console.error('Finance refund error:', error);
        res.status(500).json({ error: error.message || 'Refund failed' });
    }
});

// Issue vendor credit
router.post(
    '/credits',
    adminAudit({
        action: 'finance_credit_issued',
        targetType: 'vendor',
        getTargetId: (req) => req.body.vendorId,
        getDetails: (req, res) => ({
            creditId: res.locals.creditId || null,
            amount: req.body.amount,
            origin: req.body.origin || null,
            expiresAt: req.body.expiresAt || null,
            memo: req.body.memo || null
        })
    }),
    async (req, res) => {
    try {
        const { vendorId, amount, origin, expiresAt, memo } = req.body;
        if (!vendorId || !amount || !origin) {
            return res.status(400).json({ error: 'vendorId, amount, and origin are required' });
        }
        const amountCents = toCents(amount);
        if (amountCents <= 0) {
            return res.status(400).json({ error: 'Invalid credit amount' });
        }

        const creditId = crypto.randomUUID();
        res.locals.creditId = creditId;
        await pool.query(
            `INSERT INTO finance_credit_lots
                (id, vendor_id, amount_cents, remaining_cents, currency, origin, expires_at, created_by, memo)
             VALUES ($1,$2,$3,$3,'GBP',$4,$5,$6,$7)`
            , [creditId, vendorId, amountCents, origin, expiresAt || null, req.user.userId, memo || null]
        );

        await createLedgerEntry({
            userId: vendorId,
            amountCents: amountCents,
            currency: 'GBP',
            entryType: 'credit_issued',
            reasonCode: origin,
            createdBy: req.user.userId,
            metadata: { memo, creditId }
        });

        res.json({ success: true, creditId });
    } catch (error) {
        console.error('Finance credit error:', error);
        res.status(500).json({ error: error.message || 'Credit issuance failed' });
    }
});

// Consume vendor credits (offset fees/charges)
router.post(
    '/credits/consume',
    adminAudit({
        action: 'finance_credit_consumed',
        targetType: 'vendor',
        getTargetId: (req) => req.body.vendorId,
        getDetails: (req) => ({
            amount: req.body.amount,
            usedFor: req.body.usedFor || null
        })
    }),
    async (req, res) => {
    try {
        const { vendorId, amount, usedFor } = req.body;
        if (!vendorId || !amount || !usedFor) {
            return res.status(400).json({ error: 'vendorId, amount, and usedFor are required' });
        }
        const amountCents = toCents(amount);
        if (amountCents <= 0) {
            return res.status(400).json({ error: 'Invalid consumption amount' });
        }

        const result = await consumeCredits({
            vendorId,
            amountCents,
            usedFor,
            createdBy: req.user.userId
        });

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Credit consumption error:', error);
        res.status(500).json({ error: 'Credit consumption failed' });
    }
});

// Ledger query
router.get('/ledger', async (req, res) => {
    try {
        const { userId, limit = 50, offset = 0 } = req.query;
        const params = [];
        let sql = `SELECT * FROM finance_ledger_entries`;

        if (userId) {
            params.push(userId);
            sql += ` WHERE user_id = $${params.length}`;
        }

        params.push(parseInt(limit, 10));
        params.push(parseInt(offset, 10));
        sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await pool.query(sql, params);
        res.json({ success: true, entries: result.rows });
    } catch (error) {
        console.error('Ledger fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch ledger entries' });
    }
});

// Reconciliation (basic totals)
router.get('/reconciliation', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const result = await pool.query(
            `SELECT COALESCE(SUM(amount_cents),0) as total_cents
             FROM finance_ledger_entries
             WHERE created_at >= $1 AND created_at <= $2`,
            [startDate || new Date(Date.now() - 86400000), endDate || new Date()]
        );
        res.json({ success: true, ledgerTotalCents: parseInt(result.rows[0].total_cents || 0, 10) });
    } catch (error) {
        console.error('Reconciliation error:', error);
        res.status(500).json({ error: 'Reconciliation failed' });
    }
});

// Reconciliation report with discrepancy flags
router.get('/reconciliation/report', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const from = startDate || new Date(Date.now() - 86400000);
        const to = endDate || new Date();

        const ledgerTotals = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN entry_type = 'charge' THEN amount_cents ELSE 0 END), 0) AS charges,
                COALESCE(SUM(CASE WHEN entry_type LIKE 'refund%' THEN amount_cents ELSE 0 END), 0) AS refunds,
                COALESCE(SUM(amount_cents), 0) AS net
             FROM finance_ledger_entries
             WHERE created_at >= $1 AND created_at <= $2`,
            [from, to]
        );

        const pendingRefunds = await pool.query(
            `SELECT id, stripe_payment_intent_id, amount_cents, status, reason_code, created_at
             FROM finance_refunds
             WHERE status NOT IN ('succeeded')
             ORDER BY created_at DESC`);

        res.json({
            success: true,
            ledger: ledgerTotals.rows[0],
            unresolvedRefunds: pendingRefunds.rows
        });
    } catch (error) {
        console.error('Reconciliation report error:', error);
        res.status(500).json({ error: 'Reconciliation report failed' });
    }
});

// Transaction-level reconciliation
router.get('/reconciliation/transactions', async (req, res) => {
    try {
        ensureStripeKey();
        const { startDate, endDate, limit = 100 } = req.query;

        const created = {};
        if (startDate) created.gte = Math.floor(new Date(startDate).getTime() / 1000);
        if (endDate) created.lte = Math.floor(new Date(endDate).getTime() / 1000);

        const stripeTx = await stripe.balanceTransactions.list({
            limit: parseInt(limit, 10),
            ...(Object.keys(created).length ? { created } : {})
        });

        const stripeSources = stripeTx.data
            .map(tx => tx.source)
            .filter(Boolean);

        let ledgerRows = [];
        if (stripeSources.length) {
            const result = await pool.query(
                `SELECT related_stripe_object, entry_type, amount_cents, created_at
                 FROM finance_ledger_entries
                 WHERE related_stripe_object = ANY($1::text[])`,
                [stripeSources]
            );
            ledgerRows = result.rows;
        }

        const ledgerSet = new Set(ledgerRows.map(r => r.related_stripe_object));
        const unmatchedStripe = stripeTx.data.filter(tx => tx.source && !ledgerSet.has(tx.source));

        const ledgerMissingStripe = ledgerRows.filter(r =>
            !stripeSources.includes(r.related_stripe_object)
        );

        res.json({
            success: true,
            unmatchedStripe,
            ledgerMissingStripe,
            stripeCount: stripeTx.data.length,
            ledgerMatchedCount: ledgerRows.length
        });
    } catch (error) {
        console.error('Transaction reconciliation error:', error);
        res.status(500).json({ error: 'Transaction reconciliation failed' });
    }
});

// Transaction-level reconciliation CSV export
router.get('/reconciliation/transactions/export', async (req, res) => {
    try {
        ensureStripeKey();
        const { startDate, endDate, limit = 100 } = req.query;

        const created = {};
        if (startDate) created.gte = Math.floor(new Date(startDate).getTime() / 1000);
        if (endDate) created.lte = Math.floor(new Date(endDate).getTime() / 1000);

        const stripeTx = await stripe.balanceTransactions.list({
            limit: parseInt(limit, 10),
            ...(Object.keys(created).length ? { created } : {})
        });

        const stripeSources = stripeTx.data
            .map(tx => tx.source)
            .filter(Boolean);

        let ledgerRows = [];
        if (stripeSources.length) {
            const result = await pool.query(
                `SELECT related_stripe_object, entry_type, amount_cents, created_at
                 FROM finance_ledger_entries
                 WHERE related_stripe_object = ANY($1::text[])`,
                [stripeSources]
            );
            ledgerRows = result.rows;
        }

        const ledgerSet = new Set(ledgerRows.map(r => r.related_stripe_object));
        const unmatchedStripe = stripeTx.data.filter(tx => tx.source && !ledgerSet.has(tx.source));

        const ledgerMissingStripe = ledgerRows.filter(r =>
            !stripeSources.includes(r.related_stripe_object)
        );

        const header = 'category,source,amount,currency,created_at\n';
        const rows = [
            ...unmatchedStripe.map(tx => `unmatched_stripe,${tx.source},${tx.amount},${tx.currency},${new Date(tx.created * 1000).toISOString()}`),
            ...ledgerMissingStripe.map(r => `ledger_missing_stripe,${r.related_stripe_object},${r.amount_cents},GBP,${new Date(r.created_at).toISOString()}`)
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="finance-reconciliation-transactions.csv"');
        res.send(header + rows);
    } catch (error) {
        console.error('Transaction reconciliation export error:', error);
        res.status(500).json({ error: 'Transaction reconciliation export failed' });
    }
});

async function buildPaymentReconciliationReport() {
    const payments = await pool.query(
        `SELECT id, amount, currency, stripe_payment_intent_id, stripe_charge_id, status, created_at
         FROM payments
         ORDER BY created_at DESC
         LIMIT 200`
    );

    const paymentIds = payments.rows.map(p => p.stripe_payment_intent_id).filter(Boolean);
    let ledger = [];
    if (paymentIds.length) {
        const ledgerRes = await pool.query(
            `SELECT related_stripe_object, SUM(amount_cents) AS ledger_total_cents
             FROM finance_ledger_entries
             WHERE related_stripe_object = ANY($1::text[])
             GROUP BY related_stripe_object`,
            [paymentIds]
        );
        ledger = ledgerRes.rows;
    }

    const ledgerMap = new Map(ledger.map(r => [r.related_stripe_object, parseInt(r.ledger_total_cents, 10)]));
    return payments.rows.map(p => {
        const ledgerTotal = ledgerMap.get(p.stripe_payment_intent_id) || 0;
        const paymentCents = Math.round(parseFloat(p.amount || 0) * 100);
        const delta = ledgerTotal - paymentCents;
        return {
            payment_id: p.id,
            stripe_payment_intent_id: p.stripe_payment_intent_id,
            payment_cents: paymentCents,
            ledger_total_cents: ledgerTotal,
            delta_cents: delta,
            status: p.status
        };
    }).filter(r => r.delta_cents !== 0);
}

// Payment-level reconciliation (ledger vs payments)
router.get('/reconciliation/payments', async (req, res) => {
    try {
        const mismatches = await buildPaymentReconciliationReport();
        res.json({ success: true, mismatches });
    } catch (error) {
        console.error('Payment reconciliation error:', error);
        res.status(500).json({ error: 'Payment reconciliation failed' });
    }
});

router.get('/reconciliation/payments/export', async (req, res) => {
    try {
        const mismatches = await buildPaymentReconciliationReport();

        const rows = mismatches.map(r => (
            `${r.payment_id},${r.stripe_payment_intent_id},${r.payment_cents},${r.ledger_total_cents},${r.delta_cents},${r.status}`
        )).join('\n');

        const header = 'payment_id,stripe_payment_intent_id,payment_cents,ledger_total_cents,delta_cents,status\n';
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="finance-reconciliation-payments.csv"');
        res.send(header + rows);
    } catch (error) {
        console.error('Payment reconciliation export error:', error);
        res.status(500).json({ error: 'Payment reconciliation export failed' });
    }
});

// Payment-level reconciliation
router.get('/reconciliation/payments', async (req, res) => {
    try {
        const paymentsResult = await pool.query(
            `SELECT id, stripe_payment_intent_id, stripe_charge_id, amount, currency, status, created_at
             FROM payments
             WHERE stripe_payment_intent_id IS NOT NULL OR stripe_charge_id IS NOT NULL
             ORDER BY created_at DESC`
        );

        const paymentRefs = paymentsResult.rows.flatMap(p => [p.stripe_payment_intent_id, p.stripe_charge_id]).filter(Boolean);

        let ledgerRows = [];
        if (paymentRefs.length) {
            const ledgerResult = await pool.query(
                `SELECT related_stripe_object, entry_type, amount_cents, created_at
                 FROM finance_ledger_entries
                 WHERE related_stripe_object = ANY($1::text[])`,
                [paymentRefs]
            );
            ledgerRows = ledgerResult.rows;
        }

        const ledgerSet = new Set(ledgerRows.map(r => r.related_stripe_object));
        const paymentsMissingLedger = paymentsResult.rows.filter(p => {
            const refs = [p.stripe_payment_intent_id, p.stripe_charge_id].filter(Boolean);
            return !refs.some(ref => ledgerSet.has(ref));
        });

        const ledgerOrphans = ledgerRows.filter(r => !paymentRefs.includes(r.related_stripe_object));

        res.json({
            success: true,
            paymentsMissingLedger,
            ledgerOrphans,
            paymentCount: paymentsResult.rows.length,
            ledgerMatchedCount: ledgerRows.length
        });
    } catch (error) {
        console.error('Payment reconciliation error:', error);
        res.status(500).json({ error: 'Payment reconciliation failed' });
    }
});

// Payment-level reconciliation CSV export
router.get('/reconciliation/payments/export', async (req, res) => {
    try {
        const paymentsResult = await pool.query(
            `SELECT id, stripe_payment_intent_id, stripe_charge_id, amount, currency, status, created_at
             FROM payments
             WHERE stripe_payment_intent_id IS NOT NULL OR stripe_charge_id IS NOT NULL
             ORDER BY created_at DESC`
        );

        const paymentRefs = paymentsResult.rows.flatMap(p => [p.stripe_payment_intent_id, p.stripe_charge_id]).filter(Boolean);

        let ledgerRows = [];
        if (paymentRefs.length) {
            const ledgerResult = await pool.query(
                `SELECT related_stripe_object, entry_type, amount_cents, created_at
                 FROM finance_ledger_entries
                 WHERE related_stripe_object = ANY($1::text[])`,
                [paymentRefs]
            );
            ledgerRows = ledgerResult.rows;
        }

        const ledgerSet = new Set(ledgerRows.map(r => r.related_stripe_object));
        const paymentsMissingLedger = paymentsResult.rows.filter(p => {
            const refs = [p.stripe_payment_intent_id, p.stripe_charge_id].filter(Boolean);
            return !refs.some(ref => ledgerSet.has(ref));
        });

        const ledgerOrphans = ledgerRows.filter(r => !paymentRefs.includes(r.related_stripe_object));

        const header = 'category,ref,payment_id,amount,currency,status,created_at\n';
        const rows = [
            ...paymentsMissingLedger.map(p => `payment_missing_ledger,${p.stripe_payment_intent_id || p.stripe_charge_id || ''},${p.id},${p.amount},${p.currency || 'GBP'},${p.status},${new Date(p.created_at).toISOString()}`),
            ...ledgerOrphans.map(r => `ledger_orphan,${r.related_stripe_object},,${r.amount_cents},GBP,,${new Date(r.created_at).toISOString()}`)
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="finance-reconciliation-payments.csv"');
        res.send(header + rows);
    } catch (error) {
        console.error('Payment reconciliation export error:', error);
        res.status(500).json({ error: 'Payment reconciliation export failed' });
    }
});

// Stripe reconciliation totals
router.get('/reconciliation/stripe', async (req, res) => {
    try {
        ensureStripeKey();
        const { limit = 100 } = req.query;
        const transactions = await stripe.balanceTransactions.list({ limit: parseInt(limit, 10) });
        const totals = transactions.data.reduce((acc, t) => {
            acc.total += t.amount || 0;
            if (t.type === 'refund') acc.refunds += t.amount || 0;
            if (t.type === 'charge') acc.charges += t.amount || 0;
            if (t.type === 'chargeback') acc.chargebacks += t.amount || 0;
            return acc;
        }, { total: 0, charges: 0, refunds: 0, chargebacks: 0 });
        res.json({ success: true, stripeTotals: totals });
    } catch (error) {
        console.error('Stripe reconciliation error:', error);
        res.status(500).json({ error: 'Stripe reconciliation failed' });
    }
});

// ============================================================
// STRIPE READ-ONLY DATA
// ============================================================

// List Stripe payment intents (read-only)
router.get('/stripe/payments', async (req, res) => {
    try {
        ensureStripeKey();
        const { limit = 50 } = req.query;
        const payments = await stripe.paymentIntents.list({ limit: parseInt(limit, 10) });
        const data = payments.data.map((item) => ({
            id: item.id,
            amount: item.amount,
            currency: item.currency,
            status: item.status,
            created: item.created,
            customer: item.customer || null,
            description: item.description || null
        }));
        res.json({ success: true, payments: data });
    } catch (error) {
        console.error('Stripe payments error:', error);
        res.status(500).json({ error: 'Stripe payments fetch failed' });
    }
});

// List Stripe subscriptions (read-only)
router.get('/stripe/subscriptions', async (req, res) => {
    try {
        ensureStripeKey();
        const { limit = 50 } = req.query;
        const subscriptions = await stripe.subscriptions.list({ limit: parseInt(limit, 10) });
        const data = subscriptions.data.map((item) => ({
            id: item.id,
            status: item.status,
            customer: item.customer || null,
            current_period_start: item.current_period_start,
            current_period_end: item.current_period_end,
            created: item.created
        }));
        res.json({ success: true, subscriptions: data });
    } catch (error) {
        console.error('Stripe subscriptions error:', error);
        res.status(500).json({ error: 'Stripe subscriptions fetch failed' });
    }
});

// List Stripe refunds (read-only)
router.get('/stripe/refunds', async (req, res) => {
    try {
        ensureStripeKey();
        const { limit = 50 } = req.query;
        const refunds = await stripe.refunds.list({ limit: parseInt(limit, 10) });
        const data = refunds.data.map((item) => ({
            id: item.id,
            amount: item.amount,
            currency: item.currency,
            status: item.status,
            payment_intent: item.payment_intent || null,
            created: item.created
        }));
        res.json({ success: true, refunds: data });
    } catch (error) {
        console.error('Stripe refunds error:', error);
        res.status(500).json({ error: 'Stripe refunds fetch failed' });
    }
});

// Export reconciliation as CSV (ledger)
router.get('/reconciliation/export', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const result = await pool.query(
            `SELECT id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_at
             FROM finance_ledger_entries
             WHERE created_at >= $1 AND created_at <= $2
             ORDER BY created_at DESC`,
            [startDate || new Date(Date.now() - 86400000), endDate || new Date()]
        );

        const header = 'id,related_stripe_object,user_id,amount_cents,currency,entry_type,reason_code,created_at\n';
        const rows = result.rows.map(r => (
            `${r.id},${r.related_stripe_object || ''},${r.user_id || ''},${r.amount_cents},${r.currency},${r.entry_type},${r.reason_code || ''},${new Date(r.created_at).toISOString()}`
        )).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="finance-ledger.csv"');
        res.send(header + rows);
    } catch (error) {
        console.error('Reconciliation export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Expire vendor credits and write ledger entries
router.post(
    '/credits/expire',
    adminAudit({
        action: 'finance_credit_expired',
        targetType: 'credit_lot',
        getTargetId: () => null,
        getDetails: (req, res) => ({
            expiredCount: res.locals.expiredCount || 0
        })
    }),
    async (req, res) => {
    try {
        const now = new Date();
        const result = await pool.query(
            `SELECT * FROM finance_credit_lots
             WHERE expires_at IS NOT NULL AND expires_at <= $1 AND remaining_cents > 0`,
            [now]
        );

        for (const lot of result.rows) {
            await pool.query(
                `UPDATE finance_credit_lots SET remaining_cents = 0 WHERE id = $1`,
                [lot.id]
            );

            await createLedgerEntry({
                userId: lot.vendor_id,
                amountCents: -lot.remaining_cents,
                currency: lot.currency,
                entryType: 'credit_expired',
                reasonCode: lot.origin,
                createdBy: req.user.userId,
                metadata: { creditLotId: lot.id }
            });
        }

        res.locals.expiredCount = result.rows.length;
        res.json({ success: true, expiredCount: result.rows.length });
    } catch (error) {
        console.error('Credit expiry error:', error);
        res.status(500).json({ error: 'Credit expiry failed' });
    }
});

module.exports = router;
