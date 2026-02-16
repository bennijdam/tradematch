#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');

const PORT = process.env.PORT ? Number(process.env.PORT) : 8091;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (_) {
      // ignore
    }
    await sleep(250);
  }
  return false;
}

function startStaticServer() {
  const proc = spawn('python', ['-m', 'http.server', String(PORT)], {
    cwd: WEB_DIR,
    stdio: 'inherit'
  });
  return proc;
}

async function run() {
  let serverProc;
  let browser;

  try {
    serverProc = startStaticServer();

    const ready = await waitForHttp(`${BASE_URL}/quote-engine.html`);
    if (!ready) throw new Error('Static server did not become ready');

    browser = await chromium.launch();
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Stub guest quote submission
    await page.route('https://api.tradematch.uk/api/quotes/public', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, quote: { id: 'quote_smoke_123' } })
      });
    });

    await page.goto(`${BASE_URL}/quote-engine.html?service=plumbing&postcode=e66dr`, { waitUntil: 'domcontentloaded' });

    // Step 1 -> Step 2
    await page.click('#nextBtn');

    // Fill description (postcode was prefilled; formatting happens via JS)
    await page.fill('#description', 'Smoke test: replace kitchen tap and fix small leak under sink.');

    // Step 2 -> Step 3
    await page.click('#nextBtn');

    // Select a timeline option
    const timelineOption = page.locator('.timeline-option').first();
    if (await timelineOption.count()) {
      await timelineOption.click();
    } else {
      throw new Error('No timeline options found');
    }

    // Step 3 -> Step 4
    await page.click('#nextBtn');

    // Fill contact
    await page.fill('#name', 'Smoke User');
    await page.fill('#email', 'smoke.user@example.com');
    await page.fill('#phone', '07700900000');

    // Submit -> should open auth modal, then post as guest
    await page.click('#submitBtn');
    await page.click('text=Post as Guest');

    // Success modal should show
    await page.waitForSelector('#successModal.active', { timeout: 5000 });

    // Ensure we did not hit the old native validation hidden-field error
    const notFocusable = consoleErrors.find((e) => e.includes('not focusable'));
    if (notFocusable) {
      throw new Error(`Unexpected browser validation error: ${notFocusable}`);
    }

    console.log('QUOTE_ENGINE_SUBMIT_SMOKE PASS');
    process.exitCode = 0;
  } catch (error) {
    console.error('QUOTE_ENGINE_SUBMIT_SMOKE FAIL', error && error.message ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProc && !serverProc.killed) serverProc.kill();
  }
}

run();
