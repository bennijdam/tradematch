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
    const res = await pool.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = 'vendor_lead_preferences'
         ORDER BY ordinal_position`
    );
    console.log(res.rows);
    await pool.end();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
