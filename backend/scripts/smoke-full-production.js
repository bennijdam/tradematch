const crypto = require('crypto');

const API_BASE = process.env.API_BASE || 'https://api.tradematch.uk';
const EMAIL_TO = process.env.EMAIL_TO || null;
const PASSWORD = process.env.TEST_PASSWORD || 'SmokeTest123!';
const EXISTING_CUSTOMER_EMAIL = process.env.EXISTING_CUSTOMER_EMAIL || null;
const EXISTING_CUSTOMER_PASSWORD = process.env.EXISTING_CUSTOMER_PASSWORD || PASSWORD;
const EXISTING_VENDOR_EMAIL = process.env.EXISTING_VENDOR_EMAIL || null;
const EXISTING_VENDOR_PASSWORD = process.env.EXISTING_VENDOR_PASSWORD || PASSWORD;
const ACTIVATE_CUSTOMER_TOKEN = process.env.ACTIVATE_CUSTOMER_TOKEN || null;
const ACTIVATE_VENDOR_TOKEN = process.env.ACTIVATE_VENDOR_TOKEN || null;

const getFetch = () => {
  if (typeof fetch === 'function') return fetch;
  try {
    return require('node-fetch');
  } catch (error) {
    throw new Error('Fetch API not available. Use Node 18+ or install node-fetch.');
  }
};

const fetcher = getFetch();

const requestJson = async (path, options = {}) => {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetcher(url, { ...options, headers });
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
};

const activateAccount = async (token) => {
  if (!token) return false;
  await requestJson(`/api/auth/activate?token=${encodeURIComponent(token)}`, {
    method: 'GET'
  });
  return true;
};

