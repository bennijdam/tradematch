#!/usr/bin/env node

/**
 * Admin permissions smoke test
 * - Creates/updates admin users for each role
 * - Creates minimal test data for user/vendor/review actions
 * - Calls write endpoints with each role and records results
 * - Summarizes audit log entries for this run
 */

const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';
const RUN_ID = 'perm_smoke_20260207';
const ADMIN_PASSWORD = 'RolePass123!';

const roles = [
    { role: 'super_admin', email: 'superadmin+perm@tradematch.local', name: 'Perm Super Admin' },
    { role: 'support_admin', email: 'support+perm@tradematch.local', name: 'Perm Support Admin' },
    { role: 'trust_safety_admin', email: 'trust+perm@tradematch.local', name: 'Perm Trust Admin' },
    { role: 'finance_admin', email: 'finance+perm@tradematch.local', name: 'Perm Finance Admin' },
    { role: 'read_only_admin', email: 'readonly+perm@tradematch.local', name: 'Perm Readonly Admin' }
];

const testUsers = {
    customer: {
        email: 'perm-test-customer@tradematch.local',
        name: 'Perm Test Customer',
        role: 'customer',
        userType: 'customer',
        status: 'active'
    },
    vendorApprove: {
        email: 'perm-test-vendor-approve@tradematch.local',
        name: 'Perm Test Vendor Approve',
        role: 'vendor',
        userType: 'vendor',
        status: 'pending'
    },
    vendorReject: {
        email: 'perm-test-vendor-reject@tradematch.local',
        name: 'Perm Test Vendor Reject',
        role: 'vendor',
        userType: 'vendor',
        status: 'pending'
    },
    vendorBlocked: {
        email: 'perm-test-vendor-blocked@tradematch.local',
        name: 'Perm Test Vendor Blocked',
        role: 'vendor',
        userType: 'vendor',
        status: 'pending'
    }
};

async function assertEnv() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL not configured');
    }
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
    }
}

async function upsertUser(client, { email, role, userType, status, name, passwordHash }) {
    const id = crypto.randomUUID();
    const result = await client.query(
        `INSERT INTO users (id, email, password_hash, full_name, name, role, user_type, status, email_verified, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,NOW())
         ON CONFLICT (email)
         DO UPDATE SET
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            name = EXCLUDED.name,
            role = EXCLUDED.role,
            user_type = EXCLUDED.user_type,
            status = EXCLUDED.status
         RETURNING id`,
        [id, email, passwordHash, name, name, role, userType, status]
    );
    return result.rows[0].id;
}

async function ensureJobReview(client, { jobId, reviewId, customerId, vendorId, title }) {
    await client.query(
        `INSERT INTO jobs (id, customer_id, title, description, trade_category, postcode, budget_min, budget_max, timeframe, status, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$2,$2)
         ON CONFLICT (id) DO NOTHING`,
        [
            jobId,
            customerId,
            title,
            'Permission smoke test job',
            'general',
            'AB12CD',
            100,
            250,
            'flexible',
            'live'
        ]
    );

    await client.query(
        `INSERT INTO job_reviews (id, job_id, customer_id, vendor_id, rating, feedback)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (job_id, customer_id) DO NOTHING`,
        [reviewId, jobId, customerId, vendorId, 4, 'Permission smoke test review']
    );
}

async function login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
    }
    return body.token;
}

async function requestWithToken(token, method, path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: payload ? JSON.stringify(payload) : undefined
    });

    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
}

async function tableExists(client, tableName) {
    const result = await client.query('SELECT to_regclass($1) as table_name', [tableName]);
    return Boolean(result.rows[0] && result.rows[0].table_name);
}

async function ensureRoleConstraint(client) {
    try {
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        await client.query(
            `ALTER TABLE users
             ADD CONSTRAINT users_role_check
             CHECK (role IN (
                'customer',
                'vendor',
                'admin',
                'super_admin',
                'finance_admin',
                'trust_safety_admin',
                'support_admin',
                'read_only_admin'
             ))`
        );
    } catch (error) {
        console.warn(`Role constraint update skipped: ${error.message}`);
    }
}

async function ensureStatusConstraint(client) {
    try {
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');
        await client.query(
            `ALTER TABLE users
             ADD CONSTRAINT users_status_check
             CHECK (status IN ('active', 'pending', 'suspended', 'banned', 'rejected'))`
        );
    } catch (error) {
        console.warn(`Status constraint update skipped: ${error.message}`);
    }
}

