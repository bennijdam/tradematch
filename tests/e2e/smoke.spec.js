const { test, expect } = require('@playwright/test');
const { routes } = require('./utils/routes');

test('@smoke homepage loads', async ({ page }) => {
  await page.goto(routes.home, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('text=TradeMatch').first()).toBeVisible();
});

test('@smoke login page loads', async ({ page }) => {
  await page.goto(routes.login, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('form#loginForm')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test('@smoke register page loads', async ({ page }) => {
  await page.goto(routes.register, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input#fullName')).toBeVisible();
  await expect(page.locator('input#email')).toBeVisible();

  // Registration is a multi-step form; password is on step 2.
  await page.locator('input#fullName').fill('E2E Test User');
  await page.locator('input#email').fill(`e2e-${Date.now()}@example.com`);
  await page.locator('input#phone').fill('07700900000');
  await page.getByRole('button', { name: /continue/i }).first().click();
  await expect(page.locator('input#password')).toBeVisible();
});

test('@smoke quote engine loads', async ({ page }) => {
  await page.goto(routes.quoteEngine, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.service-search-input')).toBeVisible();
});

test('@smoke messaging loads', async ({ page }) => {
  await page.goto(routes.messaging, { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form#loginForm');
  const isLogin = await loginForm
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (isLogin) return;
  await expect(page.locator('.messaging-container')).toBeVisible();
});

test('@smoke customer dashboard loads', async ({ page }) => {
  await page.goto(routes.customerDashboard, { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form#loginForm');
  const isLogin = await loginForm
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (isLogin) return;
  await expect(page).toHaveTitle(/Dashboard/i);
});

test('@smoke vendor dashboard loads', async ({ page }) => {
  await page.goto(routes.vendorDashboard, { waitUntil: 'domcontentloaded' });

  const loginForm = page.locator('form#loginForm');
  const isLogin = await loginForm
    .waitFor({ state: 'visible', timeout: 2500 })
    .then(() => true)
    .catch(() => false);

  if (isLogin) return;
  await expect(page).toHaveTitle(/Dashboard/i);
});
