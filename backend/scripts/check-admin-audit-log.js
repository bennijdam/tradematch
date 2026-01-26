require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const res = await client.query("SELECT to_regclass('public.admin_audit_log') AS tbl");
    console.log(res.rows[0]);
    await client.end();
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
