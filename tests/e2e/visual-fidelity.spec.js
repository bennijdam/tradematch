const { test, expect } = require('@playwright/test');
const { PNG } = require('pngjs');

const VIEWPORT = { width: 1536, height: 824 };
const MAX_MISMATCH_RATIO = Number(process.env.VISUAL_MAX_MISMATCH_RATIO || '0.07');

const FREEZE_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
  html {
    scroll-behavior: auto !important;
  }
`;

async function applyStabilityStyles(page) {
  await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});

  const childFrames = page
    .frames()
    .filter((frame) => frame !== page.mainFrame() && frame.url().startsWith('http'));

  for (const frame of childFrames) {
    await frame
      .addStyleTag({ content: FREEZE_CSS })
      .catch(() => {});
  }
}

async function captureBuffer(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await applyStabilityStyles(page);
  await page.waitForTimeout(1200);
  return page.screenshot({ fullPage: false });
}

async function compareModeScreenshots(page, iframePath, nativePath) {
  const { default: pixelmatch } = await import('pixelmatch');

  const iframeBuffer = await captureBuffer(page, iframePath);
  const nativeBuffer = await captureBuffer(page, nativePath);

  const iframePng = PNG.sync.read(iframeBuffer);
  const nativePng = PNG.sync.read(nativeBuffer);

  if (iframePng.width !== nativePng.width || iframePng.height !== nativePng.height) {
    throw new Error('Screenshot dimensions mismatch between iframe and native modes');
  }

  const diff = new PNG({ width: iframePng.width, height: iframePng.height });

  const mismatchedPixels = pixelmatch(
    iframePng.data,
    nativePng.data,
    diff.data,
    iframePng.width,
    iframePng.height,
    { threshold: 0.1 }
  );

  const totalPixels = iframePng.width * iframePng.height;
  const ratio = mismatchedPixels / totalPixels;

  const regions = [
    { key: 'topLeft', x0: 0, y0: 0, x1: Math.floor(iframePng.width / 2), y1: Math.floor(iframePng.height / 2) },
    { key: 'topRight', x0: Math.floor(iframePng.width / 2), y0: 0, x1: iframePng.width, y1: Math.floor(iframePng.height / 2) },
    { key: 'bottomLeft', x0: 0, y0: Math.floor(iframePng.height / 2), x1: Math.floor(iframePng.width / 2), y1: iframePng.height },
    { key: 'bottomRight', x0: Math.floor(iframePng.width / 2), y0: Math.floor(iframePng.height / 2), x1: iframePng.width, y1: iframePng.height },
  ];

  const regionStats = regions.map((region) => {
    const regionWidth = region.x1 - region.x0;
    const regionHeight = region.y1 - region.y0;
    const regionIFrameData = new Uint8ClampedArray(regionWidth * regionHeight * 4);
    const regionNativeData = new Uint8ClampedArray(regionWidth * regionHeight * 4);

    for (let y = 0; y < regionHeight; y += 1) {
      for (let x = 0; x < regionWidth; x += 1) {
        const sourceOffset = ((region.y0 + y) * iframePng.width + (region.x0 + x)) * 4;
        const targetOffset = (y * regionWidth + x) * 4;

        regionIFrameData[targetOffset + 0] = iframePng.data[sourceOffset + 0];
        regionIFrameData[targetOffset + 1] = iframePng.data[sourceOffset + 1];
        regionIFrameData[targetOffset + 2] = iframePng.data[sourceOffset + 2];
        regionIFrameData[targetOffset + 3] = iframePng.data[sourceOffset + 3];

        regionNativeData[targetOffset + 0] = nativePng.data[sourceOffset + 0];
        regionNativeData[targetOffset + 1] = nativePng.data[sourceOffset + 1];
        regionNativeData[targetOffset + 2] = nativePng.data[sourceOffset + 2];
        regionNativeData[targetOffset + 3] = nativePng.data[sourceOffset + 3];
      }
    }

    const regionMismatchedPixels = pixelmatch(
      regionIFrameData,
      regionNativeData,
      null,
      regionWidth,
      regionHeight,
      { threshold: 0.1 }
    );

    const regionTotalPixels = regionWidth * regionHeight;
    return {
      key: region.key,
      mismatchedPixels: regionMismatchedPixels,
      totalPixels: regionTotalPixels,
      ratio: regionMismatchedPixels / regionTotalPixels,
    };
  });

  const metrics = {
    iframePath,
    nativePath,
    mismatchedPixels,
    totalPixels,
    ratio,
    regionStats,
  };

  console.log(`[visual-fidelity] ${iframePath} vs ${nativePath} :: ratio=${ratio.toFixed(6)} (${mismatchedPixels}/${totalPixels})`);
  regionStats.forEach((region) => {
    console.log(
      `[visual-fidelity]   ${region.key}=${region.ratio.toFixed(6)} (${region.mismatchedPixels}/${region.totalPixels})`
    );
  });

  test.info().attach('iframe-native-diff.png', {
    body: PNG.sync.write(diff),
    contentType: 'image/png',
  });

  test.info().attach('iframe-native-metrics.json', {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json',
  });

  return { ratio, mismatchedPixels, totalPixels };
}

test.describe('@sanity visual fidelity', () => {
  test.use({ viewport: VIEWPORT });

  test('vendor iframe vs native diff stays under threshold', async ({ page }) => {
    const { ratio, mismatchedPixels, totalPixels } = await compareModeScreenshots(
      page,
      '/vendor/dashboard',
      '/vendor/dashboard?test-native=true'
    );

    expect(
      ratio,
      `Vendor mismatch ratio ${ratio.toFixed(4)} exceeded ${MAX_MISMATCH_RATIO}. mismatched=${mismatchedPixels}/${totalPixels}`
    ).toBeLessThanOrEqual(MAX_MISMATCH_RATIO);
  });

  test('customer iframe vs native diff stays under threshold', async ({ page }) => {
    const { ratio, mismatchedPixels, totalPixels } = await compareModeScreenshots(
      page,
      '/customer/dashboard',
      '/customer/dashboard?test-native=true'
    );

    expect(
      ratio,
      `Customer mismatch ratio ${ratio.toFixed(4)} exceeded ${MAX_MISMATCH_RATIO}. mismatched=${mismatchedPixels}/${totalPixels}`
    ).toBeLessThanOrEqual(MAX_MISMATCH_RATIO);
  });
});
