$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$patchPath = Join-Path $root "tradematch-seo.patch"
$applyScript = Join-Path $root "apply-seo.ps1"

if (Test-Path $patchPath) {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($git) {
        Write-Host "Applying patch: $patchPath"
        git -C $root apply $patchPath
    } else {
        Write-Host "git not found. Skipping patch apply."
    }
} else {
    Write-Host "Patch not found at $patchPath"
}

if (Test-Path $applyScript) {
    Write-Host "Running apply-seo.ps1"
    powershell -ExecutionPolicy Bypass -File $applyScript
} else {
    Write-Host "apply-seo.ps1 not found at $applyScript"
}
