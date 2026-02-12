require('dotenv').config();
const { Client } = require('pg');

(async () => {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    const res = await client.query(
        "SELECT id, email, password_hash, length(password_hash) AS hash_len FROM users WHERE email = 'admin@tradematch.com'"
    );
    console.log(res.rows[0]);
    await client.end();
})().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
