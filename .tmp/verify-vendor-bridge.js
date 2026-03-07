const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/vendor/dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.tradematchAdminBridge.updateShowUpScore(92));
  await page.waitForTimeout(600);

  const frame = page.frameLocator('iframe[title="Vendor Dashboard"]');
  const value = await frame
    .locator('.rel-row', { hasText: 'Show-up Rate' })
    .locator('.rel-val')
    .innerText();

  console.log('showUpRateValue', value);
  await browser.close();
})();
