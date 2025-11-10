#!/usr/bin/env pwsh
# TCB 云托管部署脚本

param(
    [string]$Action = "deploy",  # deploy, logs, status, rollback
    [string]$ServiceName = "leverage-ai",
    [switch]$AutoConfirm = $false
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TCB 云托管部署工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 检查 TCB CLI
function Test-TCBCli {
    try {
        $version = tcb --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ TCB CLI 已安装: $version" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "✗ TCB CLI 未安装" -ForegroundColor Red
        Write-Host "安装命令: npm install -g @cloudbase/cli" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# 检查登录状态
function Test-TCBLogin {
    try {
        $envList = tcb env:list 2>&1
        if ($envList -match "cloud1-7galmfiu70af91a6") {
            Write-Host "✓ 已登录 TCB" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "✗ 未登录 TCB" -ForegroundColor Red
        Write-Host "请运行: tcb login" -ForegroundColor Yellow
        return $false
    }
    return $false
}

# 部署前检查
function Test-PreDeploy {
    Write-Host "📋 部署前检查..." -ForegroundColor Yellow
    Write-Host ""
    
    $checks = @{
        "Dockerfile" = (Test-Path "Dockerfile")
        "cloudbaserc-run.json" = (Test-Path "cloudbaserc-run.json")
        ".env.local" = (Test-Path ".env.local")
        ".next/standalone" = (Test-Path ".next/standalone")
    }
    
    $allPassed = $true
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "  ✓ $($check.Key)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $($check.Key) - 缺失" -ForegroundColor Red
            $allPassed = $false
        }
    }
    
    Write-Host ""
    return $allPassed
}

# 显示环境信息
function Show-Environment {
    Write-Host "🌐 环境信息:" -ForegroundColor Yellow
    Write-Host "  环境 ID: cloud1-7galmfiu70af91a6" -ForegroundColor White
    Write-Host "  区域: ap-shanghai" -ForegroundColor White
    Write-Host "  服务名: $ServiceName" -ForegroundColor White
    Write-Host ""
}

# 部署服务
function Deploy-Service {
    Write-Host "🚀 开始部署..." -ForegroundColor Yellow
    Write-Host ""
    
    if (-not (Test-PreDeploy)) {
        Write-Host "❌ 部署前检查失败" -ForegroundColor Red
        Write-Host ""
        Write-Host "建议操作:" -ForegroundColor Yellow
        Write-Host "  1. 确保已运行: npm run build" -ForegroundColor White
        Write-Host "  2. 检查 cloudbaserc-run.json 配置" -ForegroundColor White
        Write-Host "  3. 确保 .env.local 存在" -ForegroundColor White
        return $false
    }
    
    # 确认部署
    if (-not $AutoConfirm) {
        Write-Host "即将部署到 TCB 云托管" -ForegroundColor Cyan
        Write-Host "配置:" -ForegroundColor White
        Write-Host "  - CPU: 1核" -ForegroundColor Gray
        Write-Host "  - 内存: 2GB" -ForegroundColor Gray
        Write-Host "  - 最小实例: 1" -ForegroundColor Gray
        Write-Host "  - 最大实例: 5" -ForegroundColor Gray
        Write-Host ""
        $confirm = Read-Host "确认部署? (y/n)"
        if ($confirm -ne "y") {
            Write-Host "取消部署" -ForegroundColor Yellow
            return $false
        }
    }
    
    Write-Host ""
    Write-Host "正在构建和部署..." -ForegroundColor Cyan
    
    # 设置环境变量
    $env:ENV_ID = "cloud1-7galmfiu70af91a6"
    
    # 执行部署
    tcb run deploy --config cloudbaserc-run.json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 部署成功！" -ForegroundColor Green
        Write-Host ""
        Write-Host "下一步:" -ForegroundColor Yellow
        Write-Host "  1. 查看服务状态: .\tcb-deploy.ps1 -Action status" -ForegroundColor White
        Write-Host "  2. 查看日志: .\tcb-deploy.ps1 -Action logs" -ForegroundColor White
        Write-Host "  3. 访问控制台: https://console.cloud.tencent.com/tcb/service" -ForegroundColor White
        return $true
    } else {
        Write-Host ""
        Write-Host "❌ 部署失败" -ForegroundColor Red
        Write-Host "请检查错误信息并重试" -ForegroundColor Yellow
        return $false
    }
}

# 查看日志
function Get-ServiceLogs {
    Write-Host "📋 获取服务日志..." -ForegroundColor Yellow
    Write-Host ""
    
    tcb run logs $ServiceName --tail 100 --follow
}

# 查看状态
function Get-ServiceStatus {
    Write-Host "📊 服务状态:" -ForegroundColor Yellow
    Write-Host ""
    
    tcb run list
    
    Write-Host ""
    Write-Host "详细信息:" -ForegroundColor Yellow
    tcb run describe $ServiceName
}

# 回滚
function Invoke-Rollback {
    Write-Host "🔄 回滚服务..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "⚠️  警告: 这将回滚到上一个版本" -ForegroundColor Red
    $confirm = Read-Host "确认回滚? (y/n)"
    
    if ($confirm -eq "y") {
        tcb run rollback $ServiceName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 回滚成功" -ForegroundColor Green
        } else {
            Write-Host "❌ 回滚失败" -ForegroundColor Red
        }
    } else {
        Write-Host "取消回滚" -ForegroundColor Yellow
    }
}

# 主逻辑
Write-Host ""
Show-Environment

# 检查环境
if (-not (Test-TCBCli)) {
    exit 1
}

if (-not (Test-TCBLogin)) {
    exit 1
}

Write-Host ""

# 执行操作
switch ($Action) {
    "deploy" {
        Deploy-Service
    }
    "logs" {
        Get-ServiceLogs
    }
    "status" {
        Get-ServiceStatus
    }
    "rollback" {
        Invoke-Rollback
    }
    default {
        Write-Host "未知操作: $Action" -ForegroundColor Red
        Write-Host ""
        Write-Host "可用操作:" -ForegroundColor Yellow
        Write-Host "  deploy   - 部署服务" -ForegroundColor White
        Write-Host "  logs     - 查看日志" -ForegroundColor White
        Write-Host "  status   - 查看状态" -ForegroundColor White
        Write-Host "  rollback - 回滚版本" -ForegroundColor White
        Write-Host ""
        Write-Host "示例:" -ForegroundColor Yellow
        Write-Host "  .\tcb-deploy.ps1 -Action deploy" -ForegroundColor Gray
        Write-Host "  .\tcb-deploy.ps1 -Action logs" -ForegroundColor Gray
        Write-Host "  .\tcb-deploy.ps1 -Action status" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
