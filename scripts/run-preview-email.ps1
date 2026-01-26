$ErrorActionPreference = 'Continue'

$out = "C:\Users\ASUS\Desktop\tradematch-fixed\logs\preview-email.out.txt"
$err = "C:\Users\ASUS\Desktop\tradematch-fixed\logs\preview-email.err.txt"
if (Test-Path $out) { Remove-Item $out -Force }
if (Test-Path $err) { Remove-Item $err -Force }

$portPid = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)
if ($portPid) { Stop-Process -Id $portPid -Force }

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

$env:BACKEND_URL = 'http://localhost:3001'
Start-Process -FilePath "node" -ArgumentList "C:\Users\ASUS\Desktop\tradematch-fixed\backend\scripts\test-preview-email.js" -RedirectStandardOutput $out -RedirectStandardError $err -Wait -NoNewWindow

if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
}
