const { test, expect } = require('@playwright/test');

test('@smoke vendor dashboard renders new sidebar shell', async ({ page }) => {
  await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Active Jobs' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('@smoke active jobs shows pulse indicator', async ({ page }) => {
  await page.goto('/vendor/active-jobs', { waitUntil: 'domcontentloaded' });

  const activeJobsLink = page.getByRole('link', { name: 'Active Jobs' });
  await expect(activeJobsLink).toBeVisible();
  await expect(activeJobsLink.locator('.animate-ping').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Active Jobs' })).toBeVisible();
});

test('@smoke root route session bridge redirects to dashboard', async ({ page, baseURL }) => {
  const url = new URL(baseURL);
  await page.context().addCookies([
    {
      name: 'auth-token',
      value: 'smoke-session-token',
      domain: url.hostname,
      path: '/',
      sameSite: 'Lax',
      secure: url.protocol === 'https:',
      httpOnly: false,
    },
  ]);

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/vendor\/dashboard$/);
});

test('@smoke legacy vendor URL permanently redirects', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/vendor-dashboard.html`, {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(308);
  expect(response.headers().location).toContain('/vendor/dashboard');
});
