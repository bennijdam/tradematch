# apps/web Structure

Auth pages location:
- apps/web/pages/auth-login.html
- apps/web/pages/auth-forgot-password.html

Full directory tree:

```
Folder PATH listing
Volume serial number is F8A7-2C57
C:\USERS\ASUS\DESKTOP\TRADEMATCH-FIXED\APPS\WEB
|   .gitignore
|   404.html
|   about-us.html
|   app.config.js
|   ask-a-trade.html
|   auth-login-fixed.js
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
+---docs
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
|   +---.venv
|   |   \---Lib
|   |       \---site-packages
|   |           +---pip
|   |           |   \---_vendor
|   |           |       \---idna
|   |           |               LICENSE.md
|   |           |               
|   |           \---pip-25.3.dist-info
|   |               \---licenses
|   |                   \---src
|   |                       \---pip
|   |                           \---_vendor
|   |                               \---idna
|   |                                       LICENSE.md
|   |                                       
|   +---backend
|   |   +---node_modules
|   |   |   +---@aws
|   |   |   |   \---lambda-invoke-store
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@aws-crypto
|   |   |   |   +---crc32
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---crc32c
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---sha1-browser
|   |   |   |   |   |   CHANGELOG.md
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       \---@smithy
|   |   |   |   |           +---is-array-buffer
|   |   |   |   |           |       README.md
|   |   |   |   |           |       
|   |   |   |   |           +---util-buffer-from
|   |   |   |   |           |       README.md
|   |   |   |   |           |       
|   |   |   |   |           \---util-utf8
|   |   |   |   |                   README.md
|   |   |   |   |                   
|   |   |   |   +---sha256-browser
|   |   |   |   |   |   CHANGELOG.md
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       \---@smithy
|   |   |   |   |           +---is-array-buffer
|   |   |   |   |           |       README.md
|   |   |   |   |           |       
|   |   |   |   |           +---util-buffer-from
|   |   |   |   |           |       README.md
|   |   |   |   |           |       
|   |   |   |   |           \---util-utf8
|   |   |   |   |                   README.md
|   |   |   |   |                   
|   |   |   |   +---sha256-js
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---supports-web-crypto
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---util
|   |   |   |       |   CHANGELOG.md
|   |   |   |       |   README.md
|   |   |   |       |   
|   |   |   |       \---node_modules
|   |   |   |           \---@smithy
|   |   |   |               +---is-array-buffer
|   |   |   |               |       README.md
|   |   |   |               |       
|   |   |   |               +---util-buffer-from
|   |   |   |               |       README.md
|   |   |   |               |       
|   |   |   |               \---util-utf8
|   |   |   |                       README.md
|   |   |   |                       
|   |   |   +---@aws-sdk
|   |   |   |   +---client-s3
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---client-sso
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---core
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---crc64-nvme
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-env
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-http
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-ini
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-login
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-process
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-sso
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-web-identity
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-bucket-endpoint
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-expect-continue
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-flexible-checksums
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-host-header
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-location-constraint
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-logger
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-recursion-detection
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-sdk-s3
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-ssec
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-user-agent
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---nested-clients
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---region-config-resolver
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---s3-request-presigner
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---signature-v4-multi-region
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---token-providers
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---types
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-arn-parser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-endpoints
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-format-url
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-locate-window
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-user-agent-browser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-user-agent-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---xml-builder
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@babel
|   |   |   |   +---code-frame
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---compat-data
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---core
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       +---debug
|   |   |   |   |       |       README.md
|   |   |   |   |       |       
|   |   |   |   |       +---ms
|   |   |   |   |       |       license.md
|   |   |   |   |       |       readme.md
|   |   |   |   |       |       
|   |   |   |   |       \---semver
|   |   |   |   |               README.md
|   |   |   |   |               
|   |   |   |   +---generator
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-compilation-targets
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       \---semver
|   |   |   |   |               README.md
|   |   |   |   |               
|   |   |   |   +---helper-globals
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-module-imports
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-module-transforms
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-plugin-utils
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-string-parser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-validator-identifier
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helper-validator-option
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---helpers
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---parser
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-async-generators
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-bigint
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-class-properties
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-class-static-block
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-import-attributes
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-import-meta
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-json-strings
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-jsx
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-logical-assignment-operators
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-nullish-coalescing-operator
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-numeric-separator
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-object-rest-spread
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-optional-catch-binding
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-optional-chaining
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-private-property-in-object
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-top-level-await
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---plugin-syntax-typescript
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---template
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---traverse
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       +---debug
|   |   |   |   |       |       README.md
|   |   |   |   |       |       
|   |   |   |   |       \---ms
|   |   |   |   |               license.md
|   |   |   |   |               readme.md
|   |   |   |   |               
|   |   |   |   \---types
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@bcoe
|   |   |   |   \---v8-coverage
|   |   |   |       |   CHANGELOG.md
|   |   |   |       |   LICENSE.md
|   |   |   |       |   README.md
|   |   |   |       |   
|   |   |   |       \---dist
|   |   |   |           \---lib
|   |   |   |                   CHANGELOG.md
|   |   |   |                   LICENSE.md
|   |   |   |                   README.md
|   |   |   |                   
|   |   |   +---@colors
|   |   |   |   \---colors
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@dabh
|   |   |   |   \---diagnostics
|   |   |   |           CHANGELOG.md
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@isaacs
|   |   |   |   +---balanced-match
|   |   |   |   |       LICENSE.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---brace-expansion
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---cliui
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---node_modules
|   |   |   |   |       +---ansi-regex
|   |   |   |   |       |       readme.md
|   |   |   |   |       |       
|   |   |   |   |       +---ansi-styles
|   |   |   |   |       |       readme.md
|   |   |   |   |       |       
|   |   |   |   |       +---emoji-regex
|   |   |   |   |       |       README.md
|   |   |   |   |       |       
|   |   |   |   |       +---string-width
|   |   |   |   |       |       readme.md
|   |   |   |   |       |       
|   |   |   |   |       +---strip-ansi
|   |   |   |   |       |       readme.md
|   |   |   |   |       |       
|   |   |   |   |       \---wrap-ansi
|   |   |   |   |               readme.md
|   |   |   |   |               
|   |   |   |   \---fs-minipass
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@istanbuljs
|   |   |   |   +---load-nyc-config
|   |   |   |   |       CHANGELOG.md
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---schema
|   |   |   |           CHANGELOG.md
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@jest
|   |   |   |   +---core
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---expect
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---expect-utils
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---schemas
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---types
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@jridgewell
|   |   |   |   +---gen-mapping
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---remapping
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---resolve-uri
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---sourcemap-codec
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---trace-mapping
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@noble
|   |   |   |   \---hashes
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@paralleldrive
|   |   |   |   \---cuid2
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@sinclair
|   |   |   |   \---typebox
|   |   |   |           readme.md
|   |   |   |           
|   |   |   +---@sinonjs
|   |   |   |   +---commons
|   |   |   |   |   |   README.md
|   |   |   |   |   |   
|   |   |   |   |   \---lib
|   |   |   |   |       \---prototypes
|   |   |   |   |               README.md
|   |   |   |   |               
|   |   |   |   \---fake-timers
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@smithy
|   |   |   |   +---abort-controller
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---chunked-blob-reader
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---chunked-blob-reader-native
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---config-resolver
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---core
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---credential-provider-imds
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---eventstream-codec
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---eventstream-serde-browser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---eventstream-serde-config-resolver
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---eventstream-serde-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---eventstream-serde-universal
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---fetch-http-handler
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---hash-blob-browser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---hash-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---hash-stream-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---invalid-dependency
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---is-array-buffer
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---md5-js
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-content-length
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-endpoint
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-retry
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-serde
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---middleware-stack
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---node-config-provider
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---node-http-handler
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---property-provider
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---protocol-http
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---querystring-builder
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---querystring-parser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---service-error-classification
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---shared-ini-file-loader
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---signature-v4
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---smithy-client
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---types
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---url-parser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-base64
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-body-length-browser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-body-length-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-buffer-from
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-config-provider
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-defaults-mode-browser
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-defaults-mode-node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-endpoints
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-hex-encoding
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-middleware
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-retry
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-stream
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-uri-escape
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-utf8
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---util-waiter
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---uuid
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@so-ric
|   |   |   |   \---colorspace
|   |   |   |           CHANGELOG.md
|   |   |   |           LICENSE.md
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---@types
|   |   |   |   +---babel__core
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---babel__generator
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---babel__template
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---babel__traverse
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---graceful-fs
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---istanbul-lib-coverage
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---istanbul-lib-report
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---istanbul-reports
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---node
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---stack-utils
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---triple-beam
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   +---yargs
|   |   |   |   |       README.md
|   |   |   |   |       
|   |   |   |   \---yargs-parser
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---accepts
|   |   |   |       HISTORY.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ansi-escapes
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---ansi-regex
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---ansi-styles
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---anymatch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---append-field
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---argparse
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---array-flatten
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---asap
|   |   |   |       CHANGES.md
|   |   |   |       LICENSE.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---async
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---asynckit
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---axios
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   MIGRATION_GUIDE.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---lib
|   |   |   |       +---adapters
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       +---core
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       +---env
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       \---helpers
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---babel-jest
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---babel-plugin-istanbul
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       +---istanbul-lib-instrument
|   |   |   |       |       CHANGELOG.md
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       \---semver
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---babel-plugin-jest-hoist
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---babel-preset-current-node-syntax
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---babel-preset-jest
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---balanced-match
|   |   |   |       LICENSE.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---base64-js
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---base64url
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---baseline-browser-mapping
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---bcrypt
|   |   |   |       CHANGELOG.md
|   |   |   |       ISSUE_TEMPLATE.md
|   |   |   |       README.md
|   |   |   |       SECURITY.md
|   |   |   |       
|   |   |   +---binary-extensions
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---body-parser
|   |   |   |       HISTORY.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---bowser
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---brace-expansion
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---braces
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---brotli
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---browserslist
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---bser
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---buffer-equal-constant-time
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---buffer-from
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---busboy
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---bytes
|   |   |   |       History.md
|   |   |   |       Readme.md
|   |   |   |       
|   |   |   +---call-bind-apply-helpers
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---call-bound
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---callsites
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---camelcase
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---caniuse-lite
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---char-regex
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---chokidar
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---chownr
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ci-info
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---cjs-module-lexer
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---cliui
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---clone
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---collect-v8-coverage
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---color
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       +---color-convert
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       \---color-name
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---color-convert
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---color-name
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---color-string
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---color-name
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---compressible
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---compression
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---negotiator
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---content-disposition
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---content-type
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---convert-source-map
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---cookie
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---core-util-is
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---cors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---create-jest
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---cross-spawn
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---crypto-js
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---debug
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---dedent
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---destroy
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---dezalgo
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---dfa
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---diff-sequences
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---dotenv
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---dunder-proto
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---eastasianwidth
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ecdsa-sig-formatter
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ee-first
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---electron-to-chromium
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---emoji-regex
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---enabled
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---encodeurl
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---error-ex
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---es-define-property
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---es-errors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---es-object-atoms
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---es-set-tostringtag
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---esprima
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---etag
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---exit
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---expect
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---express-validator
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fast-deep-equal
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fast-json-stable-stringify
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fast-sha256
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fast-xml-parser
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fb-watchman
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fecha
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fill-range
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---finalhandler
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fn.name
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---follow-redirects
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fontkit
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---foreground-child
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---signal-exit
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---form-data
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---formidable
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---forwarded
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fresh
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---fs.realpath
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---function-bind
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---gensync
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---geolib
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---get-caller-file
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---get-intrinsic
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---get-package-type
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---get-proto
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---glob
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---glob-parent
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---gopd
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---graceful-fs
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---has-symbols
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---has-tostringtag
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---hasown
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---helmet
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       SECURITY.md
|   |   |   |       
|   |   |   +---html-escaper
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---http-errors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---human-signals
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---iconv-lite
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ignore-by-default
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---import-local
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---imurmurhash
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---inflight
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---inherits
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ip-address
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ipaddr.js
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---is-arrayish
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---is-core-module
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---is-extglob
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---is-glob
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---is-number
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---isarray
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---isexe
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---istanbul-lib-coverage
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---istanbul-lib-instrument
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---istanbul-lib-report
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---istanbul-lib-source-maps
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---debug
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---istanbul-reports
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jackspeak
|   |   |   |       LICENSE.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-changed-files
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-circus
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-cli
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-diff
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-docblock
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-each
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-leak-detector
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-matcher-utils
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-mock
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-pnp-resolver
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-validate
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jest-worker
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jpeg-exif
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---js-tokens
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---js-yaml
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jsesc
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---json-parse-even-better-errors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---json5
|   |   |   |       LICENSE.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jsonwebtoken
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---jwa
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---kuler
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---linebreak
|   |   |   |   \---node_modules
|   |   |   |       \---base64-js
|   |   |   |               README.md
|   |   |   |               
|   |   |   +---lines-and-columns
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.includes
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.isboolean
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.isinteger
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.isnumber
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.isplainobject
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.isstring
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---lodash.once
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---logform
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---ms
|   |   |   |               license.md
|   |   |   |               readme.md
|   |   |   |                
|   |   |   +---lru-cache
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---math-intrinsics
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---media-typer
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---merge-descriptors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---merge-stream
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---methods
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---micromatch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---mime
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---mime-db
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---mime-types
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---minimatch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---minimist
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---minipass
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---minizlib
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---multer
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---natural-compare
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---negotiator
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---node-addon-api
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---tools
|   |   |   |           README.md
|   |   |   |           
|   |   |   +---node-gyp-build
|   |   |   |       README.md
|   |   |   |       SECURITY.md
|   |   |   |       
|   |   |   +---node-int64
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---node-pg-migrate
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       +---glob
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       \---minimatch
|   |   |   |               LICENSE.md
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---node-releases
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---nodemailer
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---nodemon
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---debug
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---normalize-path
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---on-finished
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---on-headers
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---once
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---one-time
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---openai
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---src
|   |   |   |       +---core
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       +---internal
|   |   |   |       |   |   README.md
|   |   |   |       |   |   
|   |   |   |       |   \---qs
|   |   |   |       |           LICENSE.md
|   |   |   |       |           README.md
|   |   |   |       |           
|   |   |   |       \---_vendor
|   |   |   |           +---partial-json-parser
|   |   |   |           |       README.md
|   |   |   |           |       
|   |   |   |           \---zod-to-json-schema
|   |   |   |                   README.md
|   |   |   |                   
|   |   |   +---package-json-from-dist
|   |   |   |       LICENSE.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pako
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---parseurl
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---passport
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---passport-google-oauth20
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---passport-microsoft
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---example
|   |   |   |       \---login
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---passport-oauth2
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---passport-strategy
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---path-parse
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---path-scurry
|   |   |   |   |   LICENSE.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---lru-cache
|   |   |   |               LICENSE.md
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---pdfkit
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-cloudflare
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-connection-string
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-int8
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-pool
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-protocol
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pg-types
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pgpass
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---picocolors
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---picomatch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pirates
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---png-js
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pretty-format
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---proxy-addr
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---proxy-from-env
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pstree.remy
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---pure-rand
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---qs
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---range-parser
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---raw-body
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---react-is
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---readable-stream
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---safe-buffer
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---readdirp
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---resolve
|   |   |   |   |   SECURITY.md
|   |   |   |   |   
|   |   |   |   \---.github
|   |   |   |           INCIDENT_RESPONSE_PROCESS.md
|   |   |   |           THREAT_MODEL.md
|   |   |   |           
|   |   |   +---restructure
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---safe-buffer
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---safe-stable-stringify
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---semver
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---send
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---serve-static
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---setprototypeof
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---side-channel
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---side-channel-list
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---side-channel-map
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---side-channel-weakmap
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---signal-exit
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---simple-update-notifier
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---source-map
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---source-map-support
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---split2
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---sprintf-js
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---stack-trace
|   |   |   |       Readme.md
|   |   |   |       
|   |   |   +---standardwebhooks
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---statuses
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---streamsearch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---string-width-cjs
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---string_decoder
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---safe-buffer
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---strip-ansi-cjs
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---stripe
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---strnum
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---.github
|   |   |   |           SECURITY.md
|   |   |   |           
|   |   |   +---superagent
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       +---debug
|   |   |   |       |       README.md
|   |   |   |       |       
|   |   |   |       \---mime
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---supertest
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---supports-preserve-symlinks-flag
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---svix
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---uuid
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---tar
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---yallist
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---test-exclude
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---text-hex
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---to-regex-range
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---toidentifier
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---touch
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---triple-beam
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---tslib
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---type-detect
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---type-is
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---uid2
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---undefsafe
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---undici-types
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---unicode-trie
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---unpipe
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---update-browserslist-db
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---util-deprecate
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---utils-merge
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---v8-to-istanbul
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---validator
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---vary
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---which
|   |   |   |       CHANGELOG.md
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---winston
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---readable-stream
|   |   |   |               CONTRIBUTING.md
|   |   |   |               GOVERNANCE.md
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---winston-transport
|   |   |   |   |   CHANGELOG.md
|   |   |   |   |   README.md
|   |   |   |   |   
|   |   |   |   \---node_modules
|   |   |   |       \---readable-stream
|   |   |   |               CONTRIBUTING.md
|   |   |   |               GOVERNANCE.md
|   |   |   |               README.md
|   |   |   |                
|   |   |   +---wrap-ansi-cjs
|   |   |   |       readme.md
|   |   |   |       
|   |   |   +---wrappy
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---write-file-atomic
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---ws
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---xtend
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---y18n
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---yallist
|   |   |   |       README.md
|   |   |   |       
|   |   |   +---yargs
|   |   |   |       README.md
|   |   |   |       
|   |   |   \---yargs-parser
|   |   |           README.md
|   |   |           
|   |   \---scripts
|   |           README.md
|   |           
|   +---backups
|   |       auth-login.html.backup
|   |       
|   +---cli
|   |       README.md
|   |       SECURITY.md
|   |       
|   +---deploy-clean
|   |       README.md
|   |       SUPER-ADMIN-SETUP.md
|   |       
|   +---docs
|   |       vendor-dashboard-architecture.md
|   |       
|   +---frontend
|   |   |   README-QUOTES.md
|   |   |   README.md
|   |   |   search-demo.md
|   |   |   
|   |   \---tradematch-website-complete
|   |       \---tradematch-website
|   |               CHANGELOG.md
|   |               README.md
|   |               
|   \---snippets
|           favicon-snippet.html
|           
+---forgot-password
|       index.html
|       
+---images
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
|   \---optimized
|           carpentry-optimized-desktop.avif
|           carpentry-optimized-desktop.webp
|           carpentry-optimized-mobile.avif
|           carpentry-optimized-mobile.webp
|           hero-background-optimized-desktop.avif
|           hero-background-optimized-desktop.webp
|           hero-background-optimized-mobile.avif
|           hero-background-optimized-mobile.webp
|           roofing-optimized-desktop.avif
|           roofing-optimized-desktop.webp
|           roofing-optimized-mobile.avif
|           roofing-optimized-mobile.webp
|           unsplash-photo-1503387762-592deb58ef4e-desktop.avif
|           unsplash-photo-1503387762-592deb58ef4e-desktop.webp
|           unsplash-photo-1503387762-592deb58ef4e-mobile.avif
|           unsplash-photo-1503387762-592deb58ef4e-mobile.webp
|           
+---login
|       index.html
|       
+---New pages
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
|   +---Blog
|   |       BLOG-SYSTEM-GUIDE.md
|   |       blog.html
|   |       generate-blog-posts.py
|   |       
|   +---Cost Calculator
|   |       inject-to-neon.py
|   |       NEXTJS-NEON-DEPLOYMENT-GUIDE.md
|   |       nextjs-page.tsx
|   |       sitemap-index-route.ts
|   |       sitemap-individual-route.ts
|   |       
|   +---Localized pages script
|   |       city-trade-seo-page.html
|   |       generate-pages-updated.py
|   |       hero-background.webp
|   |       SETUP-INSTRUCTIONS.md
|   |       
|   +---Q&A
|   |       nextjs-question-page.tsx
|   |       nextjs-questions-listing.tsx
|   |       QA-SYSTEM-DEPLOYMENT-GUIDE.md
|   |       question-detail-page.html
|   |       questions-listing.html
|   |       seed-community-qa.py
|   |       
|   \---Updating Menu Script
|           footer.html
|           index.html
|           README.md
|           sync_shell_complete.py
|           TRADEMATCH_FINAL_WORKING_PACKAGE.tar.gz
|           
+---pages
|       about.html
|       activate.html
|       analytics-new.html
|       api-test.html
|       ask-a-trade.html
|       auth-forgot-password.html
|       auth-login.html
|       auth-register.html
|       auth-select-role.html
|       blog.html
|       careers.html
|       compare.html
|       contact.html
|       cookies.html
|       cost-calculator.html
|       dashboard.html
|       email-preferences.html
|       find-tradespeople.html
|       heatmaps.html
|       help-centre.html
|       help.html
|       how-it-works-customer.html
|       impressions.html
|       index.html
|       index.html.html
|       investor-relations.html
|       location-service-enhanced.html
|       messages.html
|       messaging-system.html
|       milestone-manager.html
|       payment-checkout.html
|       payment-system.html
|       post-a-job.html
|       postcode-test.html
|       privacy.html
|       profile.html
|       proposal-builder.html
|       quote-engine-aiold.html
|       quote-engine-withoutai.html
|       quote-engine.html
|       reviews.html
|       settings-combined-final.html
|       settings-original-backup.html
|       settings.html
|       terms.html
|       trade-signup.html
|       vendor-analytics-new.html
|       vendor-analytics.html
|       vendor-credits.html
|       vendor-heatmaps.html
|       vendor-impressions.html
|       vendor-messages.html
|       vendor-profile.html
|       vendor-register.html
|       vendor-service-area.html
|       vendor-settings-combined-final.html
|       vendor-settings-original-backup.html
|       vendor-settings.html
|       
+---post-job
|       index.html
|       
+---register
|       index.html
|       
+---scripts
|       verify-structure.js
|       
+---shared
|   +---api
|   |       api.js
|   |       auth.js
|   |       config.js
|   |       endpoints.js
|   |       httpClient.js
|   |       quotes.js
|   |       
|   +---assets
|   +---auth
|   |       permissionGuards.js
|   |       
|   +---styles
|   |       design-tokens.css
|   |       profile-menu.css
|   |       
|   +---ui
|   |       profile-menu.js
|   |       
|   \---utils
|           ai-enhancement.js
|           currency.js
|           dates.js
|           formatting.js
|           
+---signup
|       index.html
|       
+---styles
|       homepage-noncritical.css
|       
+---super-admin
|       superAdminApp.js
|       
+---super-admin-dashboard
|   |   dashboardApp.js
|   |   index.html
|   |   
|   +---assets
|   +---components
|   +---modals
|   +---pages
|   +---routes
|   |       dashboardRouter.js
|   |       
|   +---services
|   +---state
|   \---styles
+---tradematch-website-complete
|   \---tradematch-website
|       |   index.html
|       |   
|       +---api
|       |       config.js
|       |       
|       \---images
|               carpentry-optimized.jpg
|               carpentry-optimized.webp
|               hero-background-optimized.jpg
|               hero-background-optimized.webp
|               roofing-optimized.jpg
|               roofing-optimized.webp
|               
+---user-dashboard
|   |   dashboardApp.js
|   |   index.html
|   |   
|   +---assets
|   +---components
|   +---modals
|   +---pages
|   |       billing-addons.html
|   |       billing.html
|   |       dashboard.html
|   |       edit-job-modal.html
|   |       index.html
|   |       job-details.html
|   |       job-quotes.html
|   |       messages.html
|   |       my-jobs.html
|   |       notifications.html
|   |       post-job.html
|   |       profile.html
|   |       quotes.html
|   |       reviews.html
|   |       saved-trades.html
|   |       settings.html
|   |       your-quotes.html
|   |       
|   +---routes
|   |       dashboardRouter.js
|   |       
|   +---services
|   +---state
|   \---styles
|           styles.css
|           
\---vendor-dashboard
    |   dashboardApp.js
    |   index.html
    |   
    +---assets
    |       messaging-credits-schema.sql
    |       vendor-onboarding-wizard-source.html
    |       vendor-settings.zip
    |       
    +---components
    +---modals
    |       vendor-onboarding-wizard.css
    |       vendor-onboarding-wizard.html
    |       vendor-onboarding-wizard.js
    |       
    +---pages
    |       index.html
    |       vendor-active-quotes.html
    |       vendor-analytics.html
    |       vendor-archived-jobs.html
    |       vendor-badges.html
    |       vendor-billing.html
    |       vendor-coverage.html
    |       vendor-dashboard-enhanced.html
    |       vendor-dashboard-with-modals.html
    |       vendor-heatmaps.html
    |       vendor-impressions.html
    |       vendor-messages.html
    |       vendor-new-jobs.html
    |       vendor-new-leads.html
    |       vendor-profile.html
    |       vendor-settings.html
    |       vendor-timeline.html
    |       
    +---routes
    |       dashboardRouter.js
    |       
    +---services
    |       messaging-credits-api.js
    |       
    +---state
    \---styles
            vendor-onboarding.css
             
```
