# 🔍 构建诊断与修复完整指南

## 📊 诊断结果摘要

**诊断时间**: 2025-10-21

### ✅ 已修复问题
1. ✅ 删除了 3 个旧 .js 流文件（intelligent-routing-flow.js, prompt-execution-flow.js, clarify-demand-details.js）
2. ✅ 移除了 prompt-execution-flow.ts 中的 CloudBase SDK 引用
3. ✅ package.json 中已移除废弃依赖（@cloudbase/node-sdk, tencentcloud-sdk-nodejs-hunyuan）
4. ✅ 创建了 3 个调试配置文件：debug-next.config.js, next.config.debug.js, next.config.extreme-debug.js

### ⚠️ 当前状态
- **构建状态**: 最近一次成功（Exit Code: 0）
- **配置模式**: 当前使用调试配置（swcMinify: false, optimizeCss: false）
- **建议操作**: 清理构建缓存后尝试生产配置

---

## 🛠️ 可用的调试配置

### 1. `debug-next.config.js` ⭐ 推荐
**适用场景**: 标准诊断，平衡速度和稳定性

**特性**:
```javascript
{
  swcMinify: false,              // 使用 Terser（稳定）
  experimental: {
    turbo: false,                // 禁用 Turbopack
    optimizeCss: false,          // 禁用 CSS 优化
  },
  webpack: {
    cache: false,                // 禁用 webpack 缓存
    resolve: {
      fallback: {                // 忽略已卸载的包
        '@cloudbase/node-sdk': false,
        'tencentcloud-sdk-nodejs-hunyuan': false,
      }
    }
  }
}
```

**使用**:
```powershell
copy debug-next.config.js next.config.js
npm run build
```

---

### 2. `next.config.debug.js`
**适用场景**: 快速诊断，禁用基础优化

**特性**:
- swcMinify: false
- optimizeCss: false
- 跳过 TypeScript/ESLint 检查

**使用**:
```powershell
npm run build:debug
```

---

### 3. `next.config.extreme-debug.js`
**适用场景**: 严重卡顿，需要极端诊断

**特性**:
- 禁用所有优化（包括 compress）
- 禁用 webpack 缓存
- 最大兼容性

**使用**:
```powershell
copy next.config.extreme-debug.js next.config.js
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

---

## 🚨 常见构建问题速查表

### 问题 1: Terser Minify 卡住
**症状**: 
- 卡在 "Creating an optimized production build" 超过 3 分钟
- CPU 使用率 100%
- 无任何日志输出

**原因**: Terser 在 Windows 上处理大文件时性能问题

**解决方案**:
```powershell
# 方案 A: 使用调试配置
copy debug-next.config.js next.config.js
npm run build

# 方案 B: 仅禁用 SWC minify
# 在 next.config.js 中添加:
# swcMinify: false

# 方案 C: 增加内存
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

---

### 问题 2: SWC 编译错误
**症状**:
- 报错 "SWC failed to compile"
- "Segmentation fault" 或 "core dumped"
- 构建突然崩溃

**原因**: SWC 编译器与某些代码模式不兼容

**解决方案**:
```powershell
# 方案 A: 降级 SWC（推荐）
npm install @swc/core@1.3.100

# 方案 B: 禁用 SWC minify
copy debug-next.config.js next.config.js
npm run build

# 方案 C: 降级 swc-loader（如果使用）
npm install swc-loader@^0.2.0
```

---

### 问题 3: CSS 优化卡住
**症状**:
- 卡在 "Finalizing page optimization"
- Critters 进程无响应
- 内存持续增长

**原因**: experimental.optimizeCss 功能在复杂 CSS 时卡顿

**解决方案**:
```javascript
// next.config.js
experimental: {
  optimizeCss: false,  // 禁用 CSS 优化
}
```

或直接使用：
```powershell
npm run build:debug
```

---

### 问题 4: 模块未找到错误
**症状**:
- `Cannot find module '@cloudbase/node-sdk'`
- `Module not found: Can't resolve 'tencentcloud-sdk-nodejs-hunyuan'`

**原因**: 代码仍引用已卸载的依赖

**解决方案**:
```powershell
# 1. 检查残留引用
npm run analyze

# 2. 清理依赖
npm run clean-deps

# 3. 删除旧文件（已完成）
# Remove-Item src/ai/flows/*.js

# 4. 使用 webpack fallback（已在 debug-next.config.js 中）
copy debug-next.config.js next.config.js
npm run build
```

---

### 问题 5: 内存不足
**症状**:
- `JavaScript heap out of memory`
- 构建到一半突然退出
- 系统内存占用 > 90%

**原因**: Node.js 默认内存限制（Windows: ~1.5GB）

**解决方案**:
```powershell
# 方案 A: 临时增加内存（当前会话）
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# 方案 B: 使用安全构建脚本
npm run build:safe

# 方案 C: 永久设置（系统环境变量）
# 1. Win + R → sysdm.cpl → 高级 → 环境变量
# 2. 新建系统变量：
#    名称: NODE_OPTIONS
#    值: --max-old-space-size=8192
```

---

## 📋 诊断工具使用

### 运行完整诊断
```powershell
npm run analyze
```

**输出**:
- ✅ 项目结构检查
- ⚠️ 废弃依赖引用扫描
- 📦 依赖版本报告
- 🗂️ 缓存状态
- ⚙️ 配置分析
- 💡 修复建议

**报告文件**: `build-diagnosis-report.json`

