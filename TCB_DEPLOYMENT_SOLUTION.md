# 腾讯云 CloudBase 云托管部署方案

## 📋 方案概述

本方案使用腾讯云 CloudBase 云托管服务，通过 Docker 容器化部署 Next.js 15 全栈应用。

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    用户访问层                              │
│            (域名 + SSL + CDN 可选)                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              TCB 云托管 Cloud Run                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Kubernetes Service (端口映射 80→3000)            │   │
│  └───────────────────┬──────────────────────────────┘   │
│                      │                                   │
│  ┌───────────────────▼──────────────────────────────┐   │
│  │           容器实例 (Pods)                          │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  Next.js Server (Port 3000)                │  │   │
│  │  │  - API Routes                              │  │   │
│  │  │  - SSR Pages                               │  │   │
│  │  │  - Static Assets                           │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │  资源: 0.5 Core CPU + 1GB Memory                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼───────┐ ┌─▼──────┐ ┌───▼─────────┐
│  TCB Database │ │  COS   │ │  Hunyuan AI │
│  (NoSQL)      │ │ 对象存储 │ │   混元大模型  │
└───────────────┘ └────────┘ └─────────────┘
```

## 🔧 核心组件

### 1. Docker 镜像
```
基础镜像: node:20-alpine
构建方式: Multi-stage (deps → builder → runtime)
最终大小: ~231MB
输出模式: Next.js Standalone
运行用户: nextjs:1001 (非 root)
```

### 2. 应用配置
```
框架: Next.js 15.5.6
Node.js: v20 LTS
端口: 3000
健康检查: /api/health
启动时间: ~30秒
```

### 3. 云服务集成
- **数据库**: CloudBase Database (TCB)
- **存储**: 腾讯云 COS
- **AI**: 腾讯混元 (Hunyuan)
- **认证**: TCB Auth

## 📦 部署流程

### Step 1: 准备镜像仓库
```bash
# 腾讯云容器镜像服务 (CCR)
Registry: ccr.ccs.tencentyun.com
Namespace: tcb-100011340160-hcwe
Repository: ca-qrxboqpw_leverage
```

### Step 2: 配置自动构建
```yaml
# 在 TCB 控制台配置
代码源: GitHub
仓库: Angus1976/leverage-clone
分支: tcb-cloudrun-fullstack-ready
构建方式: Dockerfile
Dockerfile 路径: ./Dockerfile
```

### Step 3: 环境变量配置
```bash
# 必需变量 (TCB 控制台配置)
NODE_ENV=production
NEXT_PUBLIC_ENV=production
PORT=3000

# TCB 配置
TCB_ENV_ID=cloud1-7galmfiu70af91a6
TCB_SECRET_ID=<secret>
TCB_SECRET_KEY=<secret>

# AI 服务
HUNYUAN_API_KEY=<secret>
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1

# JWT 密钥
JWT_SECRET=<secret>
```

### Step 4: 健康检查配置
```yaml
# 容器配置
containerPort: 3000
protocol: TCP

# 就绪探针
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# 存活探针
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

### Step 5: 资源配置
```yaml
资源规格:
  CPU: 0.5 核
  内存: 1GB
  
实例配置:
  最小实例: 1
  最大实例: 10
  自动扩缩容: 启用
  
流量配置:
  服务端口: 80 (外部访问)
  容器端口: 3000 (内部)
  协议: HTTP
```

## 🚀 部署步骤

### 方式 1: 自动部署（推荐）

1. **推送代码到 GitHub**
```bash
git add .
git commit -m "feat: your changes"
git push origin tcb-cloudrun-fullstack-ready
```

2. **TCB 自动触发构建**
- 自动拉取代码
- 执行 Docker 构建
- 推送镜像到 CCR
- 滚动更新部署

3. **验证部署**
```bash
# 检查部署状态
curl https://your-domain.com/api/health

# 预期响应
{
  "ok": true,
  "env": "production",
  "dbType": "tcb",
  "dbStatus": "ok",
  "timestamp": "2025-11-11T00:00:00.000Z"
}
```

### 方式 2: 手动部署

1. **本地构建镜像**
```bash
docker build -t leverage-app:latest .
```

2. **推送到 CCR**
```bash
docker tag leverage-app:latest ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest
docker push ccr.ccs.tencentyun.com/tcb-100011340160-hcwe/ca-qrxboqpw_leverage:latest
```

3. **TCB 控制台创建版本**
- 选择镜像
- 配置环境变量
- 配置健康检查
- 部署

## 🔒 安全措施

### 1. 镜像安全
- ✅ 使用 Alpine Linux 最小化镜像
- ✅ 非 root 用户运行 (nextjs:1001)
- ✅ 多阶段构建减少攻击面
- ✅ 不在镜像中包含敏感信息

### 2. 网络安全
- ✅ HTTPS/SSL 加密传输
- ✅ 私有网络隔离
- ✅ 安全组策略控制
- ✅ DDoS 防护

### 3. 数据安全
- ✅ 环境变量加密存储
- ✅ 密钥分离管理
- ✅ 数据库访问控制
- ✅ COS 存储桶策略

