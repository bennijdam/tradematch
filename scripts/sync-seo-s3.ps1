param(
    [string]$Bucket = $env:S3_BUCKET,
    [string]$Prefix = $env:S3_PREFIX,
    [string]$Region = $env:AWS_REGION
)

$ErrorActionPreference = "Stop"

if (-not $Bucket) { $Bucket = "tradematch-storage" }
if (-not $Prefix) { $Prefix = "SEO pages" }
if (-not $Region) { $Region = "ap-southeast-2" }

$root = Split-Path -Parent $PSScriptRoot
$explicitDir = $env:SEO_LOCAL_DIR
$preferredDir = Join-Path $root "frontend\seo-generator\generated-pages"
$fallbackDir = Join-Path $root "seo-pages\public"

if ($explicitDir) {
    $localDir = $explicitDir
} elseif (Test-Path $preferredDir) {
    $localDir = $preferredDir
} else {
    $localDir = $fallbackDir
}

if (-not (Test-Path $localDir)) {
    throw "Local SEO pages directory not found: $localDir"
}

$aws = Get-Command aws -ErrorAction SilentlyContinue
if (-not $aws) {
    throw "AWS CLI not found. Install AWS CLI and ensure 'aws' is in PATH."
}

$target = "s3://$Bucket/$Prefix/"

Write-Host "Syncing SEO pages..."
Write-Host "Local: $localDir"
Write-Host "Target: $target"

aws s3 sync $localDir $target --delete --region $Region --cache-control "public, max-age=86400" --metadata-directive REPLACE

if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI sync failed. Configure AWS credentials and retry."
}

Write-Host "✅ SEO pages synced to S3."
