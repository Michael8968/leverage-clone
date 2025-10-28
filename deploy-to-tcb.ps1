# TCB 生产环境部署脚本 (PowerShell)
# 版本: v2.6
# 日期: 2025-10-28

$ErrorActionPreference = "Stop"

# 环境配置
$TCB_ENV_ID = "leverage-test-abc123-9bn41a84185"
$DEPLOYMENT_VERSION = "v2.6"

# 颜色函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "╔═══════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║   TCB 生产环境部署脚本 - $DEPLOYMENT_VERSION                            ║" "Cyan"
Write-ColorOutput "╚═══════════════════════════════════════════════════════════════╝" "Cyan"
Write-Host ""

# 步骤1: 检查前置条件
Write-ColorOutput "📋 步骤 1/7: 检查前置条件..." "Yellow"

# 检查Node.js
try {
    $nodeVersion = node --version
    Write-ColorOutput "✓ Node.js 版本: $nodeVersion" "Green"
} catch {
    Write-ColorOutput "✗ Node.js 未安装" "Red"
    exit 1
}

# 检查npm
try {
    $npmVersion = npm --version
    Write-ColorOutput "✓ npm 版本: $npmVersion" "Green"
} catch {
    Write-ColorOutput "✗ npm 未安装" "Red"
    exit 1
}

# 检查TCB CLI（可选）
try {
    $tcbVersion = tcb --version
    Write-ColorOutput "✓ TCB CLI 版本: $tcbVersion" "Green"
} catch {
    Write-ColorOutput "⚠ TCB CLI 未安装（将使用手动部署方式）" "Yellow"
}

Write-Host ""

# 步骤2: 检查环境变量
Write-ColorOutput "📋 步骤 2/7: 检查环境变量..." "Yellow"

if (-not (Test-Path ".env.production")) {
    Write-ColorOutput "✗ .env.production 文件不存在" "Red"
    Write-ColorOutput "提示: 请从 .env.production.template 创建" "Yellow"
    exit 1
}
Write-ColorOutput "✓ .env.production 文件存在" "Green"

# 检查关键环境变量
$envContent = Get-Content ".env.production" -Raw
if ($envContent -match "your-production-jwt-secret-key-change-this") {
    Write-ColorOutput "✗ JWT_SECRET 使用默认值，请修改为强密钥" "Red"
    exit 1
}
Write-ColorOutput "✓ JWT_SECRET 已配置" "Green"

Write-Host ""

# 步骤3: 清理旧构建
Write-ColorOutput "📋 步骤 3/7: 清理旧构建..." "Yellow"

if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-ColorOutput "✓ 已清理 .next 目录" "Green"
}

if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
    Write-ColorOutput "✓ 已清理 out 目录" "Green"
}

Write-Host ""

# 步骤4: 安装依赖
Write-ColorOutput "📋 步骤 4/7: 安装依赖..." "Yellow"

npm ci --production=false
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "✗ 依赖安装失败" "Red"
    exit 1
}
Write-ColorOutput "✓ 依赖安装完成" "Green"

Write-Host ""

# 步骤5: 运行检查
Write-ColorOutput "📋 步骤 5/7: 运行代码检查..." "Yellow"

# TypeScript检查
Write-Host "运行 TypeScript 类型检查..."
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "✗ TypeScript 类型检查失败" "Red"
    exit 1
}
Write-ColorOutput "✓ TypeScript 类型检查通过" "Green"

# ESLint检查
Write-Host "运行 ESLint 检查..."
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "⚠ ESLint 检查有警告（继续）" "Yellow"
}
Write-ColorOutput "✓ ESLint 检查完成" "Green"

Write-Host ""

# 步骤6: 构建生产版本
Write-ColorOutput "📋 步骤 6/7: 构建生产版本..." "Yellow"

# 使用生产环境变量构建
Copy-Item ".env.production" ".env" -Force
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "✗ 构建失败" "Red"
    exit 1
}
Write-ColorOutput "✓ 构建完成" "Green"

Write-Host ""

# 步骤7: 创建部署包
Write-ColorOutput "📋 步骤 7/7: 创建部署包..." "Yellow"

$DEPLOY_DIR = "leverage-deployment-$DEPLOYMENT_VERSION"
$DEPLOY_ZIP = "$DEPLOY_DIR.zip"

# 清理旧部署包
if (Test-Path $DEPLOY_DIR) {
    Remove-Item -Recurse -Force $DEPLOY_DIR
}

if (Test-Path $DEPLOY_ZIP) {
    Remove-Item -Force $DEPLOY_ZIP
}

