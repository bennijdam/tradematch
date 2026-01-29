const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE || process.env.BASE_URL || 'https://api.tradematch.uk';
const PASSWORD = process.env.TEST_PASSWORD || 'E2ePass123!';
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || null;
const VENDOR_EMAIL = process.env.TEST_VENDOR_EMAIL || null;
const ACTIVATE_CUSTOMER_TOKEN = process.env.ACTIVATE_CUSTOMER_TOKEN || null;
const ACTIVATE_VENDOR_TOKEN = process.env.ACTIVATE_VENDOR_TOKEN || null;
const SKIP_PAYMENTS = process.env.SKIP_PAYMENTS === 'true';

const getFetch = () => {
  if (typeof fetch === 'function') return fetch;
  try {
    return require('node-fetch');
  } catch (error) {
    throw new Error('Fetch API not available. Use Node 18+ or install node-fetch.');
  }
};

const fetcher = getFetch();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomEmail = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}@tradematch.uk`;

const requestJson = async (path, options = {}, timeoutMs = 15000) => {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetcher(url, { ...options, headers, signal: controller.signal });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      data = { raw: text };
    }
    if (!res.ok) {
      const message = data.error || data.message || `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const activateAccount = async (token) => {
  if (!token) return false;
  await requestJson(`/api/auth/activate?token=${encodeURIComponent(token)}`, { method: 'GET' });
  return true;
};

const assertField = (label, value) => {
  if (!value) {
    const err = new Error(`Missing ${label}`);
    err.code = 'ASSERT_FIELD';
    throw err;
  }
};

const writeReport = (report) => {
  const outDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'e2e-booking-flow.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
};

const logStep = (label, detail) => {
  console.log(`✅ ${label}`);
  if (detail) console.log(detail);
};

const logWarn = (label, detail) => {
  console.warn(`⚠️  ${label}`);
  if (detail) console.warn(detail);
};

const logFail = (label, error) => {
  console.error(`❌ ${label}`);
  if (error) {
    console.error(error.message || error);
    if (error.data) {
      console.error(JSON.stringify(error.data, null, 2));
    }
  }
};

const ensureLogin = async ({ email, password, userType, fullName, postcode, phone, activationToken }) => {
  try {
    await requestJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        fullName,
        userType,
        postcode,
        phone
      })
    });
  } catch (error) {
    if (error.status !== 400) {
      throw error;
    }
    if (!/already exists|already registered/i.test(error.message || '')) {
      throw error;
    }
  }

  try {
    return await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  } catch (error) {
    if (error.data?.requiresActivation) {
      const activated = await activateAccount(activationToken);
      if (!activated) {
        await requestJson('/api/auth/resend-activation', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        throw new Error(`Activation required for ${email}. Provide ACTIVATE_*_TOKEN or use existing activated account.`);
      }

      return await requestJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    }
    throw error;
  }
};