async function run() {
    await assertEnv();

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await client.connect();

    await ensureRoleConstraint(client);
    await ensureStatusConstraint(client);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const userPasswordHash = await bcrypt.hash('UserPass123!', 10);

    const adminIds = {};
    for (const entry of roles) {
        adminIds[entry.role] = await upsertUser(client, {
            email: entry.email,
            role: entry.role,
            userType: 'customer',
            status: 'active',
            name: entry.name,
            passwordHash
        });
    }

    const customerId = await upsertUser(client, {
        email: testUsers.customer.email,
        role: testUsers.customer.role,
        userType: testUsers.customer.userType,
        status: testUsers.customer.status,
        name: testUsers.customer.name,
        passwordHash: userPasswordHash
    });

    const vendorApproveId = await upsertUser(client, {
        email: testUsers.vendorApprove.email,
        role: testUsers.vendorApprove.role,
        userType: testUsers.vendorApprove.userType,
        status: testUsers.vendorApprove.status,
        name: testUsers.vendorApprove.name,
        passwordHash: userPasswordHash
    });

    const vendorRejectId = await upsertUser(client, {
        email: testUsers.vendorReject.email,
        role: testUsers.vendorReject.role,
        userType: testUsers.vendorReject.userType,
        status: testUsers.vendorReject.status,
        name: testUsers.vendorReject.name,
        passwordHash: userPasswordHash
    });

    const vendorBlockedId = await upsertUser(client, {
        email: testUsers.vendorBlocked.email,
        role: testUsers.vendorBlocked.role,
        userType: testUsers.vendorBlocked.userType,
        status: testUsers.vendorBlocked.status,
        name: testUsers.vendorBlocked.name,
        passwordHash: userPasswordHash
    });

    const reviewData = [
        { reviewId: crypto.randomUUID(), jobId: crypto.randomUUID(), title: 'Perm Review A' },
        { reviewId: crypto.randomUUID(), jobId: crypto.randomUUID(), title: 'Perm Review B' },
        { reviewId: crypto.randomUUID(), jobId: crypto.randomUUID(), title: 'Perm Review C' }
    ];

    for (const entry of reviewData) {
        await ensureJobReview(client, {
            jobId: entry.jobId,
            reviewId: entry.reviewId,
            customerId,
            vendorId: vendorApproveId,
            title: entry.title
        });
    }

    await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', customerId]);

    const results = [];

    async function expectStatus(label, role, status, expected) {
        const ok = status === expected;
        results.push({ label, role, status, expected, ok });
        if (!ok) {
            console.error(`[FAIL] ${label} (${role}) -> ${status}, expected ${expected}`);
        } else {
            console.log(`[PASS] ${label} (${role}) -> ${status}`);
        }
    }

    const tokens = {};
    for (const entry of roles) {
        tokens[entry.role] = await login(entry.email, ADMIN_PASSWORD);
    }

    // User status update
    const statusPayload = { status: 'suspended', reason: RUN_ID };

    let res = await requestWithToken(tokens.super_admin, 'PATCH', `/api/admin/users/${customerId}/status`, statusPayload);
    await expectStatus('user_status_update', 'super_admin', res.status, 200);

    await client.query('UPDATE users SET status = $1 WHERE id = $2', ['active', customerId]);

    res = await requestWithToken(tokens.support_admin, 'PATCH', `/api/admin/users/${customerId}/status`, statusPayload);
    await expectStatus('user_status_update', 'support_admin', res.status, 200);

    res = await requestWithToken(tokens.trust_safety_admin, 'PATCH', `/api/admin/users/${customerId}/status`, statusPayload);
    await expectStatus('user_status_update', 'trust_safety_admin', res.status, 200);

    res = await requestWithToken(tokens.finance_admin, 'PATCH', `/api/admin/users/${customerId}/status`, statusPayload);
    await expectStatus('user_status_update', 'finance_admin', res.status, 403);

    res = await requestWithToken(tokens.read_only_admin, 'PATCH', `/api/admin/users/${customerId}/status`, statusPayload);
    await expectStatus('user_status_update', 'read_only_admin', res.status, 403);

    // Vendor approve / reject
    res = await requestWithToken(tokens.trust_safety_admin, 'POST', `/api/admin/vendors/${vendorApproveId}/approve`, { notes: RUN_ID });
    await expectStatus('vendor_approve', 'trust_safety_admin', res.status, 200);

    res = await requestWithToken(tokens.support_admin, 'POST', `/api/admin/vendors/${vendorRejectId}/reject`, { reason: RUN_ID });
    await expectStatus('vendor_reject', 'support_admin', res.status, 200);

    res = await requestWithToken(tokens.finance_admin, 'POST', `/api/admin/vendors/${vendorBlockedId}/approve`, { notes: RUN_ID });
    await expectStatus('vendor_approve', 'finance_admin', res.status, 403);

    res = await requestWithToken(tokens.read_only_admin, 'POST', `/api/admin/vendors/${vendorBlockedId}/reject`, { reason: RUN_ID });
    await expectStatus('vendor_reject', 'read_only_admin', res.status, 403);

    // Review moderation
    res = await requestWithToken(tokens.trust_safety_admin, 'PATCH', `/api/admin/reviews/${reviewData[0].reviewId}/moderate`, { action: 'approve', reason: RUN_ID });
    await expectStatus('review_moderate', 'trust_safety_admin', res.status, 200);

    res = await requestWithToken(tokens.support_admin, 'PATCH', `/api/admin/reviews/${reviewData[1].reviewId}/moderate`, { action: 'hide', reason: RUN_ID });
    await expectStatus('review_moderate', 'support_admin', res.status, 200);

    res = await requestWithToken(tokens.super_admin, 'PATCH', `/api/admin/reviews/${reviewData[2].reviewId}/moderate`, { action: 'remove', reason: RUN_ID });
    await expectStatus('review_moderate', 'super_admin', res.status, 200);

    res = await requestWithToken(tokens.finance_admin, 'PATCH', `/api/admin/reviews/${reviewData[2].reviewId}/moderate`, { action: 'hide', reason: RUN_ID });
    await expectStatus('review_moderate', 'finance_admin', res.status, 403);

    res = await requestWithToken(tokens.read_only_admin, 'PATCH', `/api/admin/reviews/${reviewData[2].reviewId}/moderate`, { action: 'hide', reason: RUN_ID });
    await expectStatus('review_moderate', 'read_only_admin', res.status, 403);

    // Finance write test
    const financeTablesReady = await tableExists(client, 'finance_credit_lots') && await tableExists(client, 'finance_ledger_entries');
    if (financeTablesReady) {
        res = await requestWithToken(tokens.finance_admin, 'POST', '/api/admin/finance/credits', {
            vendorId: vendorApproveId,
            amount: 12.5,
            origin: 'goodwill',
            memo: RUN_ID
        });
        await expectStatus('finance_credit_issue', 'finance_admin', res.status, 200);

        res = await requestWithToken(tokens.super_admin, 'POST', '/api/admin/finance/credits', {
            vendorId: vendorApproveId,
            amount: 12.5,
            origin: 'goodwill',
            memo: RUN_ID
        });
        await expectStatus('finance_credit_issue', 'super_admin', res.status, 200);
    } else {
        console.warn('[SKIP] Finance credit tests skipped (finance tables missing)');
        results.push({ label: 'finance_credit_issue', role: 'finance_admin', status: 'skipped', expected: 200, ok: false });
    }

    // Audit log check
    const auditEntries = [];
    let auditError = null;
    try {
        const auditResult = await client.query(
            `SELECT action, target_type, target_id, details, created_at
             FROM admin_audit_log
             WHERE details::text ILIKE $1
             ORDER BY created_at DESC`,
            [`%${RUN_ID}%`]
        );
        for (const row of auditResult.rows) {
            auditEntries.push({
                action: row.action,
                target_type: row.target_type,
                target_id: row.target_id,
                created_at: row.created_at
            });
        }
    } catch (error) {
        auditError = error.message;
    }

    console.log('\n=== Audit Log Summary ===');
    if (auditError) {
        console.log(`Audit log query failed: ${auditError}`);
    } else {
        console.log(`Entries found with RUN_ID=${RUN_ID}: ${auditEntries.length}`);
        for (const entry of auditEntries) {
            console.log(`- ${entry.action} | ${entry.target_type || '-'} | ${entry.target_id || '-'} | ${entry.created_at}`);
        }
    }

    const failed = results.filter(r => r.ok === false);
    if (failed.length > 0) {
        process.exitCode = 1;
    }

    await client.end();
}

run().catch((error) => {
    console.error('Permission smoke test failed:', error.message);
    process.exit(1);
});
