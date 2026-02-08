const { test, expect } = require('@playwright/test');
const { routes } = require('./utils/routes');

const apiBase = process.env.API_BASE_URL || 'http://localhost:3001/api';

test('@sanity OAuth buttons present on login', async ({ page }) => {
  await page.goto(routes.login, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#googleLoginBtn')).toBeVisible();
  await expect(page.locator('#microsoftLoginBtn')).toBeVisible();
});

test('@sanity Stripe checkout UI loads', async ({ page }) => {
  await page.goto(routes.paymentCheckout, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1')).toContainText('Secure Payment');
  await expect(page.locator('#payment-form')).toBeVisible();
});

test('@sanity Stripe webhook endpoint responds', async ({ request }) => {
  const response = await request.post(`${apiBase}/webhooks/stripe`, {
    data: { test: true }
  });
  expect([400, 401, 403]).toContain(response.status());
});

test('@sanity email endpoint responds', async ({ request }) => {
  const response = await request.post(`${apiBase}/email/welcome`, {
    data: {}
  });
  expect([400, 401, 403]).toContain(response.status());
});
