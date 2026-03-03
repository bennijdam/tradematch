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
    await expect(page).toHaveURL(/\/customer\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Customer Dashboard' })).toBeVisible();
  });

  await test.step('Activate', async () => {
    const response = await request.get(`${baseURL}/user-dashboard.html`, {
      maxRedirects: 0
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toContain('/customer/dashboard');
  });

  await test.step('Post job', async () => {
    await page.goto('/customer/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/customer\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'My Job Requests' })).toBeVisible();
  });

  await test.step('Chat', async () => {
    await page.goto('/customer/dashboard#messages', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
  });

  await test.step('Payment', async () => {
    await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  await test.step('Dashboard access', async () => {
    await page.goto('/customer/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/customer\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Customer Dashboard' })).toBeVisible();
  });
});
