/**
 * Script to add AuthGuard to all dashboard HTML files
 * Run with: node scripts/add-auth-guards.js
 */

const fs = require('fs');
const path = require('path');

// Dashboard files to update
const dashboardFiles = [
  // Vendor dashboards
  'apps/web/vendor-dashboard/native/vendor-dashboard.html',
  'extracted/vendor-dashboard/vendor-dashboard.html',
  'extracted/vendor-dashboard/vendor-settings.html',
  'extracted/vendor-dashboard/vendor-help-support.html',
  'extracted/vendor-dashboard/vendor-dispute-centre.html',
  'extracted/vendor-dashboard/vendor-credentials-vault.html',
  'extracted/vendor-dashboard/vendor-my-profile.html',
  'extracted/vendor-dashboard/vendor-coverage-map.html',
  'extracted/vendor-dashboard/vendor-analytics.html',
  'extracted/vendor-dashboard/vendor-reviews.html',
  'extracted/vendor-dashboard/vendor-messages.html',
  'extracted/vendor-dashboard/vendor-heatmaps.html',
  'extracted/vendor-dashboard/vendor-active-jobs.html',
  
  // Customer dashboards  
  'apps/web/user-dashboard/native/customer-dashboard.html',
  'extracted/user-dashboard/user-dashboard.html',
  'extracted/user-dashboard/user-settings.html',
  'extracted/user-dashboard/user-verification_hub-premiumaddon.html',
  'extracted/user-dashboard/user-verification_hub.html',
  'extracted/user-dashboard/user-dispute-centre.html',
  'extracted/user-dashboard/user-document-vault.html',
  'extracted/user-dashboard/user-payment-success.html',
  'extracted/user-dashboard/user-compare-quotes.html',
  'extracted/user-dashboard/user-messages.html',
  
  // Admin dashboards
  'apps/web-next/public/super-admin-dashboard.html',
  'apps/web-next/public/super-admin-sentinel.html',
  'apps/web/super-admin-dashboard-index.html',
];

const authGuardScript = `
<!-- Auth Guard - Protects dashboard from unauthorized access -->
<script src="/js/auth-guard.js"></script>
`;

function addAuthGuard(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Skipping (not found): ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if auth guard already exists
  if (content.includes('auth-guard.js')) {
    console.log(`✓ Already has auth guard: ${filePath}`);
    return true;
  }
  
  // Find the closing </head> tag and insert before it
  if (content.includes('</head>')) {
    content = content.replace('</head>', `${authGuardScript}</head>`);
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Added auth guard: ${filePath}`);
    return true;
  }
  
  // If no </head>, try to find </title> and insert after
  if (content.includes('</title>')) {
    content = content.replace('</title>', `</title>${authGuardScript}`);
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Added auth guard: ${filePath}`);
    return true;
  }
  
  console.log(`❌ Could not find insertion point: ${filePath}`);
  return false;
}

console.log('🔐 Adding Auth Guards to Dashboards...\n');

let successCount = 0;
let skipCount = 0;
let failCount = 0;

dashboardFiles.forEach(file => {
  const result = addAuthGuard(file);
  if (result === true) {
    successCount++;
  } else if (result === false && fs.existsSync(path.join(process.cwd(), file))) {
    failCount++;
  } else {
    skipCount++;
  }
});

console.log('\n📊 Summary:');
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ⚠️  Skipped (not found): ${skipCount}`);
console.log(`   ❌ Failed: ${failCount}`);
console.log(`\n🔐 Auth guards added successfully!`);
