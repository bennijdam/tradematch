/**
 * apps/api/services/vetting-apis.js
 *
 * Thin wrappers around external trade-registration verification APIs.
 * Each function returns a normalised result object:
 *   { verified: boolean, registeredName: string|null, expiresAt: string|null, raw: object }
 *
 * When the real API is unavailable (missing key, network error, etc.)
 * every function falls back to a mock result so the rest of the system
 * keeps working during development / staging.
 */

'use strict';

const https = require('https');

// ─── Small HTTP helper ────────────────────────────────────────────────────────

function httpGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers }, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ status: res.statusCode, data: body }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(8000, () => { req.destroy(new Error('Request timed out')); });
    });
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

function mockResult(registrationNumber, extra = {}) {
    return {
        verified: true,
        registeredName: 'TradeMatch Demo Contractor Ltd',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        raw: { mock: true, registrationNumber, ...extra }
    };
}

function notFoundResult(registrationNumber) {
    return {
        verified: false,
        registeredName: null,
        expiresAt: null,
        raw: { found: false, registrationNumber }
    };
}

// ─── Gas Safe Register ────────────────────────────────────────────────────────
// Real API endpoint: https://www.gassaferegister.co.uk/api/v1/engineer/{number}
// Requires API key header: X-Api-Key

async function verifyGasSafe(registrationNumber) {
    const apiKey = process.env.GAS_SAFE_API_KEY;
    if (!apiKey) {
        console.warn('[vetting-apis] GAS_SAFE_API_KEY not set — using mock');
        return mockResult(registrationNumber, { source: 'gas_safe_mock' });
    }

    try {
        const url = `https://www.gassaferegister.co.uk/api/v1/engineer/${encodeURIComponent(registrationNumber)}`;
        const { status, data } = await httpGet(url, { 'X-Api-Key': apiKey });

        if (status === 404 || !data || !data.registrationNumber) {
            return notFoundResult(registrationNumber);
        }

        return {
            verified: data.status === 'Active',
            registeredName: data.name || data.businessName || null,
            expiresAt: data.expiryDate || null,
            raw: data
        };
    } catch (err) {
        console.error('[vetting-apis] Gas Safe API error:', err.message);
        return mockResult(registrationNumber, { source: 'gas_safe_mock_fallback', error: err.message });
    }
}

// ─── NICEIC ───────────────────────────────────────────────────────────────────
// Real API: https://api.niceic.com/v1/contractor/{number}
// Requires Authorization: Bearer <token>

async function verifyNICEIC(registrationNumber) {
    const apiKey = process.env.NICEIC_API_KEY;
    if (!apiKey) {
        console.warn('[vetting-apis] NICEIC_API_KEY not set — using mock');
        return mockResult(registrationNumber, { source: 'niceic_mock' });
    }

    try {
        const url = `https://api.niceic.com/v1/contractor/${encodeURIComponent(registrationNumber)}`;
        const { status, data } = await httpGet(url, { 'Authorization': `Bearer ${apiKey}` });

        if (status === 404 || !data || !data.contractor_id) {
            return notFoundResult(registrationNumber);
        }

        return {
            verified: data.status === 'approved',
            registeredName: data.company_name || null,
            expiresAt: data.renewal_date || null,
            raw: data
        };
    } catch (err) {
        console.error('[vetting-apis] NICEIC API error:', err.message);
        return mockResult(registrationNumber, { source: 'niceic_mock_fallback', error: err.message });
    }
}

// ─── NAPIT ────────────────────────────────────────────────────────────────────
// Real API: https://api.napit.org.uk/v1/member/{number}

async function verifyNAPIT(registrationNumber) {
    const apiKey = process.env.NAPIT_API_KEY;
    if (!apiKey) {
        console.warn('[vetting-apis] NAPIT_API_KEY not set — using mock');
        return mockResult(registrationNumber, { source: 'napit_mock' });
    }

    try {
        const url = `https://api.napit.org.uk/v1/member/${encodeURIComponent(registrationNumber)}`;
        const { status, data } = await httpGet(url, { 'X-Api-Key': apiKey });

        if (status === 404 || !data || !data.member_number) {
            return notFoundResult(registrationNumber);
        }

        return {
            verified: data.membership_status === 'current',
            registeredName: data.company_name || null,
            expiresAt: data.expiry_date || null,
            raw: data
        };
    } catch (err) {
        console.error('[vetting-apis] NAPIT API error:', err.message);
        return mockResult(registrationNumber, { source: 'napit_mock_fallback', error: err.message });
    }
}

