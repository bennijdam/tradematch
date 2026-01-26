const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require') ? true : false
});

(async () => {
    try {
        console.log('[MIGRATION] Adding retry columns to notification_queue...');
        
        await pool.query(`
            ALTER TABLE notification_queue
                ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 5,
                ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS last_error TEXT
        `);
        console.log('✅ Columns added.');

        console.log('[MIGRATION] Updating status constraint...');
        await pool.query(`
            ALTER TABLE notification_queue DROP CONSTRAINT IF EXISTS notification_queue_status_check
        `);
        await pool.query(`
            ALTER TABLE notification_queue
                ADD CONSTRAINT notification_queue_status_check
                CHECK (status IN ('pending', 'sent', 'failed', 'suppressed', 'dead_letter'))
        `);
        console.log('✅ Constraint updated.');

        console.log('[MIGRATION] Creating index...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notification_queue_next_attempt
            ON notification_queue(next_attempt_at)
        `);
        console.log('✅ Index created.');

        console.log('[MIGRATION] Backfilling next_attempt_at...');
        const result = await pool.query(`
            UPDATE notification_queue
            SET next_attempt_at = COALESCE(next_attempt_at, created_at)
            WHERE next_attempt_at IS NULL
        `);
        console.log(`✅ Backfilled ${result.rowCount} rows.`);

        await pool.end();
        console.log('✅ Migration complete.');
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    }
})();
