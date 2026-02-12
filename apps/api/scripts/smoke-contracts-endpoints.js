/* eslint-disable camelcase */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const baseEnv = process.env.BASE_URL || '';
const isLocalBase = /localhost|127\.0\.0\.1/i.test(baseEnv);
const BASE_URL = isLocalBase ? baseEnv : 'http://localhost:3001';
const CUSTOMER_EMAIL = process.env.SEED_CUSTOMER_EMAIL || 'seed.customer@tradematch.local';
const VENDOR_EMAIL = process.env.SEED_VENDOR_EMAIL || 'seed.vendor@tradematch.local';
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'SeedPass123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) {
    const error = new Error(`Request failed: ${res.status}`);
    error.status = res.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const login = async (email, password) => {
  const data = await fetchJson(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return { token: data.token, userId: data.userId, role: data.role };
};

const register = async ({ email, password, userType, fullName }) => {
  await fetchJson(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userType,
      fullName,
      email,
      password,
      postcode: '2000',
      terms: true
    })
  });
};

const ensureLogin = async ({ email, password, userType, fullName }) => {
  try {
    return await login(email, password);
  } catch (error) {
    if (error.status === 401 || error.status === 400) {
      const uniqueEmail = email.includes('@') ? `${email.split('@')[0]}_${Date.now()}@${email.split('@')[1]}` : `user_${Date.now()}@tradematch.local`;
      await register({ email: uniqueEmail, password, userType, fullName });
      return login(uniqueEmail, password);
    }
    throw error;
  }
};

const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

const run = async () => {
  const result = { steps: [] };
  const step = (name, data) => result.steps.push({ name, ...data });

  try {
    const customer = await ensureLogin({
      email: CUSTOMER_EMAIL,
      password: SEED_PASSWORD,
      userType: 'customer',
      fullName: 'Smoke Test Customer'
    });
    const vendor = await ensureLogin({
      email: VENDOR_EMAIL,
      password: SEED_PASSWORD,
      userType: 'vendor',
      fullName: 'Smoke Test Vendor'
    });
    step('login', { customerId: customer.userId, vendorId: vendor.userId });

    const jobId = `job_smoke_${Date.now()}`;
    const convo = await fetchJson(`${BASE_URL}/api/messaging/conversations`, {
      method: 'POST',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ job_id: jobId, customer_id: customer.userId, vendor_id: vendor.userId, conversation_type: 'job' })
    });
    const conversationId = convo.conversation.id;
    step('conversation', { conversationId });

    const contractPayload = {
      conversation_id: conversationId,
      scope_of_work: 'Bathroom upgrade with tiling and fixtures',
      total_price: 6500,
      milestones: [
        { title: 'Demolition', description: 'Remove fixtures', amount: 1500, due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10) },
        { title: 'Install fixtures', description: 'Install new fixtures', amount: 5000, due_date: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10) }
      ],
      cancellation_terms: '7 days notice required',
      variation_terms: 'Variations must be in writing'
    };

    const contractCreate = await fetchJson(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: authHeaders(vendor.token),
      body: JSON.stringify(contractPayload)
    });
    const contractId = contractCreate.contract_id;
    step('contract_create', { contractId });

    const acceptVendor = await fetchJson(`${BASE_URL}/api/contracts/${contractId}/accept`, {
      method: 'POST',
      headers: authHeaders(vendor.token)
    });
    step('contract_accept_vendor', { status: acceptVendor.contract_status });

    const acceptCustomer = await fetchJson(`${BASE_URL}/api/contracts/${contractId}/accept`, {
      method: 'POST',
      headers: authHeaders(customer.token)
    });
    step('contract_accept_customer', { status: acceptCustomer.contract_status });

    const contractDetails = await fetchJson(`${BASE_URL}/api/contracts/${contractId}`, {
      headers: authHeaders(customer.token)
    });
    step('contract_get', { milestones: contractDetails.milestones.length, disputes: contractDetails.disputes.length });

    const milestoneId = contractDetails.milestones[0]?.id;
    if (!milestoneId) {
      throw new Error('No milestone returned from contract details');
    }
    step('milestone_existing', { milestoneId });

    const milestoneStatus = await fetchJson(`${BASE_URL}/api/contracts/milestones/${milestoneId}/status`, {
      method: 'PATCH',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ status: 'completed' })
    });
    step('milestone_status', { status: milestoneStatus.status });

    const paymentEvent = await fetchJson(`${BASE_URL}/api/contracts/payment-events`, {
      method: 'POST',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ conversation_id: conversationId, contract_id: contractId, milestone_id: milestoneId, event_label: 'Deposit paid' })
    });
    step('payment_event', { paymentEventId: paymentEvent.payment_event_id });

    const dispute = await fetchJson(`${BASE_URL}/api/contracts/${contractId}/disputes`, {
      method: 'POST',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ reason: 'Scope disagreement on fixtures' })
    });
    const disputeId = dispute.dispute_id;
    step('dispute_open', { disputeId });

    await fetchJson(`${BASE_URL}/api/contracts/disputes/${disputeId}/evidence`, {
      method: 'POST',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ evidence: [{ url: 'https://example.com/evidence/receipt.pdf', file_name: 'receipt.pdf', mime_type: 'application/pdf', size_bytes: 12000 }] })
    });
    step('dispute_evidence', { ok: true });

    await fetchJson(`${BASE_URL}/api/contracts/disputes/${disputeId}/notes`, {
      method: 'POST',
      headers: authHeaders(customer.token),
      body: JSON.stringify({ note: 'Customer notes added', is_internal: false })
    });
    step('dispute_note', { ok: true });

    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
      await fetchJson(`${BASE_URL}/api/contracts/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: authHeaders(admin.token),
        body: JSON.stringify({ outcome: 'neutral' })
      });
      step('dispute_resolve_admin', { ok: true });

      const adminContracts = await fetchJson(`${BASE_URL}/api/contracts/admin/contracts`, {
        headers: authHeaders(admin.token)
      });
      step('admin_contracts', { count: adminContracts.contracts.length });

      const adminDisputes = await fetchJson(`${BASE_URL}/api/contracts/admin/disputes`, {
        headers: authHeaders(admin.token)
      });
      step('admin_disputes', { count: adminDisputes.disputes.length });
    } else {
      step('admin_steps', { skipped: true, reason: 'ADMIN_EMAIL/ADMIN_PASSWORD not set' });
    }

    const paymentEvents = await fetchJson(`${BASE_URL}/api/contracts/payment-events?conversationId=${encodeURIComponent(conversationId)}`, {
      headers: authHeaders(customer.token)
    });
    step('payment_events_list', { count: paymentEvents.payment_events.length });

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Smoke test failed:', {
      message: error.message,
      status: error.status,
      payload: error.payload
    });
    process.exitCode = 1;
  }
};

run();
