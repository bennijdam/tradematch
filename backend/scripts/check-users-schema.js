require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const res = await client.query(
        "SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log(res.rows);
    await client.end();
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
