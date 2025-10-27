# Next.js 构建诊断与修复指南

## 快速诊断

运行自动诊断工具：
```powershell
npm run diagnose
```

## 常见构建卡点及解决方案

### 1. Terser 压缩卡住 ⏱️
**症状**：构建卡在 "Creating an optimized production build"，超过 3 分钟无响应

**原因**：Terser minifier 在处理大型文件时可能卡死（特别是 Windows + Node 22）

**解决方案**：
```powershell
# 方案 A：使用调试配置（已禁用优化）
copy next.config.debug.js next.config.js
npm run build

# 方案 B：增加 Node 内存
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# 方案 C：手动修改 next.config.js
# 添加: swcMinify: false
```

---

### 2. SWC 编译错误 ⚠️
**症状**：报错 "SWC failed to compile" 或 "Segmentation fault"

**原因**：SWC 编译器版本兼容性问题

**解决方案**：
```powershell
# 方案 A：降级 SWC
npm install @swc/core@1.3.100

# 方案 B：禁用 SWC minify
# next.config.js 添加: swcMinify: false

# 方案 C：使用调试配置
npm run build:debug
```

---

### 3. CSS 优化卡住 🎨
**症状**：卡在 "Finalizing page optimization"

**原因**：`experimental.optimizeCss` 功能导致 Critters 处理 CSS 时卡住

**解决方案**：
```powershell
# 已在 next.config.debug.js 中禁用
copy next.config.debug.js next.config.js
npm run build
```

或手动修改 `next.config.js`：
```js
experimental: {
  optimizeCss: false,  // 禁用 CSS 优化
}
```

---

### 4. 模块未找到 📦
**症状**：`Cannot find module '@cloudbase/node-sdk'` 或其他已卸载的依赖

**原因**：旧的 `.js` 文件仍然引用已删除的依赖

**解决方案**：
```powershell
# 检查引用
npm run diagnose

# 清理并重装依赖
npm run clean-deps

# 删除旧的 .js 流文件（如果存在）
# src/ai/flows/*.js（保留 .ts 文件）
```

---

### 5. 内存不足 💾
**症状**：`JavaScript heap out of memory`

**原因**：Node.js 默认内存限制不足（Windows 常见）

**解决方案**：
```powershell
# 临时增加内存（当前会话）
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# 永久设置（系统环境变量）
# 控制面板 > 系统 > 高级系统设置 > 环境变量
# 新建变量：
#   名称: NODE_OPTIONS
#   值: --max-old-space-size=8192
```

---

## 推荐构建流程

### 标准流程（生产环境）
```powershell
# 1. 清理缓存
npm run diagnose

# 2. 正常构建
npm run build

# 3. 如果成功，运行测试
npm run start:standalone:3006
```

### 调试流程（遇到卡顿时）
```powershell
# 1. 运行诊断
npm run diagnose

# 2. 使用调试配置
copy next.config.debug.js next.config.js

# 3. 增加内存并构建
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build

# 4. 成功后恢复原配置
copy next.config.js.backup next.config.js

# 5. 重新构建验证
npm run build
```

---

## 配置文件说明

### `next.config.js`（生产配置）
- ✅ 启用 CSS 优化
- ✅ 启用 SWC minify（默认）
- ✅ Standalone 输出
- 🎯 目标：最小体积 + 最优性能

### `next.config.debug.js`（调试配置）
- ❌ 禁用 CSS 优化
- ❌ 禁用 SWC minify（使用 Terser）
- ✅ Standalone 输出
- 🎯 目标：快速诊断卡点

---

## 脚本命令

```powershell
# 运行诊断工具
npm run diagnose

# 使用调试配置构建
npm run build:debug

# 清理依赖并重装
npm run clean-deps

# 常规构建
npm run build

# 类型检查
npm run typecheck
```

---

## 故障排查清单

- [ ] 运行 `npm run diagnose` 检查项目状态
- [ ] 删除 `.next/cache` 缓存目录
- [ ] 检查 `node_modules` 完整性（`npm ci`）
- [ ] 确认没有旧的 `.js` 流文件引用已删除依赖
- [ ] 尝试禁用优化（使用 `next.config.debug.js`）
- [ ] 增加 Node 内存限制（8GB）
- [ ] 关闭其他占用内存的程序
- [ ] 检查防火墙/杀毒软件是否干扰构建

---

## 联系支持

如果以上方案都无法解决，请提供：
1. 构建日志（`npm run build > build.log 2>&1`）
2. 系统信息（`node -v`, `npm -v`, OS 版本）
3. `next.config.js` 内容
4. `package.json` dependencies
