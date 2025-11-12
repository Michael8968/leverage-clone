# TCB Cloud Run 部署环境变量配置

## 问题说明

在 TCB Cloud Run 通过 GitHub 自动部署时，Docker 构建过程需要访问某些环境变量。本文档说明如何正确配置。

## 已修复的问题

**错误信息:**
```
Error: TCB environment ID is not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.
at /api/auth/me build time
```

**解决方案:**
1. Dockerfile 已添加 ARG 参数支持
2. TCB 初始化改为延迟加载
3. 添加了构建时默认值

## TCB Cloud Run 部署配置

### 必需的构建参数 (Build Args)

在 TCB Cloud Run 控制台配置以下构建参数：

```yaml
Build Arguments:
  NEXT_PUBLIC_TCB_ENV_ID: cloud1-7galmfiu70af91a6
  NEXT_PUBLIC_ENV: production
  NEXT_PUBLIC_USE_TCB_AUTH: true
```

### 必需的运行时环境变量 (Runtime Env Vars)

在 TCB Cloud Run 控制台配置以下运行时环境变量：

```yaml
Environment Variables:
  # TCB 配置
  NEXT_PUBLIC_TCB_ENV_ID: cloud1-7galmfiu70af91a6
  TCB_ENV_ID: cloud1-7galmfiu70af91a6
  TCB_SECRET_ID: [从腾讯云控制台获取]
  TCB_SECRET_KEY: [从腾讯云控制台获取]
  TENCENTCLOUD_SECRET_ID: [同 TCB_SECRET_ID]
  TENCENTCLOUD_SECRET_KEY: [同 TCB_SECRET_KEY]
  TENCENTCLOUD_REGION: ap-shanghai
  
  # 应用配置
  NODE_ENV: production
  NEXT_PUBLIC_ENV: production
  NEXT_PUBLIC_USE_TCB_AUTH: true
  JWT_SECRET: [生产环境 JWT 密钥]
  
  # AI 服务
  HUNYUAN_API_KEY: [腾讯 AI 密钥]
  HUNYUAN_BASE_URL: https://api.hunyuan.cloud.tencent.com/v1
  HUNYUAN_MODEL: hunyuan-lite
  AI_DEFAULT_AGENT: hunyuan
  
  # COS 存储
  COS_SECRET_ID: [同 TCB_SECRET_ID]
  COS_SECRET_KEY: [同 TCB_SECRET_KEY]
  COS_REGION: ap-shanghai
  
  # 可选配置
  OPENAI_API_KEY: [可选]
  GEMINI_API_KEY: [可选 - 3D 生成]
  TRIPO3D_API_KEY: [可选 - 3D 模型]
  COS_BUCKET: [可选 - 存储桶名称]
  LITELLM_PROXY_URL: [可选 - LiteLLM 代理]
```

## TCB Cloud Run 控制台配置步骤

### 1. 访问 TCB Cloud Run 控制台

https://console.cloud.tencent.com/tcb/run

### 2. 选择你的服务

服务名称: leverage-ai (或你配置的名称)

### 3. 配置构建参数

在"构建配置"部分：
- 构建方式: Dockerfile
- Dockerfile 路径: ./Dockerfile
- 构建参数:
  ```
  NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
  NEXT_PUBLIC_ENV=production
  NEXT_PUBLIC_USE_TCB_AUTH=true
  ```

### 4. 配置运行时环境变量

在"环境变量"部分添加上述所有运行时变量。

**重要提示:**
- TCB_SECRET_ID 和 TCB_SECRET_KEY 必须配置，否则无法访问数据库
- JWT_SECRET 建议使用至少 64 字符的随机字符串
- 所有密钥类信息请妥善保管，不要提交到代码仓库

### 5. 配置资源

推荐配置:
- CPU: 1 核 或 2 核
- 内存: 2GB 或 4GB
- 实例数: 1-10 (根据流量自动伸缩)
- 端口: 3000

### 6. 触发部署

保存配置后，TCB 会自动从 GitHub 拉取代码并构建部署。

## 验证部署

部署完成后，访问以下端点验证：

```bash
# 健康检查
curl https://your-domain.com/api/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-11-12T...",
  "environment": "production"
}
```

## 故障排查

### 构建失败: "TCB environment ID is not configured"

**原因:** 构建参数未正确配置

**解决:**
1. 检查 TCB Cloud Run 控制台的"构建配置"
2. 确保 `NEXT_PUBLIC_TCB_ENV_ID` 已添加到构建参数
3. 重新触发构建

### 运行时错误: "TCB operations may fail"

**原因:** 运行时环境变量缺失

**解决:**
1. 检查 TCB Cloud Run 控制台的"环境变量"
2. 确保 `TCB_SECRET_ID` 和 `TCB_SECRET_KEY` 已配置
3. 重启服务

### 数据库连接失败

**原因:** TCB 凭证不正确或权限不足

**解决:**
1. 验证 TCB_ENV_ID 是否正确
2. 验证 SECRET_ID 和 SECRET_KEY 是否有效
3. 检查腾讯云 IAM 权限设置

## 本地测试

在本地测试 Docker 构建：

```bash
# 构建镜像
docker build \
  --build-arg NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6 \
  --build-arg NEXT_PUBLIC_ENV=production \
  --build-arg NEXT_PUBLIC_USE_TCB_AUTH=true \
  -t leverage-ai:test .

# 运行容器
docker run -p 3000:3000 \
  --env-file .env.local \
  leverage-ai:test

# 测试
curl http://localhost:3000/api/health
```

## 安全建议

1. **不要在代码中硬编码密钥**
   - 所有敏感信息都通过环境变量配置

2. **定期轮换密钥**
   - JWT_SECRET 建议每季度更换
   - TCB 密钥建议每半年审核

3. **最小权限原则**
   - TCB SECRET_ID/KEY 只赋予必需的权限
   - 不要使用主账号密钥

4. **监控和日志**
   - 开启 TCB Cloud Run 日志
   - 配置告警规则

## 相关文档

- [Dockerfile](./Dockerfile) - Docker 构建配置
- [.env.local](./.env.local) - 本地环境变量模板（请勿提交）
- [DEPLOYMENT_READINESS_REPORT.md](./DEPLOYMENT_READINESS_REPORT.md) - 部署准备报告
- [TCB Cloud Run 官方文档](https://cloud.tencent.com/document/product/1243)

---

**更新时间:** 2025-11-12  
**作者:** Leverage AI 团队
