# apps/web Structure

Auth pages location:
- apps/web/login.html
- apps/web/forgot-password.html
- apps/web/register.html
- apps/web/auth-signup.html

Full directory tree (depth 3, excluding node_modules and .venv):

```
apps/web
+---.gitignore
+---404.html
+---about.html
+---about-us.html
+---activate.html
+---analytics-new.html
+---api-test.html
+---app.config.js
+---ask-a-trade.html
+---auth.js
+---auth-select-role.html
+---auth-signup.html
+---billing.html
+---billing-addons.html
+---blog.html
+---blog-blog.html
+---careers.html
+---city-trade-seo-page.html
+---compare.html
+---compare-platforms (3).html
+---compare-platforms.html
+---contact.html
+---cookies.html
+---cost-calculator.html
+---customer-dashboard.html
+---dashboard.html
+---dashboard-vendor-analytics.html
+---dashboard-vendor-heatmaps.html
+---dashboard-vendor-impressions.html
+---dashboard-vendor-messages.html
+---dashboard-vendor-profile.html
+---dashboard-vendor-settings.html
+---edit-job-modal.html
+---email-preferences.html
+---favicon.ico
+---favicon.svg
+---favicon-16x16.png
+---favicon-32x32.png
+---favicon-snippet.html
+---find-tradespeople.html
+---footer.html
+---forgot-password.html
+---forgot-password-index.html
+---heatmaps.html
+---help.html
+---help-centre.html
+---how-it-works.html
+---how-it-works-customer.html
+---impressions.html
+---index.html
+---index.html.html
+---investor-relations.html
+---job-details.html
+---job-quotes.html
+---landing-page.html
+---location-service-enhanced.html
+---login.html
+---login-index.html
+---messages.html
+---messaging-system.html
+---milestone-manager.html
+---my-jobs.html
+---New pages.zip
+---new-pages-about-us.html
+---new-pages-ask-a-trade.html
+---new-pages-blog.html
+---new-pages-careers.html
+---new-pages-compare-platforms.html
+---new-pages-find-tradespeople.html
+---new-pages-help-centre.html
+---new-pages-how-it-works-customer.html
+---new-pages-investor-relations.html
+---new-pages-post-a-job.html
+---new-pages-vendor-signup-page.html
+---notifications.html
+---package.json
+---payment-checkout.html
+---payment-system.html
+---post-a-job.html
+---postcode-test.html
+---post-job.html
+---post-job-index.html
+---privacy.html
+---profile.html
+---proposal-builder.html
+---q&a-question-detail-page.html
+---q&a-questions-listing.html
+---question-detail-page.html
+---questions-listing.html
+---quote-engine.html
+---quote-engine-aiold.html
+---quote-engine-withoutai.html
+---quotes.html
+---README.md
+---register.html
+---register-index.html
+---reviews.html
+---robots.txt
+---saved-trades.html
+---settings.html
+---settings-combined-final.html
+---settings-original-backup.html
+---site.webmanifest
+---sitemap.xml
+---super-admin-dashboard-index.html
+---terms.html
+---tradematch-website-index.html
+---trade-signup.html
+---updating-menu-script-index.html
+---user-dashboard-dashboard.html
+---user-dashboard-index.html
+---user-dashboard-messages.html
+---user-dashboard-profile.html
+---user-dashboard-reviews.html
+---user-dashboard-settings.html
+---user-home.html
+---vendor-active-quotes.html
+---vendor-analytics.html
+---vendor-analytics-new.html
+---vendor-archived-jobs.html
+---vendor-badges.html
+---vendor-billing.html
+---vendor-coverage.html
+---vendor-credits.html
+---vendor-dashboard.html
+---vendor-dashboard-enhanced.html
+---vendor-heatmaps.html
+---vendor-home.html
+---vendor-impressions.html
+---vendor-messages.html
+---vendor-new-jobs.html
+---vendor-new-leads.html
+---vendor-onboarding-wizard.html
+---vendor-onboarding-wizard-source.html
+---vendor-profile.html
+---vendor-register.html
+---vendor-service-area.html
+---vendor-settings.html
+---vendor-settings-combined-final.html
+---vendor-settings-original-backup.html
+---vendor-signup-page.html
+---vendor-timeline.html
+---vercel.json
+---your-quotes.html
+---docs
|   +---ACTIVATION-UX-UPDATE.md
|   +---API-REFERENCE.md
|   +---BILLING_IMPLEMENTATION_GUIDE (1).md
|   +---CHANGELOG.md
|   +---COMBINED_SETTINGS_SUMMARY.md
|   +---COMPLETE_PACKAGE_README.md
|   +---COMPLETE_PAGES_GUIDE.md
|   +---CONNECTION-LAYER-ARCHITECTURE.md
|   +---CONNECTION-LAYER-COMPLETE.md
|   +---CONNECTION-LAYER-HANDOFF.md
|   +---CONNECTION-LAYER-INDEX.md
|   +---CONNECTION-LAYER-INTEGRATION.md
|   +---CONNECTION-LAYER-MANIFEST.md
|   +---CONNECTION-LAYER-STATUS.md
|   +---CONNECTION-LAYER-TESTING.md
|   +---CRUD-OPERATIONS-TEST-SUMMARY.md
|   +---CURRENT-STATUS.md
|   +---CUSTOMER-DASHBOARD-IMPLEMENTATION.md
|   +---CUSTOMER-DASHBOARD-SPEC.md
|   +---DELIVERABLES.md
|   +---DEPLOYMENT.md
|   +---DNS-AND-API-LIST.md
|   +---DOCUMENTATION-INDEX.md
|   +---EMAIL-PREFERENCES.md
|   +---IMPLEMENTATION_GUIDE.md
|   +---IMPLEMENTATION_NOTES (1).md
|   +---IMPLEMENTATION_NOTES.md
|   +---IMPLEMENTATION-SUMMARY.md
|   +---JWT-SECRET-SETUP.md
|   +---LAUNCH-READY.md
|   +---LEAD-PREVIEW-EMAIL-SYSTEM.md
|   +---LEAD-SYSTEM-CHECKLIST.md
|   +---LEAD-SYSTEM-COMPLETE.md
|   +---LEAD-SYSTEM-STATUS.md
|   +---MANUAL-TESTING-GUIDE.md
|   +---MANUAL-TESTING-STATUS.md
|   +---MESSAGING-SYSTEM.md
|   +---MESSAGING-SYSTEM-REPORT.md
|   +---MIGRATION-SETUP.md
|   +---MIGRATION-STATUS.md
|   +---MONITORING-SETUP.md
|   +---NEON-DB-SETUP.md
|   +---POST-DEPLOYMENT-CHECKLIST.md
|   +---PRODUCTION-CHECKLIST.md
|   +---QUICK-REFERENCE.md
|   +---README.md
|   +---README-QUOTES.md
|   +---RENDER-ENV-SETUP.md
|   +---SERVER-MIGRATION.md
|   +---SETTINGS_EXTENDED_SPEC.md
|   +---SETTINGS_EXTENDED_SUMMARY.md
|   +---SETTINGS_EXTENSIONS_GUIDE.md
|   +---SMOKE-TEST-FINDINGS.md
|   +---Super admin blueprint.md
|   +---SUPER-ADMIN-COMPLETE.md
|   +---TESTING-READY-REPORT.md
|   +---UPDATES.md
|   +---USER_DASHBOARD_BLUEPRINT.md
|   +---VENDOR-DASHBOARD-COMPLETE.md
|   +---VENDOR-DASHBOARD-SUMMARY.md
|   +---VENDOR-DASHBOARD-TESTING.md
|   +---backend
|   |   +---scripts
|   |       +---README.md
|   +---backups
|   |   +---auth-login.html.backup
|   +---cli
|   |   +---README.md
|   |   +---SECURITY.md
|   +---deploy-clean
|   |   +---README.md
|   |   +---SUPER-ADMIN-SETUP.md
|   +---docs
|   |   +---vendor-dashboard-architecture.md
|   +---frontend
|       +---README.md
|       +---README-QUOTES.md
|       +---search-demo.md
|       +---tradematch-website-complete
|           +---tradematch-website
+---images
|   +---carpentry-optimized.jpg
|   +---carpentry-optimized.webp
|   +---construction-worker.jpg
|   +---construction-worker.webp
|   +---favicon.ico.png
|   +---hero-background-optimized.jpg
|   +---hero-background-optimized.webp
|   +---roofing-optimized.jpg
|   +---roofing-optimized.webp
|   +---unsplash-photo-1503387762-592deb58ef4e.jpg
|   +---optimized
|       +---carpentry-optimized-desktop.avif
|       +---carpentry-optimized-desktop.webp
|       +---carpentry-optimized-mobile.avif
|       +---carpentry-optimized-mobile.webp
|       +---hero-background-optimized-desktop.avif
|       +---hero-background-optimized-desktop.webp
|       +---hero-background-optimized-mobile.avif
|       +---hero-background-optimized-mobile.webp
|       +---roofing-optimized-desktop.avif
|       +---roofing-optimized-desktop.webp
|       +---roofing-optimized-mobile.avif
|       +---roofing-optimized-mobile.webp
|       +---unsplash-photo-1503387762-592deb58ef4e-desktop.avif
|       +---unsplash-photo-1503387762-592deb58ef4e-desktop.webp
|       +---unsplash-photo-1503387762-592deb58ef4e-mobile.avif
|       +---unsplash-photo-1503387762-592deb58ef4e-mobile.webp
+---New pages
|   +---hero-background.webp
|   +---Blog
|   |   +---BLOG-SYSTEM-GUIDE.md
|   |   +---generate-blog-posts.py
|   +---Cost Calculator
|   |   +---inject-to-neon.py
|   |   +---NEXTJS-NEON-DEPLOYMENT-GUIDE.md
|   |   +---nextjs-page.tsx
|   |   +---sitemap-index-route.ts
|   |   +---sitemap-individual-route.ts
|   +---Localized pages script
|   |   +---generate-pages-updated.py
|   |   +---hero-background.webp
|   |   +---SETUP-INSTRUCTIONS.md
|   +---Q&A
|   |   +---nextjs-question-page.tsx
|   |   +---nextjs-questions-listing.tsx
|   |   +---QA-SYSTEM-DEPLOYMENT-GUIDE.md
|   |   +---seed-community-qa.py
|   +---Updating Menu Script
|       +---README.md
|       +---sync_shell_complete.py
|       +---TRADEMATCH_FINAL_WORKING_PACKAGE.tar.gz
+---scripts
|   +---verify-structure.js
+---shared
|   +---api
|   |   +---api.js
|   |   +---auth.js
|   |   +---config.js
|   |   +---endpoints.js
|   |   +---httpClient.js
|   |   +---quotes.js
|   +---auth
|   |   +---permissionGuards.js
|   +---styles
|   |   +---design-tokens.css
|   |   +---profile-menu.css
|   +---ui
|   |   +---profile-menu.js
|   +---utils
|       +---ai-enhancement.js
|       +---currency.js
|       +---dates.js
|       +---formatting.js
+---styles
|   +---homepage-noncritical.css
+---super-admin
|   +---superAdminApp.js
+---super-admin-dashboard
|   +---dashboardApp.js
|   +---routes
|       +---dashboardRouter.js
+---tradematch-website-complete
|   +---tradematch-website
|       +---api
|       |   +---config.js
|       +---images
|           +---carpentry-optimized.jpg
|           +---carpentry-optimized.webp
|           +---hero-background-optimized.jpg
|           +---hero-background-optimized.webp
|           +---roofing-optimized.jpg
|           +---roofing-optimized.webp
+---user-dashboard
|   +---dashboardApp.js
|   +---routes
|   |   +---dashboardRouter.js
|   +---styles
|       +---styles.css
+---vendor-dashboard
    +---dashboardApp.js
    +---assets
    |   +---messaging-credits-schema.sql
    |   +---vendor-settings.zip
    +---modals
    |   +---vendor-onboarding-wizard.css
    |   +---vendor-onboarding-wizard.js
    +---routes
    |   +---dashboardRouter.js
    +---services
    |   +---messaging-credits-api.js
    +---styles
        +---vendor-onboarding.css
```
