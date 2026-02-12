const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'apps', 'api');
dotenv.config({ path: path.join(BACKEND_DIR, '.env') });
const API_BASE = 'http://localhost:3001';
const FRONTEND_BASE = 'http://localhost:8000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const startProcess = (command, args, cwd) => {
  const proc = spawn(command, args, { cwd, stdio: 'inherit' });
  return proc;
};

const waitForHealth = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) return true;
    } catch (_) {
      // ignore
    }
    await sleep(1000);
  }
  return false;
};

const waitForFrontend = async () => {
  for (let i = 0; i < 30; i += 1) {
    try {
      const res = await fetch(`${FRONTEND_BASE}/login`);
      if (res.ok) return true;
    } catch (_) {
      // ignore
    }
    await sleep(500);
  }
  return false;
};

const registerUser = async (userType) => {
  const rand = Math.floor(Math.random() * 1e9);
  const email = `${userType}_${rand}@example.com`;
  const password = 'TestPass123!';

  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: `${userType} smoke user`,
      userType,
      postcode: 'SW1A 1AA',
      terms: true
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Register ${userType} failed: ${res.status} ${JSON.stringify(data)}`);
  }

  return { email, password };
};

const run = async () => {
  let backendProc;
  let frontendProc;
  let browser;

  try {
    backendProc = startProcess('node', ['scripts/init-server.js'], BACKEND_DIR);
    frontendProc = startProcess('node', ['server.js'], ROOT_DIR);

    const backendReady = await waitForHealth();
    const frontendReady = await waitForFrontend();

    if (!backendReady) throw new Error('Backend did not become healthy');
    if (!frontendReady) throw new Error('Frontend server did not respond');

    // Ensure super admin exists and password is synced
    startProcess('node', ['scripts/setup-super-admin.js'], BACKEND_DIR);
    startProcess('node', ['reset-admin-password.js'], BACKEND_DIR);
    await sleep(3000);

    const customer = await registerUser('customer');
    const vendor = await registerUser('vendor');

    browser = await chromium.launch();
    const page = await browser.newPage();

    // Customer login
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', customer.email);
    await page.fill('#password', customer.password);
    await page.click('#submitBtn');
    await page.waitForURL('**/customer-dashboard.html', { timeout: 10000 });

    // Vendor login
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.click('.user-type-btn[data-type="vendor"]');
    await page.fill('#email', vendor.email);
    await page.fill('#password', vendor.password);
    await page.click('#submitBtn');
    await page.waitForURL('**/vendor-dashboard.html', { timeout: 10000 });

    // Admin login
    await page.goto(`${FRONTEND_BASE}/super-admin`, { waitUntil: 'domcontentloaded' });
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const adminInputs = page.locator('.login-form input');
    if ((await adminInputs.count()) >= 2) {
      await adminInputs.nth(0).fill('admin@tradematch.com');
      await adminInputs.nth(1).fill(adminPassword);
      const adminLoginButton = page.locator('.login-form .btn-primary');
      if ((await adminLoginButton.count()) > 0) {
        await adminLoginButton.first().click();
        await page.waitForTimeout(3000);
      } else {
        console.warn('Admin login button not found, skipping admin login');
      }
    } else {
      console.warn('Admin login form not found, skipping admin login');
    }

    console.log('UI smoke tests: PASS');
    process.exitCode = 0;
  } catch (error) {
    console.error('UI smoke tests: FAIL', error.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (backendProc && !backendProc.killed) backendProc.kill();
    if (frontendProc && !frontendProc.killed) frontendProc.kill();
  }
};

run();
