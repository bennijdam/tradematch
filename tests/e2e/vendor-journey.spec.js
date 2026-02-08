const { test, expect } = require('@playwright/test');
const { routes } = require('./utils/routes');
const fs = require('fs');
const path = require('path');

const apiBase = process.env.API_BASE_URL || 'http://localhost:3001/api';
const storageStatePath = path.join(__dirname, '.auth', 'vendor.json');
const storageState = fs.existsSync(storageStatePath) ? storageStatePath : undefined;

test.use({ storageState });

function shouldSkipCreds() {
  return !process.env.E2E_VENDOR_EMAIL || !process.env.E2E_VENDOR_PASSWORD;
}

test('@e2e vendor journey', async ({ page, request }) => {
  test.skip(shouldSkipCreds(), 'Set E2E_VENDOR_EMAIL and E2E_VENDOR_PASSWORD to run full vendor journey.');

  await test.step('Vendor onboarding', async () => {
    await page.goto(routes.vendorDashboard, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Dashboard/i);
  });

  await test.step('Login (API)', async () => {
    const response = await request.post(`${apiBase}/auth/login`, {
      data: {
        email: process.env.E2E_VENDOR_EMAIL,
        password: process.env.E2E_VENDOR_PASSWORD
      }
    });

    expect(response.ok()).toBeTruthy();
  });

  await test.step('Leads and quotes', async () => {
    await page.goto(routes.vendorDashboard, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Dashboard/i);
  });

  await test.step('Messaging', async () => {
    await page.goto(routes.messaging, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.messaging-container')).toBeVisible();
  });

  await test.step('Milestone/payment', async () => {
    await page.goto(routes.paymentCheckout, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#payment-form')).toBeVisible();
  });

  await test.step('Payout', async () => {
    await page.goto(routes.vendorSettings, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#stripeStatusBadge')).toBeVisible();
  });
});
