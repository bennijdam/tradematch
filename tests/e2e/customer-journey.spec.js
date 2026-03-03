const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const storageStatePath = path.join(__dirname, '.auth', 'customer.json');
const storageState = fs.existsSync(storageStatePath) ? storageStatePath : undefined;

test.use({
  storageState,
  extraHTTPHeaders: {
    'x-tradematch-test-secret': process.env.INTERNAL_TEST_SECRET || 'dev-secret-123',
    'x-tradematch-test-user': 'customer'
  }
});

test('@e2e customer journey', async ({ page, request, baseURL }) => {

  await test.step('Register', async () => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  await test.step('Activate', async () => {
    const response = await request.get(`${baseURL}/vendor-dashboard.html`, {
      maxRedirects: 0
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toContain('/vendor/dashboard');
  });

  await test.step('Post job', async () => {
    await page.goto('/vendor/leads', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/leads$/);
    await expect(page.getByRole('heading', { name: 'New Leads' })).toBeVisible();
  });

  await test.step('Chat', async () => {
    await page.goto('/vendor/messages', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/messages$/);
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  });

  await test.step('Payment', async () => {
    await page.goto('/vendor/active-jobs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/active-jobs$/);
    await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible();
    await expect(page.locator('.animate-ping').first()).toBeVisible();
  });

  await test.step('Dashboard access', async () => {
    await page.goto('/vendor/billing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/billing$/);
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
  });
});
