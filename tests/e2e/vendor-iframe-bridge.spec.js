const { test, expect } = require('@playwright/test');

test('@sanity vendor iframe bridge patches Show-up Rate', async ({ page }) => {
  await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });

  const frameLocator = page.frameLocator('iframe[title="Vendor Dashboard"]');
  const showUpRateValue = frameLocator
    .locator('.rel-row', { hasText: 'Show-up Rate' })
    .locator('.rel-val')
    .first();

  await expect(showUpRateValue).toHaveText('100%');

  await page.waitForFunction(() => {
    return Boolean(window.tradematchAdminBridge && window.tradematchAdminBridge.updateShowUpScore);
  });

  await page.evaluate(() => {
    window.tradematchAdminBridge.updateShowUpScore(92);
  });

  await expect(showUpRateValue).toHaveText('92%');
});
