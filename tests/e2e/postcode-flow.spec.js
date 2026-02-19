const { test, expect } = require('@playwright/test');
const { routes } = require('./utils/routes');

test('@smoke postcode autocomplete navigates to quote engine', async ({ page }) => {
  await page.goto(routes.home, { waitUntil: 'domcontentloaded' });

  const postcodeInput = page.locator('#postcode');
  await expect(postcodeInput).toBeVisible();

  await postcodeInput.fill('E6');

  const suggestions = page.locator('#postcode-suggestions .postcode-suggestion');
  await expect(suggestions.first()).toBeVisible();
  await suggestions.first().click();

  await page.locator('button.get-quotes-btn').click();

  await expect(page).toHaveURL(/\/quote-engine(\?|$)/);
  await expect(page.locator('.service-search-input')).toBeVisible();
});
