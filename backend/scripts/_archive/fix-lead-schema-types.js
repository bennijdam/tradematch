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

const baseTargets = [
    { table: 'lead_distributions', column: 'quote_id' },
    { table: 'lead_distributions', column: 'vendor_id' },
    { table: 'lead_acceptance_log', column: 'quote_id' },
    { table: 'lead_acceptance_log', column: 'vendor_id' },
    { table: 'vendor_credits', column: 'vendor_id' },
    { table: 'vendor_spend_limits', column: 'vendor_id' },
    { table: 'credit_purchases', column: 'vendor_id' }
];

async function main() {
    const pool = new Pool({ connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL) });

    await pool.query('DROP VIEW IF EXISTS vendor_credit_summary');

    const autoTargetsResult = await pool.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('integer', 'bigint')
          AND column_name IN ('quote_id', 'vendor_id', 'customer_id', 'user_id')
          AND (
            table_name LIKE 'lead_%'
            OR table_name LIKE 'vendor_%'
            OR table_name LIKE 'credit_%'
          )
    `);

    const autoTargets = autoTargetsResult.rows.map((row) => ({
        table: row.table_name,
        column: row.column_name,
        dataType: row.data_type
    }));

    const combinedTargets = [...baseTargets, ...autoTargets];
    const seen = new Set();

    for (const target of combinedTargets) {
        const key = `${target.table}.${target.column}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const res = await pool.query(
            `SELECT data_type FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
            [target.table, target.column]
        );

        if (res.rows.length === 0) {
            console.log(`- Skipped ${target.table}.${target.column} (column not found)`);
            continue;
        }

        const dataType = res.rows[0].data_type;
        if (dataType === 'character varying' || dataType === 'text') {
            console.log(`- OK ${target.table}.${target.column} already ${dataType}`);
            continue;
        }

        console.log(`- Altering ${target.table}.${target.column} from ${dataType} to varchar(50)`);
        await pool.query(`ALTER TABLE ${target.table} ALTER COLUMN ${target.column} TYPE varchar(50) USING ${target.column}::varchar`);
    }

    await pool.query(`
        CREATE OR REPLACE VIEW vendor_credit_summary AS
        SELECT
            vc.vendor_id,
            vc.available_credits AS current_balance,
            vc.total_purchased_credits AS total_purchased,
            vc.total_spent_credits AS total_spent,
            NULL::numeric AS total_refunded,
            (SELECT MAX(created_at) FROM credit_purchases WHERE vendor_id = vc.vendor_id) AS last_purchase_date,
            (SELECT COUNT(*) FROM lead_distributions WHERE vendor_id = vc.vendor_id) AS total_leads_accessed
        FROM vendor_credits vc
    `);

    await pool.end();
    console.log('✅ Lead schema types updated');
}

main().catch((error) => {
    console.error('Schema fix failed:', error);
    process.exitCode = 1;
});
