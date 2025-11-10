param(
  [string]$RootDir = (Get-Location).Path
)

# Tencent Cloud CI helper (PowerShell)
# Similar steps for Windows-based runners

$ErrorActionPreference = 'Stop'
$deployDir = Join-Path $RootDir '.deploy'
$zipPath = Join-Path $RootDir '.deploy.zip'

Write-Host "Workspace: $RootDir"

Write-Host "1) Install full dependencies"
npm ci

Write-Host "2) Build Next"
npm run build

Write-Host "3) Prepare .deploy"
if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
New-Item -ItemType Directory -Path $deployDir | Out-Null

if (Test-Path '.next/standalone') {
  Write-Host "Copying .next/standalone -> .deploy"
  robocopy .next\standalone $deployDir /e | Out-Null
}

if (Test-Path 'public') { robocopy public $deployDir /e | Out-Null }
if (Test-Path 'public') {
  # Copy into .deploy/public to match Linux build helper behavior (keep public directory as a folder)
  $publicDest = Join-Path $deployDir 'public'
  New-Item -ItemType Directory -Path $publicDest | Out-Null
  robocopy public $publicDest /e | Out-Null
}
Copy-Item -Force package.json -Destination (Join-Path $deployDir 'package.json')

Write-Host "4) Install production deps into .deploy"
npm --prefix $deployDir ci --production

Write-Host "5) Run deploy checks"
node scripts/check-deploy.js $deployDir

Write-Host "6) Pack .deploy -> .deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($deployDir, $zipPath)

Write-Host "Done. Artifact: $zipPath"
Exit 0
