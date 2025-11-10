# TCB 云托管容器化部署指南

## 📋 概述

腾讯云 TCB（CloudBase）云托管支持通过 Docker 容器部署应用。本指南提供完整的部署流程。

## 🏗️ 架构说明

```
┌─────────────────────────────────────────────┐
│          TCB 云托管 (Cloud Run)              │
│  ┌───────────────────────────────────────┐  │
│  │     Docker 容器 (Next.js App)         │  │
│  │  - Node.js 20                         │  │
│  │  - Next.js Standalone                 │  │
│  │  - 端口: 3000                         │  │
│  └───────────────────────────────────────┘  │
│                    │                         │
│                    ↓                         │
│  ┌───────────────────────────────────────┐  │
│  │      TCB 云函数 (19 个已部署)         │  │
│  └───────────────────────────────────────┘  │
│                    │                         │
│                    ↓                         │
│  ┌───────────────────────────────────────┐  │
│  │       TCB 云数据库 (NoSQL)            │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 📦 部署文件准备

### 1. Dockerfile（已优化）

当前 Dockerfile 已针对 TCB 云托管优化：
- ✅ 多阶段构建
- ✅ 轻量级 Alpine 镜像
- ✅ 生产环境配置
- ✅ 健康检查支持

### 2. .dockerignore

确保排除不必要的文件：
```
node_modules
.next
.git
.github
.env.local
.env*.local
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.pem
coverage
.vscode
.idea
```

### 3. cloudbaserc.json（TCB 配置）

已配置云托管相关设置。

## 🚀 部署步骤

### 方式 A: 通过 TCB CLI 部署（推荐）

#### 步骤 1: 安装 TCB CLI
```powershell
npm install -g @cloudbase/cli
```

#### 步骤 2: 登录 TCB
```powershell
tcb login
```

#### 步骤 3: 初始化云托管
```powershell
# 创建云托管服务
tcb run init
```

按提示选择：
- 环境: cloud1-7galmfiu70af91a6
- 服务名称: leverage-ai
- 容器端口: 3000
- 版本流量配置: 100%

#### 步骤 4: 部署到云托管
```powershell
# 构建并部署
tcb run deploy
```

TCB CLI 会自动：
1. 构建 Docker 镜像
2. 推送到 TCB 容器镜像服务
3. 部署到云托管
4. 配置流量

### 方式 B: 通过控制台部署

#### 步骤 1: 构建本地镜像
```powershell
docker build -t leverage-ai:latest `
  --build-arg HUNYUAN_API_KEY=your_hunyuan_api_key `
  --build-arg TCB_ENV_ID=your_tcb_env_id `
  --build-arg CLOUDBASE_ENV_ID=your_tcb_env_id `
  --build-arg CLOUDBASE_SECRET_ID=your_secret_id `
  --build-arg CLOUDBASE_SECRET_KEY=your_secret_key `
  --build-arg TENCENTCLOUD_SECRET_ID=your_secret_id `
  --build-arg TENCENTCLOUD_SECRET_KEY=your_secret_key `
  .
```

#### 步骤 2: 推送到 TCB 镜像仓库
```powershell
# 登录镜像仓库
docker login ccr.ccs.tencentyun.com --username=<your-username>

# 标记镜像
docker tag leverage-ai:latest ccr.ccs.tencentyun.com/tcb-<env-id>/leverage-ai:latest

# 推送镜像
docker push ccr.ccs.tencentyun.com/tcb-<env-id>/leverage-ai:latest
```

#### 步骤 3: 在 TCB 控制台创建云托管服务

1. 访问 https://console.cloud.tencent.com/tcb/service
2. 选择环境: cloud1-7galmfiu70af91a6
3. 点击"新建服务"
4. 配置服务：
   - 服务名称: leverage-ai
   - 镜像来源: 容器镜像服务
   - 选择刚推送的镜像
   - 容器端口: 3000
   - 实例配置: 0.5核 1GB（可按需调整）
   - 副本数: 1（可按需扩展）
   - 流量配置: 100%

## ⚙️ 环境变量配置

在 TCB 控制台配置以下环境变量：

### 必需变量
```bash
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_USE_TCB_AUTH=true
PORT=3000

# TCB 配置
NEXT_PUBLIC_TCB_ENV_ID=your_tcb_env_id
TCB_ENV_ID=your_tcb_env_id
TCB_SECRET_ID=your_tcb_secret_id
TCB_SECRET_KEY=your_tcb_secret_key

# 腾讯云凭证
TENCENTCLOUD_SECRET_ID=your_tencentcloud_secret_id
TENCENTCLOUD_SECRET_KEY=your_tencentcloud_secret_key
TENCENTCLOUD_REGION=ap-shanghai

# JWT 密钥
JWT_SECRET=your_jwt_secret_here

# AI 服务
HUNYUAN_API_KEY=your_hunyuan_api_key
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1
HUNYUAN_MODEL=hunyuan-lite
AI_DEFAULT_AGENT=hunyuan

