/**
 * Apply finance schema tables required by background jobs.
 */

require('dotenv').config();
const { Client } = require('pg');

async function applyFinanceSchema() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();
    console.log('🔧 Applying finance schema...');

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_ledger_entries (
                id UUID PRIMARY KEY,
                related_stripe_object VARCHAR(100),
                user_id VARCHAR(50),
                amount_cents BIGINT NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
                entry_type VARCHAR(40) NOT NULL,
                reason_code VARCHAR(60),
                created_by VARCHAR(50),
                idempotency_key VARCHAR(100),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS finance_ledger_entries_user_id_idx ON finance_ledger_entries(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS finance_ledger_entries_stripe_obj_idx ON finance_ledger_entries(related_stripe_object);`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_refunds (
                id UUID PRIMARY KEY,
                payment_id VARCHAR(50),
                stripe_payment_intent_id VARCHAR(100),
                stripe_refund_id VARCHAR(100),
                amount_cents BIGINT NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reason_code VARCHAR(60) NOT NULL,
                requested_by VARCHAR(50) NOT NULL,
                approved_by VARCHAR(50),
                approved_at TIMESTAMP,
                memo TEXT,
                idempotency_key VARCHAR(100),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_credit_lots (
                id UUID PRIMARY KEY,
                vendor_id VARCHAR(50) NOT NULL,
                amount_cents BIGINT NOT NULL,
                remaining_cents BIGINT NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
                origin VARCHAR(40) NOT NULL,
                expires_at TIMESTAMP,
                created_by VARCHAR(50) NOT NULL,
                memo TEXT,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_credit_usage (
                id UUID PRIMARY KEY,
                credit_lot_id UUID NOT NULL REFERENCES finance_credit_lots(id) ON DELETE CASCADE,
                vendor_id VARCHAR(50) NOT NULL,
                amount_cents BIGINT NOT NULL,
                used_for VARCHAR(80),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_vendor_scores (
                vendor_id VARCHAR(50) PRIMARY KEY,
                score INTEGER NOT NULL DEFAULT 100,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS finance_score_events (
                id UUID PRIMARY KEY,
                vendor_id VARCHAR(50) NOT NULL,
                delta INTEGER NOT NULL,
                reason VARCHAR(80) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Finance schema applied successfully');
    } catch (error) {
        console.error('❌ Finance schema failed:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

applyFinanceSchema()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
