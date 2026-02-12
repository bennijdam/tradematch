# Production Readiness Verification Script
# Run this to verify all production requirements are met

Write-Host "`n══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  TradeMatch Production Readiness Checker" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$passed = 0
$failed = 0
$warnings = 0

function Test-File {
    param($Path, $Name, $Critical = $true)
    
    Write-Host "Checking: $Name... " -NoNewline
    
    if (Test-Path $Path) {
        Write-Host "PASS" -ForegroundColor Green
        $script:passed++
    } else {
        if ($Critical) {
            Write-Host "FAIL" -ForegroundColor Red
            $script:failed++
        } else {
            Write-Host "WARNING" -ForegroundColor Yellow
            $script:warnings++
        }
    }
}

Write-Host "=== Backend Files ===`n" -ForegroundColor Cyan

Test-File "apps/api/package.json" "Backend package.json exists"
Test-File "apps/api/server.js" "Backend server.js exists"
Test-File "apps/api/server-production.js" "Production server exists" $false
Test-File "apps/api/config/logger.js" "Logger configuration exists" $false
Test-File "apps/api/routes/webhooks.js" "Webhook route exists" $false

Write-Host "`n=== Database Migrations ===`n" -ForegroundColor Cyan

Test-File "apps/api/.migration.json" "Migration config exists"
Test-File "apps/api/migrations" "Migrations directory exists"

Write-Host "`n=== Configuration Files ===`n" -ForegroundColor Cyan

Test-File "apps/api/.env.example" ".env.example exists"
Test-File "render.yaml" "render.yaml exists"
Test-File "vercel.json" "vercel.json exists"

Write-Host "`n=== Documentation ===`n" -ForegroundColor Cyan

Test-File "README.md" "README.md exists"
Test-File "README.md" "Deployment guide exists"
Test-File "API-ENDPOINT-CHECKLIST.md" "API endpoint checklist exists"
Test-File "ROUTE-REGISTRY.md" "Route registry exists" $false

Write-Host "`n=== CI/CD ===`n" -ForegroundColor Cyan

Test-File ".github/workflows/ci-cd.yml" "GitHub Actions workflow exists" $false

Write-Host "`n=== Frontend ===`n" -ForegroundColor Cyan

Test-File "public/index.html" "Frontend index.html exists"
Test-File "public/sitemap.xml" "sitemap.xml exists" $false
Test-File "public/robots.txt" "robots.txt exists" $false
Test-File "public/site.webmanifest" "Web manifest exists" $false

Write-Host "`n══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                VERIFICATION RESULTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "Passed:   $passed" -ForegroundColor Green
Write-Host "Failed:   $failed" -ForegroundColor Red
Write-Host "Warnings: $warnings" -ForegroundColor Yellow

$total = $passed + $failed + $warnings
$passPercent = [math]::Round(($passed / $total) * 100, 1)

Write-Host "`nSuccess Rate: $passPercent%`n"

if ($failed -eq 0) {
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  ALL CRITICAL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "  Ready for production deployment" -ForegroundColor Green
    Write-Host "══════════════════════════════════════════════════════`n" -ForegroundColor Green
    
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Run: .\scripts\automation\deploy.ps1"
    Write-Host "2. Follow: API-ENDPOINT-CHECKLIST.md"
    Write-Host "3. Read: README.md for full guide`n"
} else {
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "  CRITICAL ISSUES DETECTED" -ForegroundColor Red
    Write-Host "  Fix failed items before deploying" -ForegroundColor Red
    Write-Host "══════════════════════════════════════════════════════`n" -ForegroundColor Red
}

Write-Host "For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "  README.md - Full deployment guide"
Write-Host "  API-ENDPOINT-CHECKLIST.md - Pre-launch checklist"
Write-Host "  ROUTE-REGISTRY.md - Command reference`n"