# COS 存储
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_REGION=ap-shanghai
```

## 📋 云托管配置文件

### cloudbaserc-run.json
```json
{
  "version": "2.0",
  "envId": "cloud1-7galmfiu70af91a6",
  "services": [
    {
      "name": "leverage-ai",
      "description": "Leverage AI 智能匹配平台",
      "dockerfilePath": "./Dockerfile",
      "buildDir": ".",
      "containerPort": 3000,
      "cpu": 0.5,
      "mem": 1,
      "minNum": 1,
      "maxNum": 5,
      "policyType": "cpu",
      "policyThreshold": 80,
      "envVariables": {
        "NODE_ENV": "production",
        "PORT": "3000"
      },
      "customLogs": {
        "enabled": true,
        "logPath": "/app/.next/standalone/logs"
      },
      "healthCheck": {
        "enabled": true,
        "type": "http",
        "path": "/",
        "port": 3000,
        "interval": 30,
        "timeout": 5,
        "successThreshold": 1,
        "failureThreshold": 3
      }
    }
  ]
}
```

## 🔧 服务配置详解

### 资源配置
- **CPU**: 0.5核（可选: 0.25, 0.5, 1, 2, 4, 8, 16）
- **内存**: 1GB（可选: 0.5, 1, 2, 4, 8, 16, 32）
- **最小实例数**: 1
- **最大实例数**: 5

### 弹性伸缩
- **策略类型**: CPU 使用率
- **阈值**: 80%
- **自动扩缩容**: 是

### 健康检查
- **类型**: HTTP
- **路径**: `/`
- **端口**: 3000
- **检测间隔**: 30秒
- **超时**: 5秒
- **失败次数**: 3次

## 🌐 域名配置

### 默认域名
部署成功后，TCB 会自动分配一个域名：
```
https://leverage-ai-<random>.ap-shanghai.app.tcloudbase.com
```

### 自定义域名
1. 进入 TCB 控制台 > 云托管 > 服务详情
2. 点击"域名管理"
3. 添加自定义域名
4. 配置 DNS CNAME 记录
5. 申请 SSL 证书（免费）

## 📊 监控和日志

### 查看日志
```powershell
# 通过 CLI 查看日志
tcb run logs leverage-ai

# 实时日志
tcb run logs leverage-ai --tail 100 --follow
```

### 控制台监控
访问：https://console.cloud.tencent.com/tcb/service/detail

可查看：
- CPU 使用率
- 内存使用率
- 请求 QPS
- 响应时间
- 错误率
- 实例状态

### 配置告警
1. 进入云监控
2. 创建告警策略
3. 选择指标（CPU、内存、错误率等）
4. 设置阈值和通知方式

## 🔄 更新部署

### 方式 1: CLI 快速更新
```powershell
# 更新代码后
tcb run deploy --auto-confirm
```

### 方式 2: 灰度发布
```powershell
# 部署新版本，10% 流量
tcb run deploy --traffic 10

# 验证无误后，切换 100% 流量
tcb run traffic leverage-ai --version v2 --traffic 100
```

### 方式 3: 回滚
```powershell
# 回滚到上一个版本
tcb run rollback leverage-ai

# 回滚到指定版本
tcb run rollback leverage-ai --version v1
```

## 🔐 安全配置

### 1. 网络访问控制
- 配置访问白名单（可选）
- 启用 HTTPS（自动）
- 配置 CORS 策略

### 2. 密钥管理
- 使用 TCB 密钥管理服务
- 定期轮换密钥
- 不要在代码中硬编码密钥

### 3. 访问鉴权
- 配置自定义鉴权函数
- 集成 TCB 身份验证

## 💰 费用说明

### 计费项
- **CPU 使用量**: ¥0.055/核*小时
- **内存使用量**: ¥0.032/GB*小时
- **流量费用**: ¥0.8/GB（CDN 加速）
- **构建次数**: 免费额度内免费

### 成本优化
- 合理设置实例规格
- 配置自动缩容
- 启用 CDN 加速
- 使用预留实例（折扣）

## 🐛 故障排查

### 常见问题

#### 1. 部署失败
```powershell
# 查看构建日志
tcb run logs leverage-ai --build

# 检查 Dockerfile 语法
docker build -t test .
```

#### 2. 服务无法访问
- 检查容器端口配置（3000）
- 查看实例状态
- 检查健康检查配置
- 查看错误日志

#### 3. 环境变量未生效
- 在控制台确认已配置
- 重启服务使配置生效
- 检查变量名拼写

#### 4. 内存溢出
- 增加内存配置
- 优化代码内存使用
- 查看内存泄漏

## ✅ 部署检查清单

部署前：
- [ ] Docker Desktop 已启动
- [ ] TCB CLI 已安装并登录
- [ ] Dockerfile 已优化
- [ ] 环境变量已准备
- [ ] .dockerignore 已配置

部署中：
- [ ] 构建成功
- [ ] 镜像推送成功
- [ ] 服务创建成功
- [ ] 实例启动成功

部署后：
- [ ] 健康检查通过
- [ ] 域名可访问
- [ ] 功能测试通过
- [ ] 日志正常
- [ ] 监控配置完成

## 📞 支持与帮助

- **TCB 文档**: https://cloud.tencent.com/document/product/876
- **云托管文档**: https://cloud.tencent.com/document/product/876/41943
- **技术支持**: https://console.cloud.tencent.com/workorder

## 🎉 完成

按照本指南完成部署后，您的应用将：
- ✅ 运行在 TCB 云托管上
- ✅ 自动弹性伸缩
- ✅ HTTPS 加密访问
- ✅ 全球 CDN 加速
- ✅ 完整监控告警
- ✅ 灰度发布支持

---

**下一步**: 执行 `tcb run deploy` 开始部署！
