# Super Admin Panel - Quick Setup
# Run this script to set up the Super Admin Panel

Write-Host "TradeMatch Super Admin Panel Setup" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "backend\server-production.js")) {
    Write-Host "Error: Please run this script from the tradematch-fixed root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking environment..." -ForegroundColor Yellow

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "Warning: backend\.env not found" -ForegroundColor Yellow
} else {
    Write-Host "OK: Environment file found" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Running database migration..." -ForegroundColor Yellow

# Run migration
Push-Location backend
try {
    node scripts/setup-super-admin.js
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Migration completed successfully" -ForegroundColor Green
    } else {
        Write-Host "Error: Migration failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "Error running migration: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "Step 3: Verifying files..." -ForegroundColor Yellow

$files = @(
    "backend\routes\admin.js",
    "tradematch-super-admin-panel\admin-login.html",
    "tradematch-super-admin-panel\admin-api.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "OK: $file" -ForegroundColor Green
    } else {
        Write-Host "Missing: $file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Start backend: cd backend && node server-production.js" -ForegroundColor Gray
Write-Host "2. Open: tradematch-super-admin-panel\admin-login.html" -ForegroundColor Gray
Write-Host "3. Login: admin@tradematch.com / ChangeMe123!" -ForegroundColor Gray
Write-Host ""
Write-Host "IMPORTANT: Change password after first login!" -ForegroundColor Yellow
