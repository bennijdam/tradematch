const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targetDir = path.join(root, 'frontend');

const navSelectors = [
    '.nav-links',
    'nav',
    'header nav',
    '.navbar',
    '.nav-container',
    '.top-nav',
    '.nav',
    '.menu',
    '.header-actions',
    '.auth-links',
    '.breadcrumb',
    'header'
];

const htmlFiles = [];

const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            htmlFiles.push(fullPath);
        }
    }
};

walk(targetDir);

const results = [];

const stripScripts = (content) => content.replace(/<script[\s\S]*?<\/script>/gi, '');

const hasProfileMenuAssets = (content) => {
    const hasCss = /profile-menu\.css/i.test(content);
    const hasJs = /profile-menu\.js/i.test(content);
    return { hasCss, hasJs };
};

const hasVendorDashboardLink = (content) => {
    const withoutScripts = stripScripts(content);
    return /vendor-dashboard\.html/i.test(withoutScripts);
};

const hasNavVariant = (content) => {
    return navSelectors.some((selector) => {
        if (selector.includes(' ')) {
            const [first, second] = selector.split(' ');
            return new RegExp(first.replace('.', '\\.') + '[^>]*>', 'i').test(content)
                && new RegExp(second.replace('.', '\\.') + '[^>]*>', 'i').test(content);
        }
        return new RegExp(selector.replace('.', '\\.') + '[^>]*>', 'i').test(content);
    });
};

for (const filePath of htmlFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(root, filePath).replace(/\\/g, '/');
    const vendorLink = hasVendorDashboardLink(content);
    const assets = hasProfileMenuAssets(content);
    const navVariant = hasNavVariant(content);

    if (vendorLink) {
        results.push({
            file: rel,
            vendorLink,
            hasCss: assets.hasCss,
            hasJs: assets.hasJs,
            navVariant
        });
    }
}

const missingAssets = results.filter((r) => !(r.hasCss && r.hasJs));
const missingNavVariant = results.filter((r) => !r.navVariant);

console.log('Profile Menu Validation Report');
console.log('==============================');
console.log(`Files with vendor-dashboard links: ${results.length}`);

if (missingAssets.length) {
    console.log('\nFiles missing profile-menu assets:');
    for (const item of missingAssets) {
        console.log(`- ${item.file} (css:${item.hasCss} js:${item.hasJs})`);
    }
} else {
    console.log('\nAll vendor-dashboard pages include profile-menu assets.');
}

if (missingNavVariant.length) {
    console.log('\nFiles without known nav containers (may need manual check):');
    for (const item of missingNavVariant) {
        console.log(`- ${item.file}`);
    }
} else {
    console.log('\nAll vendor-dashboard pages have a known nav container match.');
}
