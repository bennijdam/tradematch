const { chromium, request } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:8080/frontend';
const apiBase = process.env.API_BASE_URL || 'http://localhost:3001/api';

const authDir = 'tests/e2e/.auth';
const customerStatePath = `${authDir}/customer.json`;
const vendorStatePath = `${authDir}/vendor.json`;

async function createStorageState({ email, password, storagePath }) {
  if (!email || !password) return false;

  const apiContext = await request.newContext();
  const response = await apiContext.post(`${apiBase}/auth/login`, {
    data: { email, password }
  });

  if (!response.ok()) {
    await apiContext.dispose();
    throw new Error(`Login failed for ${email} (status ${response.status()})`);
  }

  const payload = await response.json();
  const token = payload.token;
  const user = payload.user || {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role
  };

  await apiContext.dispose();

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ tokenValue, userValue }) => {
      localStorage.setItem('token', tokenValue);
      localStorage.setItem('user', JSON.stringify(userValue));
    },
    { tokenValue: token, userValue: user }
  );

  await context.storageState({ path: storagePath });
  await browser.close();
  return true;
}

module.exports = async () => {
  await createStorageState({
    email: process.env.E2E_CUSTOMER_EMAIL,
    password: process.env.E2E_CUSTOMER_PASSWORD,
    storagePath: customerStatePath
  });

  await createStorageState({
    email: process.env.E2E_VENDOR_EMAIL,
    password: process.env.E2E_VENDOR_PASSWORD,
    storagePath: vendorStatePath
  });
};
