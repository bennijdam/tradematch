const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pathsToRemove = [
  'frontend/seo-generator/generated-pages',
  'frontend/seo-generator/generated-pages.tmp',
  'seo-pages'
].map((p) => path.join(root, p));

for (const target of pathsToRemove) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    // eslint-disable-next-line no-console
    console.log(`Removed ${target}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Skipped ${target}: ${error.message}`);
  }
}
