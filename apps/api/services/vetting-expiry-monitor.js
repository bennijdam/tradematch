/**
 * apps/api/services/vetting-expiry-monitor.js
 *
 * Daily cron job (06:00 UTC) that:
 *  1. Finds insurance / trade-registration records expiring in 30, 14 or 7 days
 *     and sends a warning email to the vendor (deduped — only one email per window).
 *  2. Marks records that have already expired and downgrades the vendor's
 *     overall_vetting_status to 'suspended' if they lose their verified status.
 *  3. Recomputes vetting_score for all affected vendors.
 *
 * Usage (called from server.js after pool is ready):
 *   const { startVettingExpiryMonitor } = require('./services/vetting-expiry-monitor');
 *   startVettingExpiryMonitor(pool);
 */

'use strict';

const {
    sendExpiryWarning,
    sendDocumentExpired
} = require('./vetting-emails');

const WARNING_WINDOWS = [30, 14, 7]; // days before expiry

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(d, n) {
    const r = new Date(d);
    r.setUTCDate(r.getUTCDate() + n);
    return r;
}

function formatDate(d) {
    return new Date(d).toISOString().split('T')[0];
}

function labelFor(table, row) {
    if (table === 'vendor_insurance') {
        const map = {
            public_liability:       'Public Liability Insurance',
            employers_liability:    'Employers\' Liability Insurance',
            professional_indemnity: 'Professional Indemnity Insurance',
            tools_equipment:        'Tools & Equipment Insurance'
        };
        return map[row.insurance_type] || 'Insurance Document';
    }
    const map = {
        gas_safe:    'Gas Safe Registration',
        niceic:      'NICEIC Registration',
        napit:       'NAPIT Registration',
        fgas:        'F-Gas Registration',
        oftec:       'OFTEC Registration',
        checkatrade: 'Checkatrade Membership',
        trustmark:   'TrustMark Registration',
        other:       'Trade Registration'
    };
    return map[row.registration_type] || 'Trade Registration';
}

// ─── Core job logic ───────────────────────────────────────────────────────────

