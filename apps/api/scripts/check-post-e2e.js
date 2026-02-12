const dotenv = require('dotenv');
const { Pool } = require('pg');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function sanitizeDatabaseUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        const url = new URL(rawUrl);
        url.searchParams.delete('channel_binding');
        if (url.hostname.includes('-pooler')) {
            url.hostname = url.hostname.replace('-pooler', '');
        }
        return url.toString();
    } catch (error) {
        return rawUrl;
    }
}

async function main() {
    const pool = new Pool({ connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL) });

    const latestAcceptance = await pool.query(
        `SELECT * FROM lead_acceptance_log ORDER BY created_at DESC LIMIT 1`
    );

    if (latestAcceptance.rows.length === 0) {
        console.log({ ok: false, message: 'No lead_acceptance_log rows found.' });
        await pool.end();
        return;
    }

    const acceptance = latestAcceptance.rows[0];

    const distribution = await pool.query(
        `SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2`,
        [acceptance.quote_id, acceptance.vendor_id]
    );

    const credits = await pool.query(
        `SELECT * FROM vendor_credit_summary WHERE vendor_id = $1`,
        [acceptance.vendor_id]
    );

    let ledger = null;
    try {
        const ledgerRes = await pool.query(
            `SELECT * FROM finance_ledger_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
            [acceptance.vendor_id]
        );
        ledger = ledgerRes.rows;
    } catch (error) {
        ledger = { error: error.message };
    }

    console.log({
        ok: true,
        acceptance: {
            quote_id: acceptance.quote_id,
            vendor_id: acceptance.vendor_id,
            action: acceptance.action,
            payment_amount: acceptance.payment_amount,
            payment_success: acceptance.payment_success,
            created_at: acceptance.created_at
        },
        distribution: distribution.rows[0] || null,
        vendorCredits: credits.rows[0] || null,
        financeLedgerRecent: ledger
    });

    await pool.end();
}

main().catch((error) => {
    console.error('Post-e2e check failed:', error);
    process.exitCode = 1;
});
