$ErrorActionPreference = 'Continue'

$logPath = "C:\Users\ASUS\Desktop\tradematch-fixed\logs\smoke-local.log"
if (Test-Path $logPath) { Remove-Item $logPath -Force }
"Smoke test run started: $(Get-Date -Format o)" | Add-Content -Path $logPath

$backendDir = "C:\Users\ASUS\Desktop\tradematch-fixed\backend"
$server = Start-Process -FilePath "node" -ArgumentList "scripts\init-server.js" -WorkingDirectory $backendDir -PassThru

$healthy = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri http://localhost:3001/api/health -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}

if (-not $healthy) {
    "Health check failed to start (continuing tests anyway)" | Tee-Object -FilePath $logPath -Append
}

$env:BACKEND_URL = 'http://localhost:3001'

function Invoke-Step($label, $command) {
    "`n=== $label ===" | Tee-Object -FilePath $logPath -Append
    & $command 2>&1 | ForEach-Object {
        $_ | Tee-Object -FilePath $logPath -Append
    }
    if ($LASTEXITCODE -ne 0) {
        "❌ $label failed with exit code $LASTEXITCODE" | Tee-Object -FilePath $logPath -Append
    } else {
        "✅ $label passed" | Tee-Object -FilePath $logPath -Append
    }
}

Invoke-Step "backend smoke-test" { node C:\Users\ASUS\Desktop\tradematch-fixed\scripts\smoke-test.js }
Invoke-Step "smoke-user-quote" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\smoke-user-quote.js }
Invoke-Step "e2e-customer-vendor-lead" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\e2e-customer-vendor-lead.js }
Invoke-Step "check-post-e2e" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\check-post-e2e.js }
Invoke-Step "smoke-contracts-endpoints" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\smoke-contracts-endpoints.js }
Invoke-Step "test-preview-email" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\test-preview-email.js }
Invoke-Step "check-admin-finance" { node C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\check-admin-finance.js }

if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
}

"Smoke test run finished: $(Get-Date -Format o)" | Add-Content -Path $logPath