---

### 清理构建缓存
```powershell
npm run diagnose
```

**清理内容**:
- .next/cache
- .next/trace
- 备份 next.config.js

---

### 查看构建错误
```powershell
# 保存构建日志
npm run build 2>&1 | Tee-Object -FilePath build.log

# 查看最后 50 行错误
Get-Content build.log -Tail 50
```

---

## 🎯 推荐修复流程

### 流程 1: 快速修复（5 分钟）
```powershell
# 1. 使用调试配置
copy debug-next.config.js next.config.js

# 2. 清理缓存
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue

# 3. 构建
npm run build

# 4. 成功后恢复原配置（可选）
copy next.config.js.backup next.config.js
```

---

### 流程 2: 完全重置（10 分钟）
```powershell
# 1. 清理依赖
npm run clean-deps

# 2. 删除构建产物
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue

# 3. 应用调试配置
copy debug-next.config.js next.config.js

# 4. 重装依赖
npm ci

# 5. 增加内存并构建
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

---

### 流程 3: 诊断模式（15 分钟）
```powershell
# 1. 运行完整诊断
npm run analyze

# 2. 检查报告
Get-Content build-diagnosis-report.json

# 3. 根据建议修复
# (参考报告中的 recommendations)

# 4. 使用安全构建
npm run build:safe

# 5. 验证
npm run typecheck
```

---

## 🚀 生产环境优化（构建稳定后）

### 恢复生产配置
当调试配置构建成功后，可以逐步恢复优化：

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  
  // ✅ 启用 SWC minify（快速）
  swcMinify: true,
  
  experimental: {
    // ✅ 启用 CSS 优化（减小体积）
    optimizeCss: true,
  },
  
  // 保留必要的跳过设置（加速构建）
  typescript: {
    ignoreBuildErrors: false,  // 生产环境检查类型
  },
  eslint: {
    ignoreDuringBuilds: false,  // 生产环境检查代码质量
  },
};
```

### 测试流程
```powershell
# 1. 备份调试配置
copy next.config.js next.config.debug.backup

# 2. 恢复生产配置
copy next.config.js.backup next.config.js

# 3. 清理缓存
Remove-Item .next -Recurse -Force

# 4. 增加内存构建
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# 5. 如果失败，回退到调试配置
copy next.config.debug.backup next.config.js
```

---

## 📊 性能对比

| 配置 | 构建时间 | 产物大小 | 稳定性 | 推荐场景 |
|------|---------|---------|--------|---------|
| 生产配置<br/>(swcMinify: true, optimizeCss: true) | ~2 分钟 | 最小 | ⚠️ 可能卡顿 | CI/CD 环境 |
| 调试配置<br/>(debug-next.config.js) | ~3 分钟 | +15% | ✅ 稳定 | 本地开发、诊断 |
| 极端调试<br/>(extreme-debug) | ~5 分钟 | +25% | ✅✅ 最稳定 | 严重问题排查 |

---

## 🔧 高级配置选项

### 针对 Windows 优化
```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    // Windows 文件系统优化
    config.snapshot = {
      managedPaths: [/^(.+?[\\/]node_modules[\\/])/],
    };
    
    // 减少并行处理（降低内存）
    config.parallelism = 1;
    
    return config;
  },
};
```

### 针对大型项目
```javascript
experimental: {
  // 增量式静态再生成
  isrMemoryCacheSize: 0,
  
  // 禁用不必要的功能
  optimizePackageImports: [],
  
  // 减少构建并发
  workerThreads: false,
}
```

---

## 📝 检查清单

构建前检查：
- [ ] 已删除旧 .js 流文件
- [ ] 已移除 CloudBase SDK 引用
- [ ] package.json 无废弃依赖
- [ ] .next 缓存已清理
- [ ] Node.js 内存限制已设置（8GB+）
- [ ] 使用调试配置（首次构建）

构建后验证：
- [ ] 构建成功（Exit Code: 0）
- [ ] 无 module not found 错误
- [ ] TypeScript 检查通过
- [ ] standalone 模式可运行
- [ ] Docker 镜像 < 150MB

---

## 🆘 获取帮助

### 1. 查看详细日志
```powershell
# 构建时显示详细信息
$env:DEBUG="*"
npm run build

# 或保存到文件
npm run build 2>&1 > build-detailed.log
```

### 2. 检查 Next.js 版本兼容性
```powershell
npm list next @swc/core
```

### 3. 运行完整诊断
```powershell
npm run analyze
Get-Content build-diagnosis-report.json
```

### 4. 社区资源
- Next.js 讨论: https://github.com/vercel/next.js/discussions
- SWC 问题: https://github.com/swc-project/swc/issues
- Stack Overflow: 标签 `next.js` + `build-error`

---

## 🎯 总结

### 快速命令参考
```powershell
# 诊断
npm run analyze

# 安全构建（调试配置 + 大内存）
npm run build:safe

# 标准调试构建
npm run build:debug

# 清理依赖
npm run clean-deps

# 类型检查
npm run typecheck

# 完全重置
Remove-Item .next, node_modules -Recurse -Force
npm ci
copy debug-next.config.js next.config.js
npm run build
```

### 记住
1. ✅ 首次构建使用调试配置
2. ✅ 稳定后逐步启用优化
3. ✅ 遇到问题先运行 `npm run analyze`
4. ✅ Windows 环境务必增加 Node 内存
5. ✅ 保留配置备份便于回滚
