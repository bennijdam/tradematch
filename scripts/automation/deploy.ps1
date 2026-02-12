# TradeMatch Production Deployment Script
# Run this script to deploy the application

Write-Host "TradeMatch Production Deployment" -ForegroundColor Green
Write-Host "===================================`n" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "apps/api/package.json")) {
    Write-Host "Error: Must run from tradematch-fixed root directory" -ForegroundColor Red
    exit 1
}

Write-Host "Directory check passed`n" -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "Step 1: Installing backend dependencies..." -ForegroundColor Cyan
Set-Location apps/api
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Set-Location ../..
Write-Host "Dependencies installed`n" -ForegroundColor Green

# Step 2: Check environment variables
Write-Host "Step 2: Checking environment variables..." -ForegroundColor Cyan
if (-not (Test-Path "apps/api/.env")) {
    Write-Host "Warning: No .env file found" -ForegroundColor Yellow
    Write-Host "Please create apps/api/.env from apps/api/.env.example" -ForegroundColor Yellow
    Write-Host "`nWould you like to continue anyway? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne 'Y' -and $response -ne 'y') {
        Write-Host "Deployment cancelled" -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host ".env file found`n" -ForegroundColor Green
}

# Step 3: Test database connection
Write-Host "Step 3: Testing database connection..." -ForegroundColor Cyan
Write-Host "Checking if DATABASE_URL is set..." -ForegroundColor Gray

Set-Location apps/api
$env:NODE_ENV = "production"

# Quick DB test
$dbTest = @"
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()')
    .then(() => { console.log('Database connected'); process.exit(0); })
    .catch(err => { console.error('Database error:', err.message); process.exit(1); });
"@

$dbTest | Out-File -FilePath "test-db.js" -Encoding UTF8
node test-db.js
$dbTestResult = $LASTEXITCODE
Remove-Item "test-db.js"

if ($dbTestResult -ne 0) {
    Write-Host "Database connection failed" -ForegroundColor Red
    Write-Host "Please check your DATABASE_URL in .env or Render dashboard" -ForegroundColor Yellow
    Set-Location ../..
    exit 1
}
Set-Location ../..

# Step 4: Run migrations
Write-Host "`nStep 4: Running database migrations..." -ForegroundColor Cyan
Write-Host "This will create/update database tables`n" -ForegroundColor Gray

Set-Location apps/api
npm run migrate:up
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Migrations may have failed" -ForegroundColor Yellow
    Write-Host "Check the output above for details`n" -ForegroundColor Yellow
} else {
    Write-Host "Migrations completed`n" -ForegroundColor Green
}
Set-Location ../..

# Step 5: Test server startup
Write-Host "Step 5: Testing server startup..." -ForegroundColor Cyan
Write-Host "Starting server for 5 seconds..." -ForegroundColor Gray

Set-Location apps/api
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server.js
}

Start-Sleep -Seconds 5

# Test health endpoint
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 3
    if ($response.status -eq "ok") {
        Write-Host "Server started successfully" -ForegroundColor Green
        Write-Host "Health endpoint responding`n" -ForegroundColor Green
    }
} catch {
    Write-Host "Warning: Could not reach health endpoint" -ForegroundColor Yellow
    Write-Host "Server may take longer to start`n" -ForegroundColor Yellow
}

Stop-Job $serverJob
Remove-Job $serverJob
Set-Location ../..

# Step 6: Git check
Write-Host "Step 6: Checking Git status..." -ForegroundColor Cyan
$gitStatus = git status --short

if ($gitStatus) {
    Write-Host "You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    Write-Host "`nWould you like to commit and push? (Y/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        git add .
        Write-Host "Enter commit message:" -ForegroundColor Cyan
        $commitMsg = Read-Host
        if (-not $commitMsg) {
            $commitMsg = "Production deployment $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        }
        git commit -m $commitMsg
        git push origin main
        Write-Host "Changes pushed to GitHub`n" -ForegroundColor Green
    }
} else {
    Write-Host "No uncommitted changes`n" -ForegroundColor Green
}

# Final summary
Write-Host "`n" -ForegroundColor Green
Write-Host "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor Green
Write-Host "    đźŽ‰ DEPLOYMENT PREPARATION COMPLETE    " -ForegroundColor Green
Write-Host "â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•" -ForegroundColor Green
Write-Host "`n"

Write-Host "đź“‹ Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify environment variables in Render dashboard" -ForegroundColor White
Write-Host "2. Ensure all secrets are set (JWT_SECRET, STRIPE_SECRET_KEY, etc.)" -ForegroundColor White
Write-Host "3. Run migrations on Render: cd apps/api && npm run migrate:up" -ForegroundColor White
Write-Host "4. Monitor deployment at: https://dashboard.render.com" -ForegroundColor White
Write-Host "5. Test health endpoint: https://your-app.onrender.com/api/health" -ForegroundColor White
Write-Host "6. Update frontend API URLs to point to production backend" -ForegroundColor White
Write-Host "`n"

Write-Host "đź“š Documentation:" -ForegroundColor Cyan
Write-Host "- DEPLOYMENT.md - Full deployment guide" -ForegroundColor White
Write-Host "- PRODUCTION-CHECKLIST.md - Pre-launch checklist" -ForegroundColor White
Write-Host "- apps/api/.env.example - Environment variables reference" -ForegroundColor White
Write-Host "`n"

Write-Host "đź”— Quick Links:" -ForegroundColor Cyan
Write-Host "- Render: https://dashboard.render.com" -ForegroundColor White
Write-Host "- Vercel: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "- Neon DB: https://console.neon.tech" -ForegroundColor White
Write-Host "- Stripe: https://dashboard.stripe.com" -ForegroundColor White
Write-Host "`n"

Write-Host "Good luck with the deployment! đźš€" -ForegroundColor Green



