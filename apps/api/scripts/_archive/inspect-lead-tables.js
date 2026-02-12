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

    const tables = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name LIKE 'lead_%'
         ORDER BY table_name`
    );

    for (const row of tables.rows) {
        const table = row.table_name;
        const cols = await pool.query(
            `SELECT column_name, data_type
             FROM information_schema.columns
             WHERE table_name = $1
             ORDER BY ordinal_position`,
            [table]
        );
        console.log(table, cols.rows);
    }

    await pool.end();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
