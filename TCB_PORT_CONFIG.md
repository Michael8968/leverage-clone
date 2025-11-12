# TCB Cloud Run 端口配置说明

## 问题说明

应用监听端口 3000（非特权端口），但 TCB Cloud Run 默认健康检查端口 80，导致探针失败。

## 解决方案：在 TCB 控制台配置端口映射

### 1. 容器端口配置
在 TCB Cloud Run 服务配置中设置：

```yaml
容器端口: 3000
服务端口: 80 (可选，对外访问端口)
```

### 2. 健康检查配置
在健康检查设置中：

```yaml
检查协议: HTTP
检查端口: 3000  # ← 重要：必须设置为 3000
检查路径: /api/health
初始延迟: 10秒
间隔时间: 30秒
超时时间: 5秒
成功阈值: 1
失败阈值: 3
```

### 3. 端口映射配置

TCB 会自动处理外部 80/443 到容器 3000 的映射：

```
外部请求 (80/443) 
    ↓ 
TCB 负载均衡器
    ↓ 
容器内部 (3000)
```

## 配置步骤

### 方法1: 通过 TCB 控制台

1. 登录腾讯云 TCB 控制台
2. 进入 Cloud Run 服务详情
3. 点击"编辑服务配置"
4. **容器配置**:
   - 监听端口: `3000`
5. **健康检查配置**:
   - 检查端口: `3000`
   - 检查路径: `/api/health`
6. 保存并重新部署

### 方法2: 通过 cloudbaserc.json

更新 `cloudbaserc.json` 或 `cloudbaserc-run.json`:

```json
{
  "containerPort": 3000,
  "healthCheck": {
    "type": "HTTP",
    "port": 3000,
    "path": "/api/health",
    "initialDelaySeconds": 10,
    "timeoutSeconds": 5,
    "periodSeconds": 30,
    "successThreshold": 1,
    "failureThreshold": 3
  }
}
```

## 为什么不使用端口 80？

### 安全原因
- 端口 1-1023 是特权端口，需要 root 权限
- Dockerfile 使用非 root 用户 `nextjs` (UID 1001) 运行应用
- 非 root 用户无法绑定特权端口
- 错误信息: `Error: listen EACCES: permission denied 10.24.6.9:80`

### 最佳实践
- 容器内使用非特权端口（1024+）
- 由 TCB 负载均衡器处理端口映射
- 保持容器安全性（非 root 运行）

## 验证配置

部署成功后，检查：

```bash
# 查看容器日志
# 应该看到: ▲ Next.js server listening on port 3000

# 测试健康检查
curl http://your-service.tcb.qcloud.la/api/health

# 预期响应: {"status":"ok","timestamp":"..."}
```

## 常见错误

### 错误1: Back-off restarting failed container
**原因**: 容器启动失败，通常是端口权限问题  
**解决**: 确认容器端口设置为 3000

### 错误2: Readiness probe failed
**原因**: 健康检查端口配置错误  
**解决**: 健康检查端口改为 3000

### 错误3: EACCES permission denied :80
**原因**: 尝试以非 root 用户绑定 80 端口  
**解决**: 使用端口 3000 + TCB 端口映射

## 参考文档

- [TCB Cloud Run 端口配置](https://docs.cloudbase.net/run/container.html#端口配置)
- [健康检查配置](https://docs.cloudbase.net/run/container.html#健康检查)
- [Docker 非 root 用户最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#user)
