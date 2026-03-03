const { test, expect } = require('@playwright/test');

test('@sanity customer native dashboard renders extracted components', async ({ page }) => {
  await page.goto('/customer/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Customer Dashboard' })).toBeVisible();
  await expect(page.getByText('My Job Requests')).toBeVisible();
  await expect(page.getByText('Actions')).toBeVisible();
  await expect(page.getByText('Inbox')).toBeVisible();
  await expect(page.getByText('Requests', { exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});
