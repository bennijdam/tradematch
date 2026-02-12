#!/usr/bin/env node

/**
 * Cleanup for admin permission smoke test data.
 * - Removes test users, jobs, reviews, finance records, and audit entries.
 */

const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const RUN_ID = 'perm_smoke_20260207';
const TEST_EMAILS = [
    'superadmin+perm@tradematch.local',
    'support+perm@tradematch.local',
    'trust+perm@tradematch.local',
    'finance+perm@tradematch.local',
    'readonly+perm@tradematch.local',
    'perm-test-customer@tradematch.local',
    'perm-test-vendor-approve@tradematch.local',
    'perm-test-vendor-reject@tradematch.local',
    'perm-test-vendor-blocked@tradematch.local'
];

async function tableExists(client, tableName) {
    const result = await client.query('SELECT to_regclass($1) as table_name', [tableName]);
    return Boolean(result.rows[0] && result.rows[0].table_name);
}

async function run() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();

    const userIdsResult = await client.query(
        'SELECT id FROM users WHERE email = ANY($1::text[])',
        [TEST_EMAILS]
    );
    const userIds = userIdsResult.rows.map(row => row.id);

    const financeLedgerExists = await tableExists(client, 'finance_ledger_entries');
    const financeCreditsExists = await tableExists(client, 'finance_credit_lots');
    const financeUsageExists = await tableExists(client, 'finance_credit_usage');
    const auditExists = await tableExists(client, 'admin_audit_log');
    const jobsExists = await tableExists(client, 'jobs');
    const reviewsExists = await tableExists(client, 'job_reviews');

    const userIdTexts = userIds.map((id) => String(id));

    if (financeUsageExists && userIdTexts.length) {
        await client.query(
            `DELETE FROM finance_credit_usage
             WHERE vendor_id::text = ANY($1::text[])`,
            [userIdTexts]
        );
    }

    if (financeCreditsExists && userIdTexts.length) {
        await client.query(
            `DELETE FROM finance_credit_lots
             WHERE vendor_id::text = ANY($1::text[]) OR memo = $2`,
            [userIdTexts, RUN_ID]
        );
    }

    if (financeLedgerExists) {
        await client.query(
            `DELETE FROM finance_ledger_entries
             WHERE metadata::text ILIKE $1`,
            [`%${RUN_ID}%`]
        );
    }

    if (auditExists) {
        await client.query(
            `DELETE FROM admin_audit_log
             WHERE details::text ILIKE $1`,
            [`%${RUN_ID}%`]
        );
    }

    if (reviewsExists) {
        await client.query(
            `DELETE FROM job_reviews
             WHERE feedback ILIKE $1`,
            ['%Permission smoke test review%']
        );
    }

    if (jobsExists) {
        await client.query(
            `DELETE FROM jobs
             WHERE description ILIKE $1`,
            ['%Permission smoke test job%']
        );
    }

    if (userIdTexts.length) {
        await client.query('DELETE FROM users WHERE id::text = ANY($1::text[])', [userIdTexts]);
    }

    await client.end();
    console.log('Cleanup complete.');
}

run().catch((error) => {
    console.error('Cleanup failed:', error.message);
    process.exit(1);
});