const logStep = (label, detail) => {
  console.log(`✅ ${label}`);
  if (detail) {
    console.log(detail);
  }
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

const randomEmail = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}@tradematch.uk`;

const run = async () => {
  console.log('🚦 TradeMatch Full Smoke Test (Production)');
  console.log(`API Base: ${API_BASE}`);

  // 1) Health check
  try {
    const health = await requestJson('/api/health');
    logStep('API health check', JSON.stringify(health));
  } catch (error) {
    logFail('API health check', error);
    process.exitCode = 1;
    return;
  }

  const customerEmail = EXISTING_CUSTOMER_EMAIL || randomEmail('smoke_customer');
  const vendorEmail = EXISTING_VENDOR_EMAIL || randomEmail('smoke_vendor');

  // 2) Register customer (skip if existing)
  if (!EXISTING_CUSTOMER_EMAIL) {
    try {
      await requestJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: customerEmail,
          password: PASSWORD,
          fullName: 'Smoke Test Customer',
          userType: 'customer',
          postcode: 'SW1A 1AA',
          phone: '07123456789'
        })
      });
      logStep('Customer registration', customerEmail);
    } catch (error) {
      logFail('Customer registration', error);
      process.exitCode = 1;
      return;
    }
  } else {
    logStep('Customer registration skipped (existing account)', customerEmail);
  }

  // 3) Login customer
  let customerLogin;
  try {
    customerLogin = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: customerEmail,
        password: EXISTING_CUSTOMER_EMAIL ? EXISTING_CUSTOMER_PASSWORD : PASSWORD
      })
    });
    logStep('Customer login', customerLogin.user?.email || customerEmail);
  } catch (error) {
    if (error.data?.requiresActivation) {
      try {
        const activated = await activateAccount(ACTIVATE_CUSTOMER_TOKEN);
        if (!activated) {
          await requestJson('/api/auth/resend-activation', {
            method: 'POST',
            body: JSON.stringify({ email: customerEmail })
          });
          throw new Error('Customer activation required. Provide ACTIVATE_CUSTOMER_TOKEN or use EXISTING_CUSTOMER_EMAIL/PASSWORD.');
        }

        customerLogin = await requestJson('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: customerEmail,
            password: EXISTING_CUSTOMER_EMAIL ? EXISTING_CUSTOMER_PASSWORD : PASSWORD
          })
        });
        logStep('Customer login (after activation)', customerLogin.user?.email || customerEmail);
      } catch (activationError) {
        logFail('Customer activation', activationError);
        process.exitCode = 1;
        return;
      }
    } else {
      logFail('Customer login', error);
      process.exitCode = 1;
      return;
    }
  }

  // 4) Post job (quote)
  let quoteId;
  try {
    const quote = await requestJson('/api/quotes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerLogin.token}` },
      body: JSON.stringify({
        serviceType: 'plumbing',
        title: 'Smoke test job',
        description: 'Test job created by automated smoke test.',
        postcode: 'SW1A 1AA',
        budgetMin: 120,
        budgetMax: 250,
        urgency: 'asap'
      })
    });
    quoteId = quote.quoteId;
    logStep('Job posted', quoteId);
  } catch (error) {
    logFail('Job posted', error);
    process.exitCode = 1;
    return;
  }

  // 5) Register vendor (skip if existing)
  if (!EXISTING_VENDOR_EMAIL) {
    try {
      await requestJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: vendorEmail,
          password: PASSWORD,
          fullName: 'Smoke Test Vendor',
          userType: 'vendor',
          postcode: 'SW1A 2AA',
          phone: '07987654321'
        })
      });
      logStep('Vendor registration', vendorEmail);
    } catch (error) {
      logFail('Vendor registration', error);
      process.exitCode = 1;
      return;
    }
  } else {
    logStep('Vendor registration skipped (existing account)', vendorEmail);
  }

  // 6) Login vendor
  let vendorLogin;
  try {
    vendorLogin = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: vendorEmail,
        password: EXISTING_VENDOR_EMAIL ? EXISTING_VENDOR_PASSWORD : PASSWORD
      })
    });
    logStep('Vendor login', vendorLogin.user?.email || vendorEmail);
  } catch (error) {
    if (error.data?.requiresActivation) {
      try {
        const activated = await activateAccount(ACTIVATE_VENDOR_TOKEN);
        if (!activated) {
          await requestJson('/api/auth/resend-activation', {
            method: 'POST',
            body: JSON.stringify({ email: vendorEmail })
          });
          throw new Error('Vendor activation required. Provide ACTIVATE_VENDOR_TOKEN or use EXISTING_VENDOR_EMAIL/PASSWORD.');
        }

        vendorLogin = await requestJson('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: vendorEmail,
            password: EXISTING_VENDOR_EMAIL ? EXISTING_VENDOR_PASSWORD : PASSWORD
          })
        });
        logStep('Vendor login (after activation)', vendorLogin.user?.email || vendorEmail);
      } catch (activationError) {
        logFail('Vendor activation', activationError);
        process.exitCode = 1;
        return;
      }
    } else {
      logFail('Vendor login', error);
      process.exitCode = 1;
      return;
    }
  }

  // 7) Submit bid
  try {
    const bid = await requestJson('/api/bids', {
      method: 'POST',
      headers: { Authorization: `Bearer ${vendorLogin.token}` },
      body: JSON.stringify({
        quoteId,
        price: 199,
        message: 'Smoke test bid submission.',
        estimatedDuration: '2 days',
        availability: 'Next week'
      })
    });
    logStep('Bid submitted', bid.bidId);
  } catch (error) {
    logFail('Bid submitted', error);
    process.exitCode = 1;
    return;
  }

  // 8) Send test email
  try {
    const emailTarget = EMAIL_TO || customerEmail;
    const emailRes = await requestJson('/api/email/welcome', {
      method: 'POST',
      body: JSON.stringify({
        email: emailTarget,
        name: 'Smoke Test',
        userType: 'customer'
      })
    });
    logStep('Welcome email sent', JSON.stringify(emailRes));
  } catch (error) {
    logFail('Welcome email sent', error);
    process.exitCode = 1;
    return;
  }

  console.log('🎉 Full smoke test completed successfully.');
};

run().catch((error) => {
  logFail('Smoke test failed', error);
  process.exitCode = 1;
});