// ─── GOV.UK One Login (OIDC identity verification) ───────────────────────────
// Flow: vendor redirected to GOV.UK → callback with code → exchange for tokens

function getGovukOneLoginAuthUrl(state) {
    const clientId     = process.env.GOVUK_CLIENT_ID;
    const redirectUri  = process.env.GOVUK_REDIRECT_URI || 'https://api.tradematch.uk/api/vetting/identity/callback';
    const baseUrl      = process.env.GOVUK_ONE_LOGIN_URL || 'https://oidc.integration.account.gov.uk';

    if (!clientId) {
        return null; // caller should handle missing config
    }

    const params = new URLSearchParams({
        response_type: 'code',
        scope:         'openid email phone',
        client_id:     clientId,
        redirect_uri:  redirectUri,
        state,
        nonce:         require('crypto').randomBytes(16).toString('hex'),
        ui_locales:    'en'
    });

    return `${baseUrl}/authorize?${params.toString()}`;
}

async function exchangeGovukOneLoginCode(code) {
    const clientId     = process.env.GOVUK_CLIENT_ID;
    const clientSecret = process.env.GOVUK_CLIENT_SECRET;
    const redirectUri  = process.env.GOVUK_REDIRECT_URI || 'https://api.tradematch.uk/api/vetting/identity/callback';
    const baseUrl      = process.env.GOVUK_ONE_LOGIN_URL || 'https://oidc.integration.account.gov.uk';

    if (!clientId || !clientSecret) {
        // Mock for dev
        return {
            success: true,
            subject: `mock-sub-${Date.now()}`,
            email:   'verified@example.gov.uk',
            raw:     { mock: true }
        };
    }

    try {
        const body = new URLSearchParams({
            grant_type:    'authorization_code',
            code,
            redirect_uri:  redirectUri,
            client_id:     clientId,
            client_secret: clientSecret
        }).toString();

        const result = await new Promise((resolve, reject) => {
            const url = new URL(`${baseUrl}/token`);
            const options = {
                hostname: url.hostname,
                path:     url.pathname,
                method:   'POST',
                headers: {
                    'Content-Type':   'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (c) => { data += c; });
                res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });

        if (result.status !== 200 || result.data.error) {
            return { success: false, error: result.data.error_description || 'Token exchange failed' };
        }

        // Decode id_token (JWT) — just the payload, no signature verify needed here
        // (the OIDC library / separate verify step should do that in production)
        const idTokenPayload = JSON.parse(
            Buffer.from(result.data.id_token.split('.')[1], 'base64url').toString('utf8')
        );

        return {
            success: true,
            subject: idTokenPayload.sub,
            email:   idTokenPayload.email || null,
            raw:     result.data
        };
    } catch (err) {
        console.error('[vetting-apis] GOV.UK One Login token exchange error:', err.message);
        return { success: false, error: err.message };
    }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────
// Convenience function used by the vetting route

async function verifyTradeRegistration(registrationType, registrationNumber) {
    switch (registrationType) {
        case 'gas_safe': return verifyGasSafe(registrationNumber);
        case 'niceic':   return verifyNICEIC(registrationNumber);
        case 'napit':    return verifyNAPIT(registrationNumber);
        default:
            // Manual-only verification types (fgas, oftec, checkatrade, etc.)
            return { verified: null, registeredName: null, expiresAt: null, raw: { method: 'manual' } };
    }
}

module.exports = {
    verifyGasSafe,
    verifyNICEIC,
    verifyNAPIT,
    verifyTradeRegistration,
    getGovukOneLoginAuthUrl,
    exchangeGovukOneLoginCode
};
