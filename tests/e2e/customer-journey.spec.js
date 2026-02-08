const { test, expect } = require('@playwright/test');
const { routes } = require('./utils/routes');
const fs = require('fs');
const path = require('path');

const apiBase = process.env.API_BASE_URL || 'http://localhost:3001/api';
const storageStatePath = path.join(__dirname, '.auth', 'customer.json');
const storageState = fs.existsSync(storageStatePath) ? storageStatePath : undefined;

test.use({ storageState });

function shouldSkipCreds() {
  return !process.env.E2E_CUSTOMER_EMAIL || !process.env.E2E_CUSTOMER_PASSWORD;
}

test('@e2e customer journey', async ({ page, request }) => {
  test.skip(shouldSkipCreds(), 'Set E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD to run full customer journey.');

  await test.step('Register', async () => {
    await page.goto(routes.register, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('input#fullName')).toBeVisible();
  });

  await test.step('Activate', async () => {
    const token = process.env.E2E_ACTIVATION_TOKEN;
    const activationUrl = token ? `${routes.activate}?token=${encodeURIComponent(token)}` : routes.activate;
    await page.goto(activationUrl, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Activate/i);
  });

  await test.step('Login (API)', async () => {
    const response = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: process.env.E2E_CUSTOMER_EMAIL,
        password: process.env.E2E_CUSTOMER_PASSWORD
      }
    });

    expect(response.ok()).toBeTruthy();
  });

  await test.step('Post job', async () => {
    await page.goto(routes.quoteEngine, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.service-search-input')).toBeVisible();
  });

  await test.step('Chat', async () => {
    await page.goto(routes.messaging, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.messaging-container')).toBeVisible();
  });

  await test.step('Payment', async () => {
    await page.goto(routes.paymentCheckout, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#payment-form')).toBeVisible();
  });

  await test.step('Dashboard access', async () => {
    await page.goto(routes.customerDashboard, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Dashboard/i);
  });
});
