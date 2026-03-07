const { test, expect } = require('@playwright/test');
const { PNG } = require('pngjs');

const VIEWPORT = { width: 1536, height: 824 };
const MAX_MISMATCH_RATIO = Number(
  process.env.SUPER_ADMIN_VISUAL_MAX_MISMATCH_RATIO
  || process.env.VISUAL_MAX_MISMATCH_RATIO
  || '0.02'
);

const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  html {
    scroll-behavior: auto !important;
  }
  .controls,
  .runtimeBadge,
  .sentinelBot {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }
`;

async function applyStabilityStyles(page) {
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});

  const childFrames = page
    .frames()
    .filter((frame) => frame !== page.mainFrame() && frame.url().startsWith('http'));

  for (const frame of childFrames) {
    await frame.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
  }
}

async function captureModeBuffer({ page, path, mode, forceLegacyMissing = false }) {
  await page.context().clearCookies();

  await page.addInitScript((renderMode) => {
    window.localStorage.setItem('tm-render-mode', renderMode);
  }, mode);

  if (forceLegacyMissing) {
    await page.route('**/legacy-pages/*.html', async (route, request) => {
      if (request.method() === 'HEAD' || request.method() === 'GET') {
        await route.fulfill({
          status: 404,
          body: 'not found',
          contentType: 'text/plain',
        });
        return;
      }
      await route.continue();
    });
  }

  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await applyStabilityStyles(page);
  await page.waitForTimeout(1300);

  const screenshot = await page.screenshot({ fullPage: false });

  if (forceLegacyMissing) {
    await page.unroute('**/legacy-pages/*.html');
  }

  return screenshot;
}

async function compareBuffers(nativeBuffer, legacyFallbackBuffer) {
  const { default: pixelmatch } = await import('pixelmatch');

  const nativePng = PNG.sync.read(nativeBuffer);
  const fallbackPng = PNG.sync.read(legacyFallbackBuffer);

  if (nativePng.width !== fallbackPng.width || nativePng.height !== fallbackPng.height) {
    throw new Error('Screenshot dimensions mismatch between native and legacy-fallback modes');
  }

  const diff = new PNG({ width: nativePng.width, height: nativePng.height });

  const mismatchedPixels = pixelmatch(
    nativePng.data,
    fallbackPng.data,
    diff.data,
    nativePng.width,
    nativePng.height,
    { threshold: 0.2 }
  );

  const totalPixels = nativePng.width * nativePng.height;
  const ratio = mismatchedPixels / totalPixels;

  return {
    ratio,
    mismatchedPixels,
    totalPixels,
    diff,
  };
}

test.describe('@sanity web-next super-admin parity', () => {
  test.use({ viewport: VIEWPORT });

  test('native vs legacy-fallback diff stays under threshold', async ({ page }) => {
    const route = '/super-admin/dashboard?view=infra-health';

    const nativeBuffer = await captureModeBuffer({
      page,
      path: route,
      mode: 'native',
      forceLegacyMissing: false,
    });

    const legacyFallbackBuffer = await captureModeBuffer({
      page,
      path: route,
      mode: 'legacy',
      forceLegacyMissing: true,
    });

    const { ratio, mismatchedPixels, totalPixels, diff } = await compareBuffers(
      nativeBuffer,
      legacyFallbackBuffer
    );

    console.log(
      `[visual-super-admin-web-next] ${route} native vs legacy-fallback :: ratio=${ratio.toFixed(6)} (${mismatchedPixels}/${totalPixels})`
    );

    test.info().attach('super-admin-web-next-diff.png', {
      body: PNG.sync.write(diff),
      contentType: 'image/png',
    });

    test.info().attach('super-admin-web-next-metrics.json', {
      body: Buffer.from(
        JSON.stringify(
          {
            route,
            nativeMode: 'native',
            legacyMode: 'legacy-fallback',
            ratio,
            mismatchedPixels,
            totalPixels,
          },
          null,
          2
        )
      ),
      contentType: 'application/json',
    });

    expect(
      ratio,
      `Super-admin web-next mismatch ratio ${ratio.toFixed(4)} exceeded ${MAX_MISMATCH_RATIO}. mismatched=${mismatchedPixels}/${totalPixels}`
    ).toBeLessThanOrEqual(MAX_MISMATCH_RATIO);
  });
});