const run = async () => {
  const report = {
    startedAt: new Date().toISOString(),
    apiBase: API_BASE,
    steps: []
  };

  console.log('🚦 TradeMatch End-to-End Booking Flow');
  console.log(`API Base: ${API_BASE}`);

  const customerEmail = CUSTOMER_EMAIL || randomEmail('booking_customer');
  const vendorEmail = VENDOR_EMAIL || randomEmail('booking_vendor');

  report.credentials = {
    customerEmail,
    vendorEmail,
    password: PASSWORD
  };

  console.log('🔐 Test credentials');
  console.log(`Customer: ${customerEmail}`);
  console.log(`Vendor: ${vendorEmail}`);
  console.log(`Password: ${PASSWORD}`);

  try {
    const health = await requestJson('/api/health');
    report.steps.push({ name: 'health', ok: true, detail: health });
    logStep('API health check', JSON.stringify(health));
  } catch (error) {
    report.steps.push({ name: 'health', ok: false, error: error.message });
    logFail('API health check', error);
    writeReport(report);
    process.exitCode = 1;
    return;
  }

  let customerLogin;
  try {
    customerLogin = await ensureLogin({
      email: customerEmail,
      password: PASSWORD,
      userType: 'customer',
      fullName: 'Booking Flow Customer',
      postcode: 'SW1A 1AA',
      phone: '07123456789',
      activationToken: ACTIVATE_CUSTOMER_TOKEN
    });
    assertField('customer token', customerLogin.token);
    report.steps.push({ name: 'customer-login', ok: true });
    logStep('Customer ready', customerLogin.user?.email || customerEmail);
  } catch (error) {
    report.steps.push({ name: 'customer-login', ok: false, error: error.message });
    logFail('Customer login', error);
    writeReport(report);
    process.exitCode = 1;
    return;
  }

  let vendorLogin;
  try {
    vendorLogin = await ensureLogin({
      email: vendorEmail,
      password: PASSWORD,
      userType: 'vendor',
      fullName: 'Booking Flow Vendor',
      postcode: 'SW1A 2AA',
      phone: '07987654321',
      activationToken: ACTIVATE_VENDOR_TOKEN
    });
    assertField('vendor token', vendorLogin.token);
    report.steps.push({ name: 'vendor-login', ok: true });
    logStep('Vendor ready', vendorLogin.user?.email || vendorEmail);
  } catch (error) {
    report.steps.push({ name: 'vendor-login', ok: false, error: error.message });
    logFail('Vendor login', error);
    writeReport(report);
    process.exitCode = 1;
    return;
  }

  let quoteId;
  try {
    const quote = await requestJson('/api/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerLogin.token}` },
      body: JSON.stringify({
        serviceType: 'plumbing',
        service: 'plumbing',
        serviceName: 'Plumbing',
        title: 'Booking flow validation',
        description: 'End-to-end booking flow test run.',
        postcode: 'SW1A 1AA',
        budgetMin: 150,
        budgetMax: 300,
        budget: '£150 - £300',
        urgency: 'asap'
      })
    });
    quoteId = quote.quoteId || quote.quote?.id || quote.id;
    assertField('quoteId', quoteId);
    report.steps.push({ name: 'create-quote', ok: true, quoteId });
    logStep('Quote created', quoteId);
  } catch (error) {
    report.steps.push({ name: 'create-quote', ok: false, error: error.message });
    logFail('Quote creation', error);
    writeReport(report);
    process.exitCode = 1;
    return;
  }

  let bidId;
  try {
    const bid = await requestJson('/api/bids', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorLogin.token}` },
      body: JSON.stringify({
        quoteId,
        price: 225,
        message: 'Booking flow bid submission.',
        estimatedDuration: '2 days',
        availability: 'Next week'
      })
    });
    bidId = bid.bidId || bid.bid?.id || bid.id;
    assertField('bidId', bidId);
    report.steps.push({ name: 'submit-bid', ok: true, bidId });
    logStep('Bid submitted', bidId);
  } catch (error) {
    report.steps.push({ name: 'submit-bid', ok: false, error: error.message });
    logFail('Bid submission', error);
    writeReport(report);
    process.exitCode = 1;
    return;
  }

  try {
    await requestJson('/api/customer/accept-bid', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerLogin.token}` },
      body: JSON.stringify({ bidId, quoteId })
    });
    report.steps.push({ name: 'accept-bid', ok: true, via: 'customer' });
    logStep('Bid accepted (customer route)');
  } catch (error) {
    if (error.status === 404) {
      try {
        await requestJson(`/api/bids/${bidId}/accept`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${customerLogin.token}` }
        });
        report.steps.push({ name: 'accept-bid', ok: true, via: 'bids' });
        logStep('Bid accepted (bids route)');
      } catch (fallbackError) {
        report.steps.push({ name: 'accept-bid', ok: false, error: fallbackError.message });
        logFail('Accept bid', fallbackError);
        writeReport(report);
        process.exitCode = 1;
        return;
      }
    } else {
      report.steps.push({ name: 'accept-bid', ok: false, error: error.message });
      logFail('Accept bid', error);
      writeReport(report);
      process.exitCode = 1;
      return;
    }
  }

  try {
    const quoteInfo = await requestJson(`/api/quotes/${quoteId}`);
    const status = quoteInfo.quote?.status;
    report.steps.push({ name: 'quote-status', ok: true, status });
    logStep('Quote status fetched', status);
    if (status && !['accepted', 'awarded'].includes(status)) {
      logWarn('Quote status not accepted/awarded', status || 'unknown');
    }
  } catch (error) {
    report.steps.push({ name: 'quote-status', ok: false, error: error.message });
    logFail('Quote status check', error);
  }

  let paymentId = null;
  let paymentIntentId = null;
  if (SKIP_PAYMENTS) {
    report.steps.push({ name: 'payment', ok: true, skipped: true, reason: 'SKIP_PAYMENTS=true' });
    logWarn('Payment step skipped', 'SKIP_PAYMENTS=true');
  } else {
    try {
      const payment = await requestJson('/api/payments/create-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerLogin.token}` },
        body: JSON.stringify({
          quoteId,
          amount: 225,
          description: 'Booking flow payment intent'
        })
      });
      paymentId = payment.paymentId;
      paymentIntentId = payment.paymentIntentId;
      assertField('paymentId', paymentId);
      assertField('paymentIntentId', paymentIntentId);
      report.steps.push({ name: 'payment-intent', ok: true, paymentId, paymentIntentId });
      logStep('Payment intent created', paymentId);
    } catch (error) {
      report.steps.push({ name: 'payment-intent', ok: false, error: error.message });
      logWarn('Payment intent failed (skipping)', error.message);
    }
  }

  try {
    const milestonesRes = await requestJson('/api/payments/milestones', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorLogin.token}` },
      body: JSON.stringify({
        quoteId,
        milestones: [
          {
            title: 'Deposit',
            description: 'Initial booking deposit',
            amount: 75,
            percentage: 33,
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            title: 'Completion',
            description: 'Final completion payment',
            amount: 150,
            percentage: 67,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      })
    });
    report.steps.push({ name: 'create-milestones', ok: true, milestones: milestonesRes.milestones || [] });
    logStep('Milestones created', JSON.stringify(milestonesRes.milestones || []));
  } catch (error) {
    report.steps.push({ name: 'create-milestones', ok: false, error: error.message });
    logFail('Milestone creation', error);
  }

  try {
    const milestones = await requestJson(`/api/payments/milestones/${quoteId}`, {
      headers: { Authorization: `Bearer ${customerLogin.token}` }
    });
    report.steps.push({ name: 'fetch-milestones', ok: true, count: milestones.milestones?.length || 0 });
    logStep('Milestones fetched', `count=${milestones.milestones?.length || 0}`);
  } catch (error) {
    report.steps.push({ name: 'fetch-milestones', ok: false, error: error.message });
    logFail('Fetch milestones', error);
  }

  await sleep(250);

  report.finishedAt = new Date().toISOString();
  const outPath = writeReport(report);
  console.log(`📄 Report saved: ${outPath}`);
  console.log('🎉 Booking flow validation complete.');
};

run().catch((error) => {
  logFail('Booking flow failed', error);
  process.exitCode = 1;
});
