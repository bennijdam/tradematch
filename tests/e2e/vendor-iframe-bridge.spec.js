const { test, expect } = require('@playwright/test');

test('@sanity vendor native dashboard renders extracted components', async ({ page }) => {
  await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'Good morning, Jake 👋' })).toBeVisible();
  await expect(page.getByText('Leads Received')).toBeVisible();
  await expect(page.getByText('Reliability Rating')).toBeVisible();
  await expect(page.getByText('Show-up Rate')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
});
