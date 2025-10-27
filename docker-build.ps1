# Docker 构建脚本 (Windows PowerShell)
# 用法: .\docker-build.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Leverage AI Docker Build Script ===" -ForegroundColor Cyan

# 检查 Docker 是否运行
Write-Host "`n[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# 读取环境变量
Write-Host "`n[2/4] Loading environment variables..." -ForegroundColor Yellow
$envFile = ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
            Write-Host "  Loaded: $key" -ForegroundColor Gray
        }
    }
    Write-Host "✓ Environment loaded from $envFile" -ForegroundColor Green
} else {
    Write-Host "⚠ $envFile not found, using default values" -ForegroundColor Yellow
}

# 构建镜像
Write-Host "`n[3/4] Building Docker image..." -ForegroundColor Yellow
$buildArgs = @(
    "--build-arg", "HUNYUAN_API_KEY=$env:HUNYUAN_API_KEY",
    "--build-arg", "CLOUDBASE_ENV_ID=$env:CLOUDBASE_ENV_ID",
    "-t", "leverage-ai:latest",
    "."
)

docker build @buildArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Docker image built successfully" -ForegroundColor Green

# 显示镜像大小
Write-Host "`n[4/4] Image info:" -ForegroundColor Yellow
docker images leverage-ai:latest --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

Write-Host "`n=== Build Complete ===" -ForegroundColor Cyan
Write-Host "Run container: docker run --rm -p 3000:3000 --env-file .env.local leverage-ai:latest" -ForegroundColor White
Write-Host "Or use: npm run docker:run" -ForegroundColor White
