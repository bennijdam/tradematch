async function recoverVendorScores(pool) {
    // +1 point per 30 days without negative events
    const result = await pool.query(
        `WITH last_negative AS (
            SELECT vendor_id, MAX(created_at) AS last_negative_at
            FROM finance_score_events
            WHERE delta < 0
            GROUP BY vendor_id
        )
        SELECT v.vendor_id, v.score, ln.last_negative_at
        FROM finance_vendor_scores v
        LEFT JOIN last_negative ln ON v.vendor_id = ln.vendor_id
        WHERE v.score < 100`
    );

    for (const row of result.rows) {
        if (!row.last_negative_at) continue;
        const days = (Date.now() - new Date(row.last_negative_at).getTime()) / (1000 * 60 * 60 * 24);
        const increment = Math.floor(days / 30);
        if (increment <= 0) continue;

        const delta = Math.min(increment, 100 - row.score);
        await pool.query(
            `UPDATE finance_vendor_scores
             SET score = score + $1, updated_at = CURRENT_TIMESTAMP
             WHERE vendor_id = $2`,
            [delta, row.vendor_id]
        );

        await pool.query(
            `INSERT INTO finance_score_events (id, vendor_id, delta, reason)
             VALUES ($1, $2, $3, $4)`,
            [require('crypto').randomUUID(), row.vendor_id, delta, 'score_recovery']
        );
    }
}

function startVendorScoreRecoveryJob(pool, intervalMs = 24 * 60 * 60 * 1000) {
    const enabled = process.env.ENABLE_SCORE_RECOVERY_JOB !== 'false';
    if (!enabled) return;

    const run = async () => {
        try {
            await recoverVendorScores(pool);
        } catch (error) {
            console.error('Vendor score recovery job error:', error.message);
        }
    };

    run();
    setInterval(run, intervalMs);
}

module.exports = {
    startVendorScoreRecoveryJob,
    recoverVendorScores
};