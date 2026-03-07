const { test, expect } = require('@playwright/test');
const { PNG } = require('pngjs');

const VIEWPORT = { width: 1536, height: 824 };
const MAX_MISMATCH_RATIO = Number(
  process.env.SUPER_ADMIN_VISUAL_MAX_MISMATCH_RATIO
  || process.env.VISUAL_MAX_MISMATCH_RATIO
  || '0.07'
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
  #super-admin-mode-toggle,
  #super-admin-runtime-notice {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
  }
`;

const SUPER_ADMIN_USER = {
  userId: 'local-super-admin',
  email: 'admin@tradematch.com',
  name: 'Super Admin',
  role: 'super_admin'
};

function withMode(mode) {
  return `/super-admin-dashboard-index.html?mode=${mode}#/super-admin/dashboard`;
}

async function bootstrapSuperAdminAuth(page) {
  await page.addInitScript((user) => {
    localStorage.setItem('admin_token', `local-super-admin-${Date.now()}`);
    localStorage.setItem('admin_user', JSON.stringify(user));
  }, SUPER_ADMIN_USER);
}

async function applyStabilityStyles(page) {
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});

  const childFrames = page
    .frames()
    .filter((frame) => frame !== page.mainFrame() && frame.url().startsWith('http'));

  for (const frame of childFrames) {
    await frame.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
  }
}

async function captureBuffer(page, path) {
  await bootstrapSuperAdminAuth(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await applyStabilityStyles(page);
  await page.waitForTimeout(1400);
  return page.screenshot({ fullPage: false });
}

async function compareModeScreenshots(page, nativePath, legacyPath) {
  const { default: pixelmatch } = await import('pixelmatch');

  const nativeBuffer = await captureBuffer(page, nativePath);
  const legacyBuffer = await captureBuffer(page, legacyPath);

  const nativePng = PNG.sync.read(nativeBuffer);
  const legacyPng = PNG.sync.read(legacyBuffer);

  if (nativePng.width !== legacyPng.width || nativePng.height !== legacyPng.height) {
    throw new Error('Screenshot dimensions mismatch between native and legacy modes');
  }

  const diff = new PNG({ width: nativePng.width, height: nativePng.height });

  const mismatchedPixels = pixelmatch(
    nativePng.data,
    legacyPng.data,
    diff.data,
    nativePng.width,
    nativePng.height,
    { threshold: 0.1 }
  );

  const totalPixels = nativePng.width * nativePng.height;
  const ratio = mismatchedPixels / totalPixels;

  const metrics = {
    nativePath,
    legacyPath,
    mismatchedPixels,
    totalPixels,
    ratio
  };

  console.log(
    `[visual-super-admin] ${nativePath} vs ${legacyPath} :: ratio=${ratio.toFixed(6)} (${mismatchedPixels}/${totalPixels})`
  );

  test.info().attach('super-admin-native-legacy-diff.png', {
    body: PNG.sync.write(diff),
    contentType: 'image/png'
  });

  test.info().attach('super-admin-native-legacy-metrics.json', {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json'
  });

  return { ratio, mismatchedPixels, totalPixels };
}

test.describe('@sanity super-admin visual parity', () => {
  test.use({ viewport: VIEWPORT });

  test('super admin native vs legacy diff stays under threshold', async ({ page }) => {
    const nativePath = withMode('native');
    const legacyPath = withMode('legacy');

    const { ratio, mismatchedPixels, totalPixels } = await compareModeScreenshots(
      page,
      nativePath,
      legacyPath
    );

    expect(
      ratio,
      `Super admin mismatch ratio ${ratio.toFixed(4)} exceeded ${MAX_MISMATCH_RATIO}. mismatched=${mismatchedPixels}/${totalPixels}`
    ).toBeLessThanOrEqual(MAX_MISMATCH_RATIO);
  });
});
