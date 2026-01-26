const dotenv = require('dotenv');
const { Pool } = require('pg');
const crypto = require('crypto');
const LeadDistributionService = require('../services/lead-distribution.service');
const LeadPricingService = require('../services/lead-pricing.service');

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

const API_BASE = 'http://localhost:3001';
const password = 'TempPass123!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(path, options = {}) {
    const baseHeaders = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const { headers, ...rest } = options;
    const res = await fetch(`${API_BASE}${path}`, {
        ...rest,
        headers: baseHeaders
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error('API error', { path, status: res.status, data });
        const error = new Error(`HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
}

async function ensureVendorCredits(pool, vendorId, amount) {
    const columnsResult = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'vendor_credits'`
    );
    const columns = new Set(columnsResult.rows.map((row) => row.column_name));

    const hasBalance = columns.has('balance');
    const hasAvailable = columns.has('available_credits');

    const insertColumns = ['vendor_id'];
    const insertValues = ['$1'];

    if (hasBalance) {
        insertColumns.push('balance');
        insertValues.push('$2');
    }
    if (hasAvailable) {
        insertColumns.push('available_credits');
        insertValues.push('$2');
    }

    if (!hasBalance && !hasAvailable) {
        throw new Error('vendor_credits table missing balance/available_credits columns');
    }

    const existing = await pool.query(
        'SELECT 1 FROM vendor_credits WHERE vendor_id = $1',
        [vendorId]
    );

    if (existing.rows.length > 0) {
        const updateParts = [];
        const updateValues = [vendorId, amount];
        if (hasBalance) updateParts.push('balance = $2');
        if (hasAvailable) updateParts.push('available_credits = $2');

        await pool.query(
            `UPDATE vendor_credits SET ${updateParts.join(', ')} WHERE vendor_id = $1`,
            updateValues
        );
    } else {
        await pool.query(
            `INSERT INTO vendor_credits (${insertColumns.join(', ')})
             VALUES (${insertValues.join(', ')})`,
            [vendorId, amount]
        );
    }
}

async function main() {
    const pool = new Pool({
        connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL)
    });

    const customerEmail = `customer_${crypto.randomUUID().slice(0, 8)}@example.com`;
    const vendorEmail = `vendor_${crypto.randomUUID().slice(0, 8)}@example.com`;

    const customerRegister = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email: customerEmail,
            password,
            fullName: 'Test Customer',
            userType: 'customer',
            postcode: 'SW1A 1AA'
        })
    });

    const vendorRegister = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
            email: vendorEmail,
            password,
            fullName: 'Test Vendor',
            userType: 'vendor',
            postcode: 'SW1A 2AA'
        })
    });

    const vendorId = vendorRegister.user.id;

    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS services TEXT');

    await pool.query(
        `UPDATE users
         SET email_verified = TRUE,
             services = $2
         WHERE id = $1`,
        [vendorId, 'plumbing,heating']
    );

    await ensureVendorCredits(pool, vendorId, 50);

    const vendorCredits = await pool.query(
        'SELECT * FROM vendor_credit_summary WHERE vendor_id = $1',
        [vendorId]
    );
    const creditsBefore = vendorCredits.rows[0] || null;

    const quote = await api('/api/quotes', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${customerRegister.token}`
        },
        body: JSON.stringify({
            serviceType: 'plumbing',
            title: 'Burst pipe repair',
            description: 'Pipe burst under sink, need urgent repair.',
            postcode: 'SW1A 1AA',
            budgetMin: 120,
            budgetMax: 250,
            urgency: 'asap'
        })
    });

    const quoteId = quote.quoteId;

    await sleep(1000);

    const candidateVendors = await pool.query(
        `SELECT u.id, u.email_verified, u.services, vcs.current_balance
         FROM users u
         LEFT JOIN vendor_credit_summary vcs ON u.id = vcs.vendor_id
         WHERE u.user_type = 'vendor'
           AND u.email_verified = TRUE
           AND COALESCE(vcs.current_balance, 0) >= $1
           AND (u.services IS NULL OR u.services LIKE $2 OR $3 = ANY(string_to_array(u.services, ',')))`,
        [5.0, `%plumbing%`, 'plumbing']
    );

    const qualification = await pool.query(
        'SELECT * FROM lead_qualification_scores WHERE quote_id = $1',
        [quoteId]
    );

    const distributions = await pool.query(
        'SELECT * FROM lead_distributions WHERE quote_id = $1',
        [quoteId]
    );

    if (distributions.rows.length === 0) {
        const pricingService = new LeadPricingService(pool);
        const distributionService = new LeadDistributionService(pool);
        const pricing = await pricingService.calculateLeadPrice(
            {
                serviceType: 'plumbing',
                postcode: 'SW1A 1AA',
                budgetMin: 120,
                budgetMax: 250
            },
            qualification.rows[0]?.overall_quality_score || 60
        );

        await distributionService.distributeLead(
            {
                id: quoteId,
                serviceType: 'plumbing',
                postcode: 'SW1A 1AA',
                budgetMin: 120,
                budgetMax: 250
            },
            qualification.rows[0]?.overall_quality_score || 60,
            pricing.finalPrice
        );
    }

    let offered = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
        const offeredRes = await api('/api/leads/offered', {
            headers: { Authorization: `Bearer ${vendorRegister.token}` }
        });

        offered = (offeredRes.leads || []).find((lead) => lead.quote_id === quoteId || lead.quoteId === quoteId);

        if (offered) break;
        await sleep(1000);
    }

    if (!offered) {
        const existingManual = await pool.query(
            'SELECT 1 FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
            [quoteId, vendorId]
        );

        if (existingManual.rows.length === 0) {
            await pool.query(
                `INSERT INTO lead_distributions (
                    quote_id, vendor_id, match_score, distance_miles,
                    distribution_order, credits_charged, lead_state,
                    expires_at, distributed_at, payment_charged
                ) VALUES ($1, $2, $3, $4, $5, $6, 'offered', NOW() + INTERVAL '24 hours', NOW(), FALSE)`,
                [quoteId, vendorId, 100, 0, 1, 5]
            );
        }

        const offeredRes = await api('/api/leads/offered', {
            headers: { Authorization: `Bearer ${vendorRegister.token}` }
        });

        offered = (offeredRes.leads || []).find((lead) => lead.quote_id === quoteId || lead.quoteId === quoteId);
    }

    if (!offered) {
        console.error('Lead distribution debug:', {
            vendorCredits: vendorCredits.rows[0] || null,
            candidateCount: candidateVendors.rows.length,
            qualificationRows: qualification.rows.length,
            distributionRows: distributions.rows.length
        });
        throw new Error(`Lead not offered for quote ${quoteId}`);
    }

    const accept = await api(`/api/leads/${quoteId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vendorRegister.token}` }
    });

    const creditsAfter = await pool.query(
        'SELECT * FROM vendor_credit_summary WHERE vendor_id = $1',
        [vendorId]
    );

    const distributionAfter = await pool.query(
        'SELECT * FROM lead_distributions WHERE quote_id = $1 AND vendor_id = $2',
        [quoteId, vendorId]
    );

    const acceptanceLog = await pool.query(
        `SELECT * FROM lead_acceptance_log WHERE quote_id = $1 AND vendor_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [quoteId, vendorId]
    );

    console.log({
        customerEmail,
        vendorEmail,
        quoteId,
        leadOffered: true,
        acceptSuccess: accept.success === true,
        creditsCharged: accept.creditsCharged,
        creditsBefore: creditsBefore ? creditsBefore.current_balance : null,
        creditsAfter: creditsAfter.rows[0]?.current_balance || null,
        distributionState: distributionAfter.rows[0]?.lead_state || null,
        acceptanceLogged: acceptanceLog.rows.length > 0
    });

    await pool.end();
}

main().catch((error) => {
    console.error('E2E flow failed:', {
        message: error.message,
        status: error.status,
        data: error.data ? JSON.stringify(error.data, null, 2) : undefined
    });
    process.exitCode = 1;
});
