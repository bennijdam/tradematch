/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');

const requiredFolders = [
  'user-dashboard',
  'vendor-dashboard',
  'super-admin-dashboard',
  'shared',
  'docs',
  'pages',
  'scripts'
];

const dashboardPageFolders = [
  path.join('user-dashboard', 'pages'),
  path.join('vendor-dashboard', 'pages')
];

const allowedRootHtml = new Set(['index.html']);
const allowedRootMarkdown = new Set(['README.md']);

const errors = [];
const warnings = [];

function checkFolder(relativePath) {
  const target = path.join(frontendRoot, relativePath);
  if (!fs.existsSync(target)) {
    errors.push(`Missing folder: ${relativePath}`);
    return;
  }
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) {
    errors.push(`Expected folder but found file: ${relativePath}`);
  }
}

function listRootFiles() {
  return fs.readdirSync(frontendRoot, { withFileTypes: true });
}

requiredFolders.forEach(checkFolder);

dashboardPageFolders.forEach(checkFolder);

const rootEntries = listRootFiles();
rootEntries.forEach((entry) => {
  if (!entry.isFile()) return;
  const name = entry.name;
  if (name.endsWith('.html') && !allowedRootHtml.has(name)) {
    errors.push(`Unexpected HTML in public root: ${name}`);
  }
  if (name.endsWith('.md') && !allowedRootMarkdown.has(name)) {
    errors.push(`Unexpected Markdown in public root: ${name}`);
  }
});

const pagesDir = path.join(frontendRoot, 'pages');
if (fs.existsSync(pagesDir)) {
  const pageFiles = fs.readdirSync(pagesDir).filter((file) => file.endsWith('.html'));
  if (pageFiles.length === 0) {
    warnings.push('No HTML files found in public/pages.');
  }
}

if (errors.length > 0) {
  console.error('Structure verification failed:');
  errors.forEach((message) => console.error(`- ${message}`));
  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    warnings.forEach((message) => console.warn(`- ${message}`));
  }
  process.exit(1);
}

console.log('Public structure verified.');
if (warnings.length > 0) {
  console.warn('Warnings:');
  warnings.forEach((message) => console.warn(`- ${message}`));
}
