# 快速验证生产环境
Write-Host "开始生产环境验证..." -ForegroundColor Cyan

# 1. 测试TCB连接
Write-Host "`n[1/3] 测试 TCB 连接..." -ForegroundColor Yellow
npx tsx --env-file=.env.production scripts/test-tcb-connection.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TCB 连接测试失败" -ForegroundColor Red
    exit 1
}

# 2. 测试供应商模块
Write-Host "`n[2/3] 测试供应商模块..." -ForegroundColor Yellow
npx tsx --env-file=.env.production scripts/test-supplier-products.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ 供应商模块测试失败" -ForegroundColor Red
    exit 1
}

# 3. 测试AI匹配
Write-Host "`n[3/3] 测试 AI 需求匹配..." -ForegroundColor Yellow
npx tsx --env-file=.env.production scripts/test-demand-matching.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ AI 匹配测试失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ 所有验证通过！生产环境运行正常。" -ForegroundColor Green
Write-Host "详细验证清单请查看: POST_DEPLOYMENT_VERIFICATION.md" -ForegroundColor Cyan
