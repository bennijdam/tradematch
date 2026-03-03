const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const storageStatePath = path.join(__dirname, '.auth', 'vendor.json');
const storageState = fs.existsSync(storageStatePath) ? storageStatePath : undefined;

test.use({ storageState });

test('@e2e vendor journey', async ({ page }) => {

  await test.step('Vendor onboarding', async () => {
    await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  await test.step('Leads and quotes', async () => {
    await page.goto('/vendor/leads', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/leads$/);
    await expect(page.getByRole('heading', { name: 'New Leads' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();
  });

  await test.step('Messaging', async () => {
    await page.goto('/vendor/messages', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/messages$/);
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  });

  await test.step('Milestone/payment', async () => {
    await page.goto('/vendor/active-jobs', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/active-jobs$/);
    await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible();
    await expect(page.locator('.animate-ping').first()).toBeVisible();
  });

  await test.step('Payout', async () => {
    await page.goto('/vendor/billing', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/vendor\/billing$/);
    await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
  });
});
