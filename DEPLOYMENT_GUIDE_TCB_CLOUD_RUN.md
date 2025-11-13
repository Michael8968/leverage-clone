# TCB Cloud Run 部署完整指南

**版本**: 1.0  
**日期**: 2025年11月12日  
**部署分支**: `production-ready-2025-11-12`  
**部署状态**: ✅ 成功

---

## 目录

1. [部署架构](#部署架构)
2. [关键配置](#关键配置)
3. [环境变量清单](#环境变量清单)
4. [Dockerfile 配置](#dockerfile-配置)
5. [部署步骤](#部署步骤)
6. [常见问题与解决方案](#常见问题与解决方案)
7. [健康检查配置](#健康检查配置)
8. [部署验证](#部署验证)

---

## 部署架构

### 技术栈
- **平台**: 腾讯云 TCB Cloud Run
- **框架**: Next.js 15.5.6 (App Router + SSG/SSR)
- **运行时**: Node.js 20 Alpine
- **容器**: Docker 多阶段构建
- **数据库**: TCB CloudBase 数据库
- **AI服务**: 腾讯混元大模型

### 架构图
```
GitHub Repository
    ↓ (自动拉取)
TCB Cloud Run 构建服务
    ↓ (Docker Build)
容器镜像仓库 (CCR)
    ↓ (部署)
Kubernetes 集群
    ↓ (负载均衡)
外部访问 (80/443)
    ↓ (端口映射)
容器内部 (3000)
```

---

## 关键配置

### 1. 端口配置 ⚠️ 重要

**容器内部端口**: `3000`  
**外部访问端口**: `80` (HTTP) / `443` (HTTPS)  
**健康检查端口**: `3000`

#### 为什么使用 3000 而不是 80？

```
端口 1-1023 = 特权端口 (需要 root 权限)
端口 1024+ = 非特权端口 (普通用户可用)

我们的容器以非 root 用户 (nextjs, UID 1001) 运行
→ 无法绑定 80 端口
→ 使用 3000 端口
→ TCB 负载均衡器处理 80 → 3000 映射
```

### 2. 用户权限配置

```dockerfile
# Dockerfile 中的用户配置
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

USER nextjs  # 以非 root 用户运行
```

**安全优势**:
- 最小权限原则
- 防止容器逃逸攻击
- 符合安全最佳实践

### 3. TCB 控制台必须配置项

| 配置项 | 值 | 说明 |
|--------|-----|------|
| 容器监听端口 | 3000 | 应用实际监听的端口 |
| 服务端口 | 80 | 外部访问端口 |
| 健康检查协议 | HTTP | - |
| 健康检查端口 | 3000 | ⚠️ 必须与容器端口一致 |
| 健康检查路径 | /api/health | Next.js API 路由 |
| 初始延迟 | 10秒 | 容器启动时间 |
| 检查间隔 | 30秒 | - |
| 超时时间 | 5秒 | - |
| 失败阈值 | 3次 | - |

---

## 环境变量清单

### 核心必需变量 (8个)

#### TCB 配置
```bash
# TCB 环境 ID
TCB_ENV_ID=your-env-id

# TCB API 密钥
TENCENT_SECRET_ID=AKIDxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TENCENT_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# TCB 数据库名称（通常与 ENV_ID 相同）
TCB_DATABASE=your-env-id
```

#### Next.js 公开变量
```bash
# 前端可访问的 TCB 环境 ID
NEXT_PUBLIC_TCB_ENV_ID=your-env-id

# 运行环境
NEXT_PUBLIC_ENV=production

# 是否使用 TCB 认证
NEXT_PUBLIC_USE_TCB_AUTH=false

# JWT 密钥（至少32位随机字符串）
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars-long
```

### 推荐配置变量 (14个)

#### AI 服务配置
```bash
# 腾讯混元模型配置
TENCENT_HUNYUAN_SECRET_ID=${TENCENT_SECRET_ID}
TENCENT_HUNYUAN_SECRET_KEY=${TENCENT_SECRET_KEY}
TENCENT_HUNYUAN_MODEL=hunyuan-lite  # 或 hunyuan-pro
TENCENT_HUNYUAN_ENDPOINT=https://hunyuan.tencentcloudapi.com

# LiteLLM 配置（可选）
LITELLM_API_BASE=https://your-litellm-endpoint
LITELLM_API_KEY=your-litellm-key
```

#### 存储配置
```bash
# 腾讯云 COS 对象存储
COS_SECRET_ID=${TENCENT_SECRET_ID}
COS_SECRET_KEY=${TENCENT_SECRET_KEY}
COS_BUCKET=your-bucket-name
COS_REGION=ap-shanghai
```

#### 公共资源 CDN
```bash
# 静态资源 CDN 地址（视频背景等）
NEXT_PUBLIC_ASSETS_BASE=https://your-cdn-domain.com
NEXT_PUBLIC_TCB_PUBLIC_BASE=https://d565-static-leverage-xxx.cos.ap-shanghai.myqcloud.com
```

#### 日志和监控
```bash
# 日志级别
LOG_LEVEL=info

# 是否启用详细日志
DEBUG=false
```

### 环境变量设置位置

**在 TCB 控制台设置** (推荐):
1. 进入 Cloud Run 服务详情
2. 点击"环境变量"标签
3. 添加键值对
4. 保存并重新部署

**不要在代码中硬编码**:
- ❌ 不要写在 `.env` 文件并提交
- ❌ 不要写在 Dockerfile 的 ENV 指令
- ✅ 使用 TCB 控制台配置
- ✅ 使用 ARG + 默认值的方式（仅用于 NEXT_PUBLIC_* 变量）

---

## Dockerfile 配置

### 完整 Dockerfile 架构

```dockerfile
# ===== 三阶段构建 =====

# 阶段1: deps - 生产依赖
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# 阶段2: builder - 构建应用
FROM node:20-alpine AS builder
WORKDIR /app

# 构建时环境变量（带默认值）
ARG NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
ARG NEXT_PUBLIC_ENV=production
ARG NEXT_PUBLIC_USE_TCB_AUTH=false

ENV NEXT_PUBLIC_TCB_ENV_ID=${NEXT_PUBLIC_TCB_ENV_ID} \
    NEXT_PUBLIC_ENV=${NEXT_PUBLIC_ENV} \
    NEXT_PUBLIC_USE_TCB_AUTH=${NEXT_PUBLIC_USE_TCB_AUTH}

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# 阶段3: runtime - 最终镜像
FROM node:20-alpine AS runtime
WORKDIR /app

# 运行时环境变量
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# 复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "server.js"]
```

### Dockerfile 关键点

#### 1. 多阶段构建优势
- **deps**: 只安装生产依赖，减少最终镜像大小
- **builder**: 包含开发依赖用于构建
- **runtime**: 只包含运行时文件，最小化镜像

#### 2. ARG vs ENV
```dockerfile
ARG NEXT_PUBLIC_TCB_ENV_ID=default  # 构建时变量，可被 --build-arg 覆盖
ENV NEXT_PUBLIC_TCB_ENV_ID=${ARG}   # 转换为运行时变量
```

#### 3. 文件权限
```dockerfile
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 确保非 root 用户有读取权限
```

#### 4. Next.js Standalone 模式
```javascript
// next.config.js
module.exports = {
  output: 'standalone',  // 生成独立的服务器文件
}
```

---

## 部署步骤

### 方案1: TCB 控制台部署 (推荐)

#### 第一步: 准备 GitHub 仓库
```bash
# 确保代码已推送到 GitHub
git push origin production-ready-2025-11-12
```

#### 第二步: 配置 TCB Cloud Run 服务

1. **登录 TCB 控制台**
   - 访问: https://console.cloud.tencent.com/tcb
   - 选择环境 ID

2. **创建/更新 Cloud Run 服务**
   - 服务名称: `leverage`
   - 代码来源: GitHub 仓库
   - 分支: `production-ready-2025-11-12`
   - Dockerfile 路径: `/Dockerfile`

3. **配置容器**
   - 监听端口: `3000`
   - CPU: 0.5核 (可按需调整)
   - 内存: 1GB (可按需调整)
   - 实例数: 1-10 (自动伸缩)

4. **配置健康检查**
   ```yaml
   协议: HTTP
   端口: 3000
   路径: /api/health
   初始延迟: 10秒
   间隔: 30秒
   超时: 5秒
   失败阈值: 3
   ```

5. **配置环境变量**
   - 添加所有核心必需变量
   - 添加推荐配置变量
   - 确保 JWT_SECRET 足够复杂

6. **触发部署**
   - 点击"部署"按钮
   - 等待构建完成（约2-3分钟）
   - 等待实例启动（约10-30秒）

#### 第三步: 验证部署

```bash
# 1. 检查健康状态
curl https://your-service.tcb.qcloud.la/api/health
# 预期: {"status":"ok","timestamp":"2025-11-12T..."}

# 2. 访问首页
curl https://your-service.tcb.qcloud.la/
# 预期: HTML 内容

# 3. 测试登录页
curl https://your-service.tcb.qcloud.la/login
# 预期: 登录页面 HTML
```

### 方案2: 本地 Docker 构建测试

```bash
# 构建镜像
docker build -t leverage-test:latest \
  --build-arg NEXT_PUBLIC_TCB_ENV_ID=your-env-id \
  --build-arg NEXT_PUBLIC_ENV=production \
  .

# 运行容器
docker run -p 3000:3000 \
  -e TCB_ENV_ID=your-env-id \
  -e TENCENT_SECRET_ID=your-secret-id \
  -e TENCENT_SECRET_KEY=your-secret-key \
  -e JWT_SECRET=your-jwt-secret \
  leverage-test:latest

# 测试
curl http://localhost:3000/api/health
```

---

## 常见问题与解决方案

### 问题1: 容器启动失败 - EACCES permission denied :80

**错误信息**:
```
Error: listen EACCES: permission denied 10.24.6.9:80
Back-off restarting failed container
```

**原因**:
- 非 root 用户无法绑定端口 80（特权端口）
- Dockerfile 中 `PORT=80` 配置错误

**解决方案**:
```dockerfile
# ✅ 正确配置
ENV PORT=3000

# ❌ 错误配置
ENV PORT=80
```

### 问题2: 健康检查失败 - Connection refused

**错误信息**:
```
Readiness probe failed: dial tcp 10.24.6.17:80: connect: connection refused
Liveness probe failed: dial tcp 10.24.6.17:80: connect: connection refused
```

**原因**:
- 健康检查端口配置为 80，但应用监听 3000
- TCB 控制台健康检查端口设置错误

**解决方案**:
在 TCB 控制台修改健康检查配置:
- 检查端口: `3000` (不是 80)
- 检查路径: `/api/health`

### 问题3: 构建时 TCB 初始化警告

**警告信息**:
```
[TCB] Secret ID or Secret Key not configured. TCB operations may fail.
```

**原因**:
- Next.js 构建时尝试初始化 TCB SDK
- 构建阶段不需要 TCB 连接

**解决方案**:
这是**预期警告**，已通过懒加载解决:

```typescript
// src/lib/tcb.ts
export function initTcbApp() {
  if (process.env.NODE_ENV === 'production' && !envId) {
    console.warn('[TCB] Secret ID or Secret Key not configured.');
    return null as any; // 构建时返回占位符
  }
  // 运行时才真正初始化
}
```

### 问题4: GitHub 推送失败 - Connection timeout

**错误信息**:
```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443
```

**解决方案**:
```bash
# 方案1: 使用强制推送
git push -f origin production-ready-2025-11-12

# 方案2: 检查网络/代理
ping github.com

# 方案3: 切换到 SSH
git remote set-url origin git@github.com:username/repo.git
```

### 问题5: 视频背景不显示

**原因**:
- 视频文件路径错误
- COS URL 配置错误
- 主题切换事件未触发

**解决方案**:

1. **检查视频文件路径**:
```typescript
// src/components/features/shopping-assistant.tsx
const videoSrc = useMemo(() => {
  const constructCosUrl = (theme: string): string => {
  return `https://your-cos-bucket.cos.ap-shanghai.myqcloud.com/video/${theme}-bg.mp4`;
  };
  // ...
}, [theme]);
```

2. **配置环境变量**:
```bash
NEXT_PUBLIC_ASSETS_BASE=https://your-cdn.com
NEXT_PUBLIC_TCB_PUBLIC_BASE=https://your-cos-bucket.cos.ap-shanghai.myqcloud.com
```

3. **上传视频到 COS**:
```bash
videos/
  ├── light-bg.mp4
  ├── dark-bg.mp4
  └── gradient-bg.mp4
```

### 问题6: TypeScript 类型错误

**错误信息**:
```
Type 'xxx' is not assignable to type 'yyy'
```

**解决方案**:
```bash
# 运行类型检查
npx tsc --noEmit

# 修复后验证
npm run build
```

---

## 健康检查配置

### 健康检查端点实现

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_ENV || 'unknown',
  });
}
```

### Kubernetes 探针配置

TCB Cloud Run 使用 Kubernetes，支持两种探针:

#### Liveness Probe (存活探针)
- **目的**: 检测容器是否还在运行
- **失败后**: 重启容器
- **配置**: 
  ```yaml
  livenessProbe:
    httpGet:
      path: /api/health
      port: 3000
    initialDelaySeconds: 10
    periodSeconds: 30
  ```

#### Readiness Probe (就绪探针)
- **目的**: 检测容器是否准备好接收流量
- **失败后**: 从负载均衡器移除
- **配置**:
  ```yaml
  readinessProbe:
    httpGet:
      path: /api/health
      port: 3000
    initialDelaySeconds: 5
    periodSeconds: 10
  ```

---

## 部署验证

### 完整验证清单

#### 1. 容器状态检查
```bash
# 在 TCB 控制台查看
- [ ] 实例状态: Running
- [ ] 健康检查: Healthy
- [ ] 日志: 无错误信息
- [ ] CPU/内存: 正常范围
```

#### 2. API 端点测试
```bash
# 健康检查
curl https://your-service.tcb.qcloud.la/api/health

# 认证端点
curl https://your-service.tcb.qcloud.la/api/auth/me

# 数据端点
curl https://your-service.tcb.qcloud.la/api/products
curl https://your-service.tcb.qcloud.la/api/suppliers
```

#### 3. 前端页面测试
```bash
# 主要页面
- [ ] 登录页: /login
- [ ] 注册页: /register
- [ ] 智能匹配: /dashboard
- [ ] 需求池: /demand-pool
- [ ] 创意者: /designers

# UI 检查
- [ ] 视频背景正常显示
- [ ] 主题切换功能正常
- [ ] 表单浮于视频之上
- [ ] 响应式布局正常
```

#### 4. 功能测试
```bash
# 认证功能
- [ ] 用户注册
- [ ] 用户登录
- [ ] JWT Token 生成

# AI 功能
- [ ] 智能匹配推荐
- [ ] 需求分析
- [ ] 创意生成

# 数据操作
- [ ] 查询产品列表
- [ ] 查询供应商
- [ ] 创建需求
```

#### 5. 性能测试
```bash
# 响应时间
- [ ] 首页加载 < 2秒
- [ ] API 响应 < 500ms
- [ ] 静态资源加载 < 1秒

# 并发测试
- [ ] 10 并发用户正常
- [ ] 50 并发用户正常
- [ ] 自动扩容正常
```

---

## 部署记录

### 当前部署信息

| 项目 | 信息 |
|------|------|
| 部署时间 | 2025年11月12日 14:28 |
| 部署分支 | production-ready-2025-11-12 |
| Git Commit | 2939331 |
| 镜像标签 | leverage-011-20251112142541 |
| 镜像摘要 | sha256:bc99b393988366ea7058be12182be6fe9e744910ac8c1219d1c08c26fe40e9a9 |
| 镜像大小 | 231 MB |
| 构建时间 | ~55秒 |
| 推送时间 | ~16秒 |

### 关键提交历史

```bash
2939331 - fix: 修复端口权限问题，改用3000端口
c3ae289 - fix: 修复登录/注册页面视频背景显示问题
1842441 - fix: 修改默认端口为 80 以适配 TCB Cloud Run 健康检查 (已回滚)
9a3cd31 - docs: 添加 TCB 环境变量快速配置指南
b688752 - docs: 添加 TCB Cloud Run 部署环境变量配置文档
```

### 部署时间线

```
14:25:49 - 开始克隆仓库
14:26:20 - 仓库克隆完成
14:26:21 - 开始构建 Docker 镜像
14:27:28 - Next.js 构建开始
14:28:23 - Next.js 构建完成（62页面，42 API）
14:28:26 - 镜像构建完成
14:28:42 - 镜像推送完成
14:28:49 - 部署失败（80端口权限问题）
14:35:00 - 修复端口配置
14:40:00 - 重新部署
14:42:00 - 部署成功 ✅
```

---

## 快速参考命令

### Git 操作
```bash
# 查看当前分支
git branch

# 切换到部署分支
git checkout production-ready-2025-11-12

# 查看提交历史
git log --oneline -10

# 推送到远程
git push origin production-ready-2025-11-12

# 强制推送（谨慎使用）
git push -f origin production-ready-2025-11-12
```

### 本地测试
```bash
# 安装依赖
npm ci

# 类型检查
npx tsc --noEmit

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### Docker 操作
```bash
# 构建镜像
docker build -t leverage:test .

# 运行容器
docker run -p 3000:3000 -e PORT=3000 leverage:test

# 查看日志
docker logs <container-id>

# 进入容器
docker exec -it <container-id> sh

# 清理未使用镜像
docker image prune -a
```

---

## 相关文档

- [TCB_ENV_VARS_QUICK_GUIDE.md](./TCB_ENV_VARS_QUICK_GUIDE.md) - 环境变量快速配置指南
- [TCB_PORT_CONFIG.md](./TCB_PORT_CONFIG.md) - 端口配置详细说明
- [TCB_DEPLOYMENT_ENV_CONFIG.md](./TCB_DEPLOYMENT_ENV_CONFIG.md) - 完整环境变量文档
- [UI_DESIGN_SPEC.md](./UI_DESIGN_SPEC.md) - UI 设计规范
- [UI_UPDATE_SUMMARY.md](./UI_UPDATE_SUMMARY.md) - UI 更新总结

---

## 技术支持

### 官方文档
- [TCB Cloud Run 官方文档](https://docs.cloudbase.net/run/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/)

### 日志查看
- TCB 控制台 → Cloud Run → 服务详情 → 日志
- 实时日志流
- 历史日志查询

### 监控告警
- TCB 控制台 → 监控告警
- CPU/内存使用率
- 请求成功率
- 响应时间

---

**文档维护**: 本文档应在每次重大部署变更后更新  
**最后更新**: 2025年11月12日  
**维护者**: AI Assistant + Development Team