async function runExpiryMonitor(pool) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    console.log(`[vetting-expiry] Running at ${today.toISOString()}`);

    let warningsSent = 0;
    let expiryActions = 0;

    // ── 1. Send expiry warnings ──────────────────────────────────────────────

    for (const daysLeft of WARNING_WINDOWS) {
        const targetDate = formatDate(addDays(today, daysLeft));

        // Insurance
        const insRows = await pool.query(`
            SELECT vi.*, v.email, v.business_name AS name, v.id AS vendor_id
              FROM vendor_insurance vi
              JOIN vendors v ON v.id = vi.vendor_id
             WHERE vi.expires_at::date = $1
               AND vi.status = 'verified'
        `, [targetDate]);

        for (const row of insRows.rows) {
            const label = labelFor('vendor_insurance', row);
            await sendExpiryWarning(
                { id: row.vendor_id, email: row.email, name: row.name },
                label,
                row.expires_at,
                daysLeft
            );
            await pool.query(`
                INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, notes)
                VALUES ($1, 'expiry_warning_sent', 'system', 'vendor_insurance', $2, $3)
            `, [row.vendor_id, row.id, `${daysLeft}-day warning: ${label}`]);
            warningsSent++;
        }

        // Trade registrations
        const tradeRows = await pool.query(`
            SELECT vtr.*, v.email, v.business_name AS name, v.id AS vendor_id
              FROM vendor_trade_registrations vtr
              JOIN vendors v ON v.id = vtr.vendor_id
             WHERE vtr.expires_at::date = $1
               AND vtr.status IN ('verified', 'api_verified')
        `, [targetDate]);

        for (const row of tradeRows.rows) {
            const label = labelFor('vendor_trade_registrations', row);
            await sendExpiryWarning(
                { id: row.vendor_id, email: row.email, name: row.name },
                label,
                row.expires_at,
                daysLeft
            );
            await pool.query(`
                INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, notes)
                VALUES ($1, 'expiry_warning_sent', 'system', 'vendor_trade_registrations', $2, $3)
            `, [row.vendor_id, row.id, `${daysLeft}-day warning: ${label}`]);
            warningsSent++;
        }
    }

    // ── 2. Mark expired records ──────────────────────────────────────────────

    const todayStr = formatDate(today);

    // Insurance expired today
    const expiredIns = await pool.query(`
        UPDATE vendor_insurance
           SET status = 'expired', updated_at = NOW()
         WHERE expires_at::date < $1
           AND status = 'verified'
         RETURNING *, vendor_id
    `, [todayStr]);

    for (const row of expiredIns.rows) {
        const vendor = await pool.query(
            'SELECT id, email, business_name AS name FROM vendors WHERE id = $1',
            [row.vendor_id]
        );
        if (vendor.rows[0]) {
            const label = labelFor('vendor_insurance', row);
            await sendDocumentExpired(vendor.rows[0], label);
            await pool.query(`
                INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, notes)
                VALUES ($1, 'document_expired', 'system', 'vendor_insurance', $2, $3)
            `, [row.vendor_id, row.id, `${label} expired`]);
        }
        expiryActions++;
    }

    // Trade registrations expired today
    const expiredTrade = await pool.query(`
        UPDATE vendor_trade_registrations
           SET status = 'expired', updated_at = NOW()
         WHERE expires_at IS NOT NULL
           AND expires_at::date < $1
           AND status IN ('verified', 'api_verified')
         RETURNING *, vendor_id
    `, [todayStr]);

    for (const row of expiredTrade.rows) {
        const vendor = await pool.query(
            'SELECT id, email, business_name AS name FROM vendors WHERE id = $1',
            [row.vendor_id]
        );
        if (vendor.rows[0]) {
            const label = labelFor('vendor_trade_registrations', row);
            await sendDocumentExpired(vendor.rows[0], label);
            await pool.query(`
                INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, notes)
                VALUES ($1, 'document_expired', 'system', 'vendor_trade_registrations', $2, $3)
            `, [row.vendor_id, row.id, `${label} expired`]);
        }
        expiryActions++;
    }

    // ── 3. Recompute vetting scores for affected vendors ─────────────────────

    const affectedVendorIds = [
        ...expiredIns.rows.map((r) => r.vendor_id),
        ...expiredTrade.rows.map((r) => r.vendor_id)
    ];
    const uniqueIds = [...new Set(affectedVendorIds)];

    for (const vendorId of uniqueIds) {
        await pool.query('SELECT recompute_vetting_score($1)', [vendorId]);

        // Downgrade status if score dropped below 60 (lost a key doc)
        const { rows } = await pool.query(
            'SELECT vetting_score, overall_vetting_status FROM vendors WHERE id = $1',
            [vendorId]
        );
        if (rows[0] && rows[0].vetting_score < 60 && rows[0].overall_vetting_status === 'verified') {
            await pool.query(`
                UPDATE vendors
                   SET overall_vetting_status = 'suspended',
                       updated_at = NOW()
                 WHERE id = $1
            `, [vendorId]);
            await pool.query(`
                INSERT INTO vetting_audit_log (vendor_id, action, actor, target_table, target_id, notes)
                VALUES ($1, 'status_changed', 'system', 'vendors', $1, 'Status changed to suspended due to expired documents')
            `, [vendorId]);
        }
    }

    console.log(`[vetting-expiry] Done — warnings sent: ${warningsSent}, expiry actions: ${expiryActions}, vendors rescored: ${uniqueIds.length}`);
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

function startVettingExpiryMonitor(pool) {
    if (process.env.ENABLE_VETTING_EXPIRY_JOB === 'false') {
        console.log('[vetting-expiry] Job disabled via ENABLE_VETTING_EXPIRY_JOB=false');
        return;
    }

    function msUntil6amUTC() {
        const now = new Date();
        const next = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + (now.getUTCHours() >= 6 ? 1 : 0),
            6, 0, 0, 0
        ));
        return next.getTime() - now.getTime();
    }

    function scheduleNext() {
        const delay = msUntil6amUTC();
        console.log(`[vetting-expiry] Next run in ${Math.round(delay / 60000)} minutes`);
        setTimeout(async () => {
            try { await runExpiryMonitor(pool); }
            catch (err) { console.error('[vetting-expiry] Job error:', err); }
            scheduleNext();
        }, delay);
    }

    scheduleNext();
}

module.exports = { startVettingExpiryMonitor, runExpiryMonitor };
