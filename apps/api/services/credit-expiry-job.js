const crypto = require('crypto');

async function createLedgerEntry(pool, {
    userId,
    amountCents,
    currency = 'GBP',
    entryType,
    reasonCode,
    metadata = {}
}) {
    const id = crypto.randomUUID();
    await pool.query(
        `INSERT INTO finance_ledger_entries
            (id, related_stripe_object, user_id, amount_cents, currency, entry_type, reason_code, created_by, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, null, userId, amountCents, currency, entryType, reasonCode, 'system', JSON.stringify(metadata)]
    );
}

async function expireCredits(pool) {
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

        await createLedgerEntry(pool, {
            userId: lot.vendor_id,
            amountCents: -lot.remaining_cents,
            currency: lot.currency,
            entryType: 'credit_expired',
            reasonCode: lot.origin,
            metadata: { creditLotId: lot.id }
        });
    }

    return result.rows.length;
}

function startCreditExpiryJob(pool, intervalMs = 24 * 60 * 60 * 1000) {
    const enabled = process.env.ENABLE_CREDIT_EXPIRY_JOB !== 'false';
    if (!enabled) return;

    const run = async () => {
        try {
            const count = await expireCredits(pool);
            if (count > 0) {
                console.log(`🧾 Credit expiry job completed: ${count} lot(s) expired`);
            }
        } catch (error) {
            console.error('Credit expiry job error:', error.message);
        }
    };

    run();
    setInterval(run, intervalMs);
}

module.exports = {
    startCreditExpiryJob,
    expireCredits
};