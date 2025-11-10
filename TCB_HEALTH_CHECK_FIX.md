# TCB 云托管健康检查配置修复

## 🔴 问题描述

```
Readiness probe failed: dial tcp 10.24.6.10:80: connect: connection refused
Liveness probe failed: dial tcp 10.24.6.10:80: connect: connection refused
```

**原因**：Kubernetes 健康检查探针配置为端口 80，但应用实际运行在端口 3000。

## ✅ 解决方案

### 方案 1：修改 TCB 控制台配置（推荐）

1. **登录腾讯云控制台**
   - 进入：云开发 CloudBase > 云托管 > 您的服务

2. **编辑服务配置**
   - 点击服务名称 > 版本管理 > 新建版本（或编辑现有版本）

3. **修改健康检查配置**
   
   **容器端口设置：**
   ```
   容器端口：3000
   协议：TCP
   ```

   **就绪探针（Readiness Probe）：**
   ```
   检查方式：HTTP GET
   检查路径：/api/health
   端口：3000
   初始延迟：10 秒
   检查间隔：10 秒
   超时时间：5 秒
   失败阈值：3
   ```

   **存活探针（Liveness Probe）：**
   ```
   检查方式：HTTP GET
   检查路径：/api/health
   端口：3000
   初始延迟：30 秒
   检查间隔：30 秒
   超时时间：5 秒
   失败阈值：3
   ```

4. **保存并部署**

### 方案 2：YAML 配置（如果使用 YAML 部署）

如果您使用 `apphosting.yaml` 或 K8s YAML 配置，添加以下内容：

```yaml
spec:
  containers:
  - name: leverage-app
    image: ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest
    ports:
    - containerPort: 3000
      protocol: TCP
    env:
    - name: PORT
      value: "3000"
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3000
        scheme: HTTP
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3000
        scheme: HTTP
      initialDelaySeconds: 30
      periodSeconds: 30
      timeoutSeconds: 5
      failureThreshold: 3
```

## 🔍 验证健康检查端点

确保 `/api/health` 端点正常工作：

```bash
# 本地测试
curl http://localhost:3000/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-11-10T23:52:50.000Z",
  "environment": "production",
  "database": "connected"
}
```

## 📝 环境变量配置

确保在 TCB 控制台配置了以下环境变量：

```bash
NODE_ENV=production
PORT=3000  # 重要：必须匹配容器端口
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_TCB_AUTH=true

# TCB 配置
NEXT_PUBLIC_TCB_ENV_ID=your_tcb_env_id
TCB_ENV_ID=your_tcb_env_id
TCB_SECRET_ID=your_secret_id
TCB_SECRET_KEY=your_secret_key

# 其他必需的环境变量...
```

## 🚀 重新部署

配置修改后：

1. 点击"部署"或"更新版本"
2. 等待 Pod 启动（约 1-2 分钟）
3. 检查服务状态：应显示为"运行中"

## 🔧 故障排查

### 如果健康检查仍然失败：

1. **检查端口配置**
   ```bash
   # 在 TCB 控制台的 Pod 日志中查找
   grep "PORT" /var/log/app.log
   ```

2. **检查应用启动日志**
   - TCB 控制台 > 日志 > 实时日志
   - 查找：`Server listening on port 3000` 或类似信息

3. **手动测试健康检查**
   ```bash
   # 进入 Pod 终端（TCB 控制台提供）
   wget -O- http://localhost:3000/api/health
   ```

4. **检查防火墙规则**
   - 确保容器内部端口 3000 没有被阻止

## 📊 成功指标

配置正确后，您应该看到：

- ✅ Pod 状态：Running
- ✅ 就绪探针：通过
- ✅ 存活探针：通过
- ✅ 服务访问：正常响应

## ⚠️ 注意事项

1. **端口一致性**：Dockerfile、环境变量和健康检查必须使用相同端口
2. **初始延迟**：Next.js 应用启动需要 10-30 秒，设置足够的初始延迟
3. **非 root 用户**：应用以 `nextjs:1001` 用户运行，无法使用 80 端口
4. **健康检查端点**：必须确保 `/api/health` 返回 200 状态码
