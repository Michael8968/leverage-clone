<#
Quick PowerShell helper to prepare a local dev session for login testing.

Usage:
  # set up env vars in current session
  .\scripts\setup-dev-local.ps1

  # start dev server after setting env
  .\scripts\setup-dev-local.ps1 -StartDev

This script intentionally does NOT write secrets to disk. If you want to target a real CloudBase
environment, set the CLOUDBASE/TENCENT env vars manually in your session before running the create-test-users script.
#>

param(
  [switch]$StartDev
)

Write-Host "Setting up local dev environment variables for login testing..."

# Non-sensitive defaults
$env:JWT_SECRET = 'dev-secret'
$env:NODE_ENV = 'development'

Write-Host "JWT_SECRET set to 'dev-secret' (development only)"
Write-Host "NODE_ENV=development"

Write-Host "Generated test accounts: data/generated-test-accounts.json"
Write-Host "Local user store (bcrypt hashes): data/local-seeded-users.json"

if ($StartDev) {
  Write-Host "Starting Next dev server (npm run dev) in this session..."
  npm run dev
}

Write-Host "Done. To start dev server later: npm run dev"