# 创建部署目录
New-Item -ItemType Directory -Force -Path $DEPLOY_DIR | Out-Null

# 复制必要文件
Write-Host "复制 standalone 输出..."
Copy-Item -Recurse -Force ".next\standalone\*" $DEPLOY_DIR

Write-Host "复制静态资源..."
New-Item -ItemType Directory -Force -Path "$DEPLOY_DIR\.next\static" | Out-Null
Copy-Item -Recurse -Force ".next\static\*" "$DEPLOY_DIR\.next\static\"

Write-Host "复制公共资源..."
if (Test-Path "public") {
    New-Item -ItemType Directory -Force -Path "$DEPLOY_DIR\public" | Out-Null
    Copy-Item -Recurse -Force "public\*" "$DEPLOY_DIR\public\"
}

Write-Host "复制环境变量..."
Copy-Item ".env.production" "$DEPLOY_DIR\.env" -Force

Write-Host "创建启动脚本..."
$startScript = @"
#!/bin/bash
export NODE_ENV=production
export PORT=`${PORT:-3000}
node server.js
"@
Set-Content -Path "$DEPLOY_DIR\start.sh" -Value $startScript

$startBat = @"
@echo off
set NODE_ENV=production
set PORT=3000
node server.js
"@
Set-Content -Path "$DEPLOY_DIR\start.bat" -Value $startBat

Write-Host "创建部署说明..."
$deployReadme = @"
# Leverage AI Platform - 部署包 $DEPLOYMENT_VERSION

## 部署信息
- 版本: $DEPLOYMENT_VERSION
- 构建时间: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
- 目标环境: TCB ($TCB_ENV_ID)

## 部署步骤

### 方法1: 使用TCB CLI
``````bash
tcb login
tcb hosting deploy . -e $TCB_ENV_ID
``````

### 方法2: 手动上传
1. 登录 TCB 控制台
2. 选择环境: $TCB_ENV_ID
3. 上传所有文件到根目录
4. 配置环境变量（从 .env 文件）
5. 重启应用

## 本地测试

### Linux/Mac
``````bash
./start.sh
``````

### Windows
``````cmd
start.bat
``````

访问 http://localhost:3000

## 验证清单
- [ ] 访问首页无报错
- [ ] 用户可注册和登录
- [ ] 供应商模块正常
- [ ] AI功能正常响应
- [ ] 数据库连接正常

## 回滚
如需回滚，使用上一个版本的部署包重新部署。
"@
Set-Content -Path "$DEPLOY_DIR\DEPLOY_README.md" -Value $deployReadme

# 压缩部署包
Write-Host "压缩部署包..."
Compress-Archive -Path $DEPLOY_DIR -DestinationPath $DEPLOY_ZIP -Force
Write-ColorOutput "✓ 部署包创建完成: $DEPLOY_ZIP" "Green"

# 显示部署包信息
$deploySize = (Get-Item $DEPLOY_ZIP).Length
$deploySizeMB = [math]::Round($deploySize / 1MB, 2)
Write-ColorOutput "✓ 部署包大小: $deploySizeMB MB" "Green"

Write-Host ""

# 总结
Write-ColorOutput "╔═══════════════════════════════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║   部署准备完成                                                ║" "Cyan"
Write-ColorOutput "╚═══════════════════════════════════════════════════════════════╝" "Cyan"
Write-Host ""
Write-ColorOutput "✅ 所有步骤完成！" "Green"
Write-Host ""
Write-ColorOutput "📦 部署包信息:" "Yellow"
Write-Host "  文件: $DEPLOY_ZIP"
Write-Host "  大小: $deploySizeMB MB"
Write-Host "  路径: $(Get-Location)\$DEPLOY_ZIP"
Write-Host ""
Write-ColorOutput "📋 下一步操作:" "Yellow"
Write-Host "  1. 解压部署包: Expand-Archive -Path $DEPLOY_ZIP -DestinationPath ."
Write-Host "  2. 本地测试: cd $DEPLOY_DIR; .\start.bat"
Write-Host "  3. 上传到TCB: tcb hosting deploy $DEPLOY_DIR -e $TCB_ENV_ID"
Write-Host ""
Write-ColorOutput "📖 详细说明请查看:" "Yellow"
Write-Host "  - $DEPLOY_DIR\DEPLOY_README.md"
Write-Host "  - PRODUCTION_DEPLOYMENT_GUIDE_V2.6.md"
Write-Host ""
Write-ColorOutput "🚀 祝部署顺利！" "Green"
