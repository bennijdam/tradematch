const { test, expect } = require('@playwright/test');

test('@smoke root route lands on vendor dashboard shell', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/vendor\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Active Jobs' })).toBeVisible();
});
