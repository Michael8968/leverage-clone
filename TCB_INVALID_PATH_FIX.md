# TCB Cloud Run INVALID_PATH 错误修复

## 🔴 错误信息

```
请求ID: 80eb77bf-f30a-4df7-b086-3357871118e1
错误码: INVALID_PATH
错误信息: Invalid path. For more information, please refer to https://docs.cloudbase.net/error-code/service
```

## 🔍 问题分析

这个错误通常发生在以下情况：

1. **健康检查路径配置错误**
   - CloudBase 尝试访问配置的健康检查路径失败
   - 路径不存在或格式不正确

2. **静态资源路径问题**
   - 尝试访问不存在的静态文件
   - 路径映射配置错误

3. **路由配置问题**
   - Next.js 路由与 CloudBase 路由冲突
   - 路径重写规则错误

## ✅ 解决方案

### 1. 修复健康检查路径

已修复 `cloudbaserc-run.json` 中的健康检查配置：

```json
{
  "healthCheck": {
    "enabled": true,
    "type": "http",
    "path": "/api/health",  // ✅ 修改为正确的 API 路径
    "port": 3000,
    "interval": 30,
    "timeout": 10,
    "successThreshold": 1,
    "failureThreshold": 3,
    "initialDelaySeconds": 30  // ✅ 增加初始延迟
  }
}
```

**变更说明**：
- ❌ 旧配置：`"path": "/"` - 根路径可能导致路由冲突
- ✅ 新配置：`"path": "/api/health"` - 明确的健康检查端点
- ✅ 增加初始延迟从 15s 到 30s，给应用更多启动时间

### 2. 验证健康检查端点

确保 `/api/health` 端点正常工作：

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.NEXT_PUBLIC_ENV,
    dbType: getDbType(),
    dbStatus: 'ok',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
```

**本地测试**：
```bash
curl http://localhost:3000/api/health

# 预期响应
{
  "ok": true,
  "env": "production",
  "dbType": "tcb",
  "dbStatus": "ok",
  "timestamp": "2025-11-11T00:00:00.000Z"
}
```

### 3. TCB 控制台配置验证

在 TCB 云托管控制台检查以下配置：

#### A. 容器端口配置
```yaml
容器端口: 3000
协议: TCP
```

#### B. 健康检查配置
```yaml
检查类型: HTTP
检查路径: /api/health
检查端口: 3000
初始延迟: 30 秒
检查间隔: 30 秒
超时时间: 10 秒
成功阈值: 1
失败阈值: 3
```

#### C. 环境变量
```bash
NODE_ENV=production
NEXT_PUBLIC_ENV=production
PORT=3000
# ... 其他必需变量
```

### 4. 路由配置检查

确保 Next.js 应用的路由配置正确：

```javascript
// next.config.js
module.exports = {
  // 确保没有与 TCB 冲突的路由重写
  async rewrites() {
    return [];
  },
  
  // 确保健康检查路径不被重定向
  async redirects() {
    return [];
  }
}
```

## 🚀 重新部署步骤

1. **提交配置修改**
```bash
git add cloudbaserc-run.json
git commit -m "fix: Update health check path to /api/health"
git push origin tcb-cloudrun-fullstack-ready
```

2. **触发 TCB 重新部署**
   - 方式 1: 推送代码自动触发
   - 方式 2: TCB 控制台手动触发部署

3. **验证部署**
```bash
# 等待部署完成后测试
curl https://your-domain.com/api/health

# 检查 Pod 状态
# TCB 控制台 > 云托管 > 服务详情 > 实例列表
# 状态应为：运行中 ✅
```

## 🔧 排查命令

### 检查服务状态
```bash
# TCB CLI
tcb run:service:describe --name leverage-ai

# 查看实时日志
tcb run:log:stream --name leverage-ai
```

### 本地调试
```bash
# 构建并运行容器
docker build -t leverage-test .
docker run -p 3000:3000 --env-file .env leverage-test

# 测试健康检查
curl http://localhost:3000/api/health
curl http://localhost:3000/
```

## 📊 常见的 INVALID_PATH 场景

### 场景 1: 健康检查路径不存在
```
健康检查: /health (❌ 路径不存在)
正确路径: /api/health ✅
```

### 场景 2: 端口不匹配
```
健康检查端口: 80 (❌ 应用实际运行在 3000)
正确端口: 3000 ✅
```

### 场景 3: 路径格式错误
```
错误: /api/health/ (带尾部斜杠可能导致问题)
正确: /api/health ✅
```

### 场景 4: 应用未完全启动
```
初始延迟: 5秒 (❌ 太短，应用还在启动)
建议延迟: 30秒 ✅
```

## 🎯 验证清单

部署后验证以下项目：

- [ ] Pod 状态为 "运行中"
- [ ] 健康检查显示 "通过"
- [ ] `/api/health` 返回 200 状态码
- [ ] 应用首页可以访问
- [ ] 没有路由相关的错误日志
- [ ] 没有 INVALID_PATH 错误

## 📝 预防措施

为避免未来出现类似问题：

1. **使用明确的健康检查路径**
   - 推荐：`/api/health` 或 `/health`
   - 避免：使用根路径 `/`

2. **设置合理的初始延迟**
   - Next.js 应用：30-60 秒
   - 简单应用：10-15 秒

3. **路径一致性**
   - Dockerfile 中的 HEALTHCHECK
   - cloudbaserc-run.json 中的配置
   - TCB 控制台的配置
   - 三者必须保持一致

4. **定期测试健康检查端点**
   ```bash
   # 添加到 CI/CD
   npm test
   curl http://localhost:3000/api/health
   ```

## 📞 如果问题仍然存在

1. **查看详细日志**
   - TCB 控制台 > 日志 > 实时日志
   - 搜索 "INVALID_PATH" 或 "health check"

2. **检查网络策略**
   - 确认容器可以访问自身的端口
   - 检查安全组规则

3. **联系腾讯云支持**
   - 提供请求 ID: `80eb77bf-f30a-4df7-b086-3357871118e1`
   - 提供服务名称和环境 ID

## 📚 相关文档

- [CloudBase 错误码说明](https://docs.cloudbase.net/error-code/service)
- [云托管健康检查配置](https://docs.cloudbase.net/run/health-check)
- [TCB_HEALTH_CHECK_FIX.md](./TCB_HEALTH_CHECK_FIX.md)

---

**修复状态**: ✅ 配置已更新  
**下一步**: 推送代码并重新部署  
**预计解决时间**: 部署后 2-3 分钟
