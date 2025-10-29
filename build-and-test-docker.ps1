# Docker 构建和测试脚本
# 用于在上传到 TCB 之前本地验证 Docker 镜像

$ErrorActionPreference = "Stop"

Write-Host "=== Leverage AI Docker 构建和测试 ===" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 .env 文件
Write-Host "步骤 1/5: 检查环境配置..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "✗ .env 文件不存在" -ForegroundColor Red
    exit 1
}
Write-Host "✓ .env 文件存在" -ForegroundColor Green

# 验证必需的环境变量
$envContent = Get-Content ".env" -Raw
$requiredVars = @(
    "TCB_ENV_ID",
    "CLOUDBASE_SECRET_ID", 
    "CLOUDBASE_SECRET_KEY"
)

$missing = @()
foreach ($var in $requiredVars) {
    if ($envContent -notmatch "$var=") {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "✗ 缺少必需的环境变量: $($missing -join ', ')" -ForegroundColor Red
    Write-Host "请在 .env 文件中配置这些变量" -ForegroundColor Yellow
    exit 1
}
Write-Host "✓ 所有必需的环境变量已配置" -ForegroundColor Green
Write-Host ""

# 步骤 2: 清理旧镜像
Write-Host "步骤 2/5: 清理旧 Docker 镜像..." -ForegroundColor Yellow
docker rmi leverage-ai:latest -f 2>$null
Write-Host "✓ 清理完成" -ForegroundColor Green
Write-Host ""

# 步骤 3: 构建 Docker 镜像
Write-Host "步骤 3/5: 构建 Docker 镜像..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间..." -ForegroundColor Gray

# 从 .env 文件加载环境变量
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# 构建 Docker 镜像并传递构建参数
$buildArgs = @(
    "--build-arg", "HUNYUAN_API_KEY=$($envVars['HUNYUAN_API_KEY'])",
    "--build-arg", "CLOUDBASE_ENV_ID=$($envVars['CLOUDBASE_ENV_ID'])",
    "--build-arg", "TCB_ENV_ID=$($envVars['TCB_ENV_ID'])",
    "--build-arg", "CLOUDBASE_SECRET_ID=$($envVars['CLOUDBASE_SECRET_ID'])",
    "--build-arg", "CLOUDBASE_SECRET_KEY=$($envVars['CLOUDBASE_SECRET_KEY'])",
    "--build-arg", "TENCENTCLOUD_SECRET_ID=$($envVars['TENCENTCLOUD_SECRET_ID'])",
    "--build-arg", "TENCENTCLOUD_SECRET_KEY=$($envVars['TENCENTCLOUD_SECRET_KEY'])",
    "-t", "leverage-ai:latest",
    "."
)

docker build @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker 构建失败" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker 镜像构建成功" -ForegroundColor Green
Write-Host ""

# 步骤 4: 启动容器测试
Write-Host "步骤 4/5: 启动测试容器..." -ForegroundColor Yellow

# 停止并删除旧容器
docker stop leverage-test 2>$null
docker rm leverage-test 2>$null

# 启动新容器
docker run -d `
    --name leverage-test `
    -p 3000:3000 `
    --env-file .env `
    leverage-ai:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 容器启动失败" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 容器已启动" -ForegroundColor Green
Write-Host "等待服务就绪..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Write-Host ""

# 步骤 5: 验证服务
Write-Host "步骤 5/5: 验证服务..." -ForegroundColor Yellow

# 检查容器状态
$containerStatus = docker inspect -f '{{.State.Running}}' leverage-test 2>$null
if ($containerStatus -ne "true") {
    Write-Host "✗ 容器未运行" -ForegroundColor Red
    Write-Host "`n=== 容器日志 ===" -ForegroundColor Yellow
    docker logs leverage-test
    exit 1
}

Write-Host "✓ 容器运行中" -ForegroundColor Green

# 测试健康检查端点
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✓ 健康检查通过 (HTTP $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "⚠ 健康检查返回非 200 状态码: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n=== 容器日志 ===" -ForegroundColor Yellow
    docker logs leverage-test
    exit 1
}

# 检查容器日志中的关键信息
Write-Host "`n=== 检查数据库连接 ===" -ForegroundColor Yellow
$logs = docker logs leverage-test 2>&1
if ($logs -match "TCB|CloudBase|leverage-test-abc123") {
    Write-Host "✓ 检测到 TCB 数据库连接日志" -ForegroundColor Green
} else {
    Write-Host "⚠ 未检测到 TCB 连接日志,可能使用了本地 mock" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 构建和测试完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Docker 镜像已成功构建并通过基本测试" -ForegroundColor Green
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 手动测试注册: http://localhost:3000/register" -ForegroundColor Gray
Write-Host "  2. 手动测试登录: http://localhost:3000/login" -ForegroundColor Gray
Write-Host "  3. 查看容器日志: docker logs leverage-test -f" -ForegroundColor Gray
Write-Host "  4. 进入容器检查: docker exec -it leverage-test sh" -ForegroundColor Gray
Write-Host "  5. 停止容器: docker stop leverage-test" -ForegroundColor Gray
Write-Host ""
Write-Host "如果测试通过,可以导出镜像上传到 TCB:" -ForegroundColor Yellow
Write-Host "  docker save leverage-ai:latest | gzip > leverage-ai.tar.gz" -ForegroundColor Gray
Write-Host ""
