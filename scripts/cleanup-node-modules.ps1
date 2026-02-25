param(
  [switch]$RewriteHistory
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.git')) {
  throw 'Run this script from the repository root.'
}

Write-Host 'Untracking node_modules folders from Git index...'

git rm -r --cached --ignore-unmatch "node_modules"
git rm -r --cached --ignore-unmatch ":(glob)**/node_modules"
git rm -r --cached --ignore-unmatch ":(glob)**/node_modules/**"
git rm --cached --ignore-unmatch "package-lock.json"
git rm --cached --ignore-unmatch ":(glob)**/package-lock.json"

Write-Host ''
Write-Host 'Done. Local files remain on disk; only Git tracking was removed.'
Write-Host 'Next steps:'
Write-Host '  1) git add .gitignore pnpm-workspace.yaml package.json apps/*/package.json scripts/cleanup-node-modules.ps1'
Write-Host "  2) git commit -m 'chore: ignore and untrack node_modules, migrate to pnpm workspace'"
Write-Host '  3) pnpm install'

if ($RewriteHistory) {
  Write-Host ''
  Write-Host 'Optional full history rewrite to purge old blobs (run manually and coordinate with collaborators):'
  Write-Host "  pip install git-filter-repo"
  Write-Host "  git filter-repo --path-glob '**/node_modules/**' --path-glob '**/package-lock.json' --invert-paths"
  Write-Host "  git push --force-with-lease"
}
