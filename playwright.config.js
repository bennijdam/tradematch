const { defineConfig } = require('@playwright/test');

const baseURL = process.env.BASE_URL || 'http://localhost:8080';

module.exports = defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  timeout: 60000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  webServer: {
    command: 'npm --prefix apps/web-next run dev -- --port 8080 --hostname 127.0.0.1',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000
  },
  use: {
    baseURL,
    extraHTTPHeaders: {
      'x-tradematch-test-secret': process.env.INTERNAL_TEST_SECRET || 'dev-secret-123',
      'x-tradematch-test-user': process.env.E2E_TEST_USER || 'vendor'
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
});
