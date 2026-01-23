# Super Admin Panel - Quick Setup
# Run this script to set up the Super Admin Panel

Write-Host "🚀 TradeMatch Super Admin Panel Setup" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "backend\server-production.js")) {
    Write-Host "❌ Error: Please run this script from the tradematch-fixed root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking environment..." -ForegroundColor Yellow

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "⚠️  Warning: backend\.env not found" -ForegroundColor Yellow
    Write-Host "   Make sure DATABASE_URL and JWT_SECRET are configured" -ForegroundColor Yellow
} else {
    Write-Host "✅ Environment file found" -ForegroundColor Green
}

Write-Host "`nStep 2: Running database migration..." -ForegroundColor Yellow

# Run migration
Push-Location backend
try {
    $migrationOutput = node scripts/setup-super-admin.js 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed" -ForegroundColor Red
        Write-Host $migrationOutput
        Pop-Location
        exit 1
    }
} catch {
    Write-Host "❌ Error running migration: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host "`nStep 3: Verifying admin routes..." -ForegroundColor Yellow

# Check if admin routes file exists
if (Test-Path "backend\routes\admin.js") {
    Write-Host "✅ Admin routes found" -ForegroundColor Green
} else {
    Write-Host "❌ Admin routes missing" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 4: Checking frontend files..." -ForegroundColor Yellow

$frontendFiles = @(
    "tradematch-super-admin-panel\admin-login.html",
    "tradematch-super-admin-panel\admin-api.js",
    "tradematch-super-admin-panel\admin-dashboard.html",
    "tradematch-super-admin-panel\admin-users.html",
    "tradematch-super-admin-panel\admin-vendors.html"
)

$allFilesExist = $true
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file missing" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ Some frontend files are missing" -ForegroundColor Red
    exit 1
}

Write-Host "`n`033[92m✅ Setup completed successfully!`033[0m" -ForegroundColor Green
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   node server-production.js`n" -ForegroundColor Gray

Write-Host "2. Open the Super Admin Panel:" -ForegroundColor White
Write-Host "   Open: tradematch-super-admin-panel\admin-login.html`n" -ForegroundColor Gray

Write-Host "3. Login with default credentials:" -ForegroundColor White
Write-Host "   Email:    admin@tradematch.com" -ForegroundColor Gray
Write-Host "   Password: ChangeMe123!`n" -ForegroundColor Gray

Write-Host "WARNING: IMPORTANT!" -ForegroundColor Yellow
Write-Host "   Change the default password immediately after login!`n" -ForegroundColor Yellow

Write-Host "Documentation:" -ForegroundColor White
Write-Host "   - SUPER-ADMIN-COMPLETE.md - Complete integration guide" -ForegroundColor Gray
Write-Host "   - tradematch-super-admin-panel\SUPER-ADMIN-SETUP.md - Detailed setup guide`n" -ForegroundColor Gray

Write-Host "Super Admin Panel is ready to use!" -ForegroundColor Green
