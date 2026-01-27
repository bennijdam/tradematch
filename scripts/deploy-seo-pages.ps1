Param(
  [string]$SourceDir = "C:\Users\ASUS\Desktop\tradematch-fixed\frontend\seo-generator\generated-pages",
  [string]$Bucket = "s3://tradematch-storage/SEO pages/",
  [string]$Region = "ap-southeast-2"
)

# Requires AWS CLI configured with AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
# Example usage:
#   .\scripts\deploy-seo-pages.ps1
#   .\scripts\deploy-seo-pages.ps1 -SourceDir "C:\path\to\generated-pages"

if (-not (Test-Path $SourceDir)) {
  Write-Error "Source directory not found: $SourceDir"
  exit 1
}

Write-Host "Syncing $SourceDir to $Bucket (region: $Region)..."
aws s3 sync "$SourceDir" "$Bucket" --region $Region --delete --cache-control "public, max-age=31536000, immutable"

if ($LASTEXITCODE -ne 0) {
  Write-Error "AWS sync failed. Ensure AWS CLI is installed and credentials are set."
  exit $LASTEXITCODE
}

Write-Host "SEO pages synced successfully."
