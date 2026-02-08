const fs = require('fs');

const htmlPath = 'frontend/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>');

if (styleStart < 0 || styleEnd < 0) {
  throw new Error('Style block not found in homepage.');
}

const css = html.slice(styleStart + 7, styleEnd);
const startMarker = '        /* How It Works - Enhanced with Animations */';
const endMarker = '        /* Trustpilot - Transparent, Below Widget */';
const startIndex = css.indexOf(startMarker);
const endIndex = css.indexOf(endMarker);

if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
  throw new Error('CSS markers not found or invalid.');
}

const movedCss = css.slice(startIndex, endIndex).trimEnd();
const newCss = css.slice(0, startIndex) + css.slice(endIndex);

const linkBlock =
  '        <link rel="preload" href="/styles/homepage-noncritical.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n' +
  '        <noscript><link rel="stylesheet" href="/styles/homepage-noncritical.css"></noscript>\n';

const faNoscript =
  '        <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>\n';

let updated = html.slice(0, styleStart + 7) + newCss + html.slice(styleEnd);

if (!updated.includes('/styles/homepage-noncritical.css')) {
  updated = updated.replace(faNoscript, faNoscript + linkBlock);
}

fs.writeFileSync(htmlPath, updated);
fs.writeFileSync('frontend/styles/homepage-noncritical.css', movedCss + '\n');
