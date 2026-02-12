require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const table = await client.query("SELECT to_regclass('public.job_reviews') AS tbl");
    const cols = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'job_reviews' ORDER BY ordinal_position"
    );
    console.log({ table: table.rows[0].tbl, columns: cols.rows.map(r => r.column_name) });
    await client.end();
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