### 4. 应用安全
- ✅ JWT 令牌认证
- ✅ CORS 跨域控制
- ✅ 输入验证和过滤
- ✅ SQL/NoSQL 注入防护

## 📊 监控与告警

### 1. 基础监控
```yaml
监控指标:
  - CPU 使用率
  - 内存使用率
  - 网络流量
  - 请求数/QPS
  - 响应时间
  - 错误率
```

### 2. 日志管理
```yaml
日志类型:
  - 应用日志: stdout/stderr
  - 访问日志: Nginx/Ingress
  - 错误日志: 应用异常
  - 审计日志: 操作记录

日志保留: 7-30 天
日志分析: 云日志服务 (CLS)
```

### 3. 告警配置
```yaml
告警规则:
  - CPU > 80% 持续 5 分钟
  - 内存 > 90% 持续 5 分钟
  - 错误率 > 5% 持续 3 分钟
  - 服务不可用 > 1 分钟
  - Pod 重启次数 > 3 次/小时

通知方式:
  - 短信
  - 邮件
  - 企业微信
  - 电话（严重告警）
```

## 💰 成本优化

### 1. 资源优化
```yaml
策略:
  - 按需自动扩缩容
  - 非高峰期减少实例
  - 使用预留实例优惠
  - 优化镜像大小

当前配置成本:
  - 云托管: ~200-500 元/月
  - 数据库: ~100-300 元/月
  - COS 存储: ~50-100 元/月
  - 带宽流量: 按实际使用
```

### 2. 性能优化
```yaml
优化措施:
  - CDN 加速静态资源
  - 启用 Gzip/Brotli 压缩
  - 图片懒加载和优化
  - API 响应缓存
  - 数据库查询优化
  - 连接池复用
```

## 🔄 运维管理

### 1. 版本管理
```bash
# 版本命名规范
leverage-{version}-{timestamp}
例如: leverage-005-20251110233400

# 保留策略
- 保留最近 10 个版本
- 标记稳定版本
- 支持一键回滚
```

### 2. 发布策略
```yaml
灰度发布:
  - 10% 流量验证
  - 30% 流量观察
  - 100% 流量切换

回滚条件:
  - 错误率上升
  - 性能下降
  - 用户投诉增加
  - 关键功能异常
```

### 3. 备份策略
```yaml
数据备份:
  - 数据库: 每日自动备份
  - 保留周期: 30 天
  - 异地容灾: 启用

配置备份:
  - 环境变量: 版本控制
  - K8s 配置: Git 管理
  - 镜像标签: 永久保留
```

## 📋 检查清单

### 部署前检查
- [ ] 代码已合并到目标分支
- [ ] 环境变量已配置完整
- [ ] 健康检查端点测试通过
- [ ] 数据库迁移脚本已准备
- [ ] 静态资源已上传 COS
- [ ] 域名和 SSL 证书已配置

### 部署中检查
- [ ] 构建日志无错误
- [ ] 镜像推送成功
- [ ] Pod 启动正常
- [ ] 健康检查通过
- [ ] 流量切换完成

### 部署后检查
- [ ] 首页可正常访问
- [ ] API 接口响应正常
- [ ] 数据库连接正常
- [ ] 文件上传功能正常
- [ ] 用户登录注册正常
- [ ] 性能指标在预期范围
- [ ] 无异常错误日志

## 📚 相关文档

- `PRODUCTION_DEPLOYMENT_SUCCESS.md` - 部署成功记录
- `TCB_HEALTH_CHECK_FIX.md` - 健康检查配置
- `TCB_CLOUD_RUN_DEPLOYMENT.md` - 详细部署指南
- `DOCKER_DEPLOYMENT.md` - Docker 配置说明
- `Dockerfile` - 容器构建文件

## 🆘 故障处理

### 常见问题

**问题 1: Pod 无法启动**
```bash
# 检查步骤
1. 查看 Pod 日志
2. 检查环境变量配置
3. 验证镜像是否可用
4. 检查资源限制
```

**问题 2: 健康检查失败**
```bash
# 检查步骤
1. 验证端口配置 (3000)
2. 测试 /api/health 端点
3. 检查初始延迟设置
4. 查看应用启动日志
```

**问题 3: 数据库连接失败**
```bash
# 检查步骤
1. 验证 TCB_ENV_ID 配置
2. 检查密钥是否正确
3. 确认网络策略允许访问
4. 测试数据库服务状态
```

### 紧急回滚
```bash
# TCB 控制台操作
1. 版本管理 → 历史版本
2. 选择上一个稳定版本
3. 点击"回滚"
4. 等待流量切换完成（约 1-2 分钟）
```

## 📞 支持联系

- **腾讯云支持**: https://console.cloud.tencent.com/workorder
- **CloudBase 文档**: https://docs.cloudbase.net/
- **技术社区**: https://cloud.tencent.com/developer/column

---

**文档版本**: v1.0  
**最后更新**: 2025-11-11  
**维护团队**: 开发运维团队
