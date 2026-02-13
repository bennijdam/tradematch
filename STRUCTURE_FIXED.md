# apps/web Structure (Flat App Root)

Max depth: 3

```
apps/web/
|   .gitignore
|   404.html
|   about-us.html
|   app.config.js
|   ask-a-trade.html
|   auth-forgot-password.html
|   auth-login-fixed.js
|   auth-login.html
|   blog.html
|   careers.html
|   compare-platforms (3).html
|   compare-platforms.html
|   cost-calculator.html
|   favicon-16x16.png
|   favicon-32x32.png
|   favicon.ico
|   favicon.svg
|   find-tradespeople.html
|   help-centre.html
|   how-it-works-customer.html
|   how-it-works.html
|   index.html
|   index.html.bak
|   investor-relations.html
|   New pages.zip
|   package.json
|   post-a-job.html
|   question-detail-page.html
|   questions-listing.html
|   README.md
|   robots.txt
|   site.webmanifest
|   sitemap.xml
|   vendor-signup-page.html
|   vercel.json
|
+---dashboard/
|   |   index.html
|   |   vendor-active-quotes.html
|   |   vendor-analytics.html
|   |   vendor-archived-jobs.html
|   |   vendor-badges.html
|   |   vendor-billing.html
|   |   vendor-coverage.html
|   |   vendor-dashboard-enhanced.html
|   |   vendor-dashboard-with-modals.html
|   |   vendor-heatmaps.html
|   |   vendor-impressions.html
|   |   vendor-messages.html
|   |   vendor-new-jobs.html
|   |   vendor-new-leads.html
|   |   vendor-profile.html
|   |   vendor-settings.html
|   |   vendor-timeline.html
|
+---docs/
|   |   ACTIVATION-UX-UPDATE.md
|   |   API-REFERENCE.md
|   |   BILLING_IMPLEMENTATION_GUIDE (1).md
|   |   CHANGELOG.md
|   |   COMBINED_SETTINGS_SUMMARY.md
|   |   COMPLETE_PACKAGE_README.md
|   |   COMPLETE_PAGES_GUIDE.md
|   |   CONNECTION-LAYER-ARCHITECTURE.md
|   |   CONNECTION-LAYER-COMPLETE.md
|   |   CONNECTION-LAYER-HANDOFF.md
|   |   CONNECTION-LAYER-INDEX.md
|   |   CONNECTION-LAYER-INTEGRATION.md
|   |   CONNECTION-LAYER-MANIFEST.md
|   |   CONNECTION-LAYER-STATUS.md
|   |   CONNECTION-LAYER-TESTING.md
|   |   CRUD-OPERATIONS-TEST-SUMMARY.md
|   |   CURRENT-STATUS.md
|   |   CUSTOMER-DASHBOARD-IMPLEMENTATION.md
|   |   CUSTOMER-DASHBOARD-SPEC.md
|   |   DELIVERABLES.md
|   |   DEPLOYMENT.md
|   |   DNS-AND-API-LIST.md
|   |   DOCUMENTATION-INDEX.md
|   |   EMAIL-PREFERENCES.md
|   |   IMPLEMENTATION-SUMMARY.md
|   |   IMPLEMENTATION_GUIDE.md
|   |   IMPLEMENTATION_NOTES (1).md
|   |   IMPLEMENTATION_NOTES.md
|   |   JWT-SECRET-SETUP.md
|   |   LAUNCH-READY.md
|   |   LEAD-PREVIEW-EMAIL-SYSTEM.md
|   |   LEAD-SYSTEM-CHECKLIST.md
|   |   LEAD-SYSTEM-COMPLETE.md
|   |   LEAD-SYSTEM-STATUS.md
|   |   MANUAL-TESTING-GUIDE.md
|   |   MANUAL-TESTING-STATUS.md
|   |   MESSAGING-SYSTEM-REPORT.md
|   |   MESSAGING-SYSTEM.md
|   |   MIGRATION-SETUP.md
|   |   MIGRATION-STATUS.md
|   |   MONITORING-SETUP.md
|   |   NEON-DB-SETUP.md
|   |   POST-DEPLOYMENT-CHECKLIST.md
|   |   PRODUCTION-CHECKLIST.md
|   |   QUICK-REFERENCE.md
|   |   README-QUOTES.md
|   |   README.md
|   |   RENDER-ENV-SETUP.md
|   |   SERVER-MIGRATION.md
|   |   SETTINGS_EXTENDED_SPEC.md
|   |   SETTINGS_EXTENDED_SUMMARY.md
|   |   SETTINGS_EXTENSIONS_GUIDE.md
|   |   SMOKE-TEST-FINDINGS.md
|   |   Super admin blueprint.md
|   |   SUPER-ADMIN-COMPLETE.md
|   |   TESTING-READY-REPORT.md
|   |   UPDATES.md
|   |   USER_DASHBOARD_BLUEPRINT.md
|   |   VENDOR-DASHBOARD-COMPLETE.md
|   |   VENDOR-DASHBOARD-SUMMARY.md
|   |   VENDOR-DASHBOARD-TESTING.md
|   |
|   +---.venv/
|   |   +---Lib/
|   |
|   +---backend/
|   |   +---node_modules/
|   |   +---scripts/
|   |
|   +---backups/
|   |   |   auth-login.html.backup
|   |
|   +---cli/
|   |   |   README.md
|   |   |   SECURITY.md
|   |
|   +---deploy-clean/
|   |   |   README.md
|   |   |   SUPER-ADMIN-SETUP.md
|   |
|   +---docs/
|   |   |   vendor-dashboard-architecture.md
|   |
|   +---frontend/
|   |   |   README-QUOTES.md
|   |   |   README.md
|   |   |   search-demo.md
|   |   +---tradematch-website-complete/
|   |
|   +---snippets/
|       |   favicon-snippet.html
|
+---forgot-password/
|   |   index.html
|
+---images/
|   |   carpentry-optimized.jpg
|   |   carpentry-optimized.webp
|   |   construction-worker.jpg
|   |   construction-worker.webp
|   |   favicon.ico.png
|   |   hero-background-optimized.jpg
|   |   hero-background-optimized.webp
|   |   roofing-optimized.jpg
|   |   roofing-optimized.webp
|   |   unsplash-photo-1503387762-592deb58ef4e.jpg
|   |
|   +---optimized/
|       |   carpentry-optimized-desktop.avif
|       |   carpentry-optimized-desktop.webp
|       |   carpentry-optimized-mobile.avif
|       |   carpentry-optimized-mobile.webp
|       |   hero-background-optimized-desktop.avif
|       |   hero-background-optimized-desktop.webp
|       |   hero-background-optimized-mobile.avif
|       |   hero-background-optimized-mobile.webp
|       |   roofing-optimized-desktop.avif
|       |   roofing-optimized-desktop.webp
|       |   roofing-optimized-mobile.avif
|       |   roofing-optimized-mobile.webp
|       |   unsplash-photo-1503387762-592deb58ef4e-desktop.avif
|       |   unsplash-photo-1503387762-592deb58ef4e-desktop.webp
|       |   unsplash-photo-1503387762-592deb58ef4e-mobile.avif
|       |   unsplash-photo-1503387762-592deb58ef4e-mobile.webp
|
+---login/
|   |   index.html
|
+---New pages/
|   |   about-us.html
|   |   ask-a-trade.html
|   |   blog.html
|   |   careers.html
|   |   compare-platforms.html
|   |   find-tradespeople.html
|   |   help-centre.html
|   |   hero-background.webp
|   |   how-it-works-customer.html
|   |   investor-relations.html
|   |   landing-page.html
|   |   post-a-job.html
|   |   vendor-signup-page.html
|   |
|   +---Blog/
|   |   |   BLOG-SYSTEM-GUIDE.md
|   |   |   blog.html
|   |   |   generate-blog-posts.py
|   |
|   +---Cost Calculator/
|   |   |   inject-to-neon.py
|   |   |   NEXTJS-NEON-DEPLOYMENT-GUIDE.md
|   |   |   nextjs-page.tsx
|   |   |   sitemap-index-route.ts
|   |   |   sitemap-individual-route.ts
|   |
|   +---Localized pages script/
|   |   |   city-trade-seo-page.html
|   |   |   generate-pages-updated.py
|   |   |   hero-background.webp
|   |   |   SETUP-INSTRUCTIONS.md
|   |
|   +---Q&A/
|   |   |   nextjs-question-page.tsx
|   |   |   nextjs-questions-listing.tsx
|   |   |   QA-SYSTEM-DEPLOYMENT-GUIDE.md
|   |   |   question-detail-page.html
|   |   |   questions-listing.html
|   |   |   seed-community-qa.py
|   |
|   +---Updating Menu Script/
|       |   footer.html
|       |   index.html
|       |   README.md
|       |   sync_shell_complete.py
|       |   TRADEMATCH_FINAL_WORKING_PACKAGE.tar.gz
|
+---pages/
|   |   about.html
|   |   activate.html
|   |   analytics-new.html
|   |   api-test.html
|   |   ask-a-trade.html
|   |   auth-register.html
|   |   auth-select-role.html
|   |   blog.html
|   |   careers.html
|   |   compare.html
|   |   contact.html
|   |   cookies.html
|   |   cost-calculator.html
|   |   dashboard.html
|   |   email-preferences.html
|   |   find-tradespeople.html
|   |   heatmaps.html
|   |   help-centre.html
|   |   help.html
|   |   how-it-works-customer.html
|   |   impressions.html
|   |   index.html
|   |   index.html.html
|   |   investor-relations.html
|   |   location-service-enhanced.html
|   |   messages.html
|   |   messaging-system.html
|   |   milestone-manager.html
|   |   payment-checkout.html
|   |   payment-system.html
|   |   post-a-job.html
|   |   postcode-test.html
|   |   privacy.html
|   |   profile.html
|   |   proposal-builder.html
|   |   quote-engine-aiold.html
|   |   quote-engine-withoutai.html
|   |   quote-engine.html
|   |   reviews.html
|   |   settings-combined-final.html
|   |   settings-original-backup.html
|   |   settings.html
|   |   terms.html
|   |   trade-signup.html
|   |   vendor-analytics-new.html
|   |   vendor-analytics.html
|   |   vendor-credits.html
|   |   vendor-heatmaps.html
|   |   vendor-impressions.html
|   |   vendor-messages.html
|   |   vendor-profile.html
|   |   vendor-register.html
|   |   vendor-service-area.html
|   |   vendor-settings-combined-final.html
|   |   vendor-settings-original-backup.html
|   |   vendor-settings.html
|
+---post-job/
|   |   index.html
|
+---register/
|   |   index.html
|
+---scripts/
|   |   verify-structure.js
|
+---shared/
|   +---api/
|   |   |   api.js
|   |   |   auth.js
|   |   |   config.js
|   |   |   endpoints.js
|   |   |   httpClient.js
|   |   |   quotes.js
|   |
|   +---assets/
|   |
|   +---auth/
|   |   |   permissionGuards.js
|   |
|   +---styles/
|   |   |   design-tokens.css
|   |   |   profile-menu.css
|   |
|   +---ui/
|   |   |   profile-menu.js
|   |
|   +---utils/
|       |   ai-enhancement.js
|       |   currency.js
|       |   dates.js
|       |   formatting.js
|
+---signup/
|   |   index.html
|
+---styles/
|   |   homepage-noncritical.css
|
+---super-admin/
|   |   superAdminApp.js
|
+---super-admin-dashboard/
|   |   dashboardApp.js
|   |   index.html
|   +---assets/
|   +---components/
|   +---modals/
|   +---pages/
|   +---routes/
|   |   |   dashboardRouter.js
|   +---services/
|   +---state/
|   +---styles/
|
+---tradematch-website-complete/
|   +---tradematch-website/
|       |   index.html
|       +---api/
|       +---images/
|
+---user-dashboard/
|   |   dashboardApp.js
|   |   index.html
|   +---assets/
|   +---components/
|   +---modals/
|   +---pages/
|   |   |   billing-addons.html
|   |   |   billing.html
|   |   |   dashboard.html
|   |   |   edit-job-modal.html
|   |   |   index.html
|   |   |   job-details.html
|   |   |   job-quotes.html
|   |   |   messages.html
|   |   |   my-jobs.html
|   |   |   notifications.html
|   |   |   post-job.html
|   |   |   profile.html
|   |   |   quotes.html
|   |   |   reviews.html
|   |   |   saved-trades.html
|   |   |   settings.html
|   |   |   your-quotes.html
|   +---routes/
|   |   |   dashboardRouter.js
|   +---services/
|   +---state/
|   +---styles/
|   |   |   styles.css
|
+---vendor-dashboard/
|   |   dashboardApp.js
|   |   index.html
|   +---assets/
|   |   |   messaging-credits-schema.sql
|   |   |   vendor-onboarding-wizard-source.html
|   |   |   vendor-settings.zip
|   +---components/
|   +---modals/
|   |   |   vendor-onboarding-wizard.css
|   |   |   vendor-onboarding-wizard.html
|   |   |   vendor-onboarding-wizard.js
|   +---pages/
|   +---routes/
|   |   |   dashboardRouter.js
|   +---services/
|   |   |   messaging-credits-api.js
|   +---state/
|   +---styles/
|   |   |   vendor-onboarding.css
```
