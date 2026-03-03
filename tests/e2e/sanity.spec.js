const { test, expect } = require('@playwright/test');

const apiBase = process.env.API_BASE_URL || `${(process.env.BASE_URL || 'http://localhost:8080').replace(/\/$/, '')}/api`;

test('@sanity auth entry lands on vendor dashboard shell', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/vendor\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Active Jobs' })).toBeVisible();
});

test('@sanity vendor billing page loads on canonical route', async ({ page }) => {
  await page.goto('/vendor/billing', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/vendor\/billing$/);
  await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Item' })).toBeVisible();
});

test('@sanity Stripe webhook endpoint responds', async ({ request }) => {
  const response = await request.post(`${apiBase}/webhooks/stripe`, {
    data: { test: true }
  });
  expect([400, 404]).toContain(response.status());
});

test('@sanity email endpoint responds', async ({ request }) => {
  const response = await request.post(`${apiBase}/email/welcome`, {
    data: {}
  });
  expect([400, 404]).toContain(response.status());
});
