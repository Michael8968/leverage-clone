# GitHub Actions 部署工作流配置检查清单

## 📋 配置前检查

在 GitHub 上配置自动化部署前，请确保已完成以下步骤：

---

## ✅ 步骤 1: 获取腾讯云凭证

### 1.1 Container Registry (CCR) 凭证
- [ ] 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
- [ ] 进入 **容器服务** → **容器镜像服务 (CCR)**
- [ ] 获取 **镜像仓库地址** (例如: `ccr.ccs.tencentyun.com`)
- [ ] 获取 **用户名** (通常是子账户或访问密钥 ID)
- [ ] 获取 **密码** (访问密钥或临时密码)
- [ ] 记录下来:
  ```
  REGISTRY: ccr.ccs.tencentyun.com
  NAMESPACE: [你的命名空间]
  USERNAME: [CCR 用户名]
  PASSWORD: [CCR 密码]
  ```

### 1.2 CloudBase 凭证
- [ ] 登录 [腾讯云控制台](https://console.cloud.tencent.com/)
- [ ] 进入 **CloudBase (TCB) 控制台**
- [ ] 选择你的 **环境**
- [ ] 获取 **环境 ID** (Environment ID)
- [ ] 获取 **密钥** (Secret Key)
- [ ] 记录下来:
  ```
  TCB_ENV_ID: [环境 ID]
  TCB_SECRET_KEY: [密钥]
  ```

### 1.3 TCB API 密钥
- [ ] 在 CloudBase 控制台找到 **API 密钥管理**
- [ ] 创建新的 API 密钥（如果还没有）
- [ ] 获取 **密钥 ID** (API Key ID)
- [ ] 获取 **密钥** (API Key)
- [ ] 记录下来:
  ```
  TCB_API_KEY_ID: [密钥 ID]
  TCB_API_KEY: [密钥]
  ```

---

## ✅ 步骤 2: 准备应用密钥

### 2.1 JWT 密钥
- [ ] 生成或获取 JWT 密钥
- [ ] 可以从项目 `.env` 文件中复制
- [ ] 或生成新的:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] 记录下来:
  ```
  JWT_SECRET: [32 字符密钥]
  ```

### 2.2 混元 API 密钥（可选）
- [ ] 如果使用混元文本处理服务
- [ ] 登录 [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)
- [ ] 获取 **API 密钥**
- [ ] 记录下来:
  ```
  HUNYUAN_API_KEY: [可选]
  ```

---

## ✅ 步骤 3: 配置 GitHub Secrets

### 3.1 访问 GitHub 仓库设置
- [ ] 进入你的 GitHub 仓库
- [ ] 点击 **Settings** (设置)
- [ ] 左侧菜单 → **Secrets and variables** → **Actions**

### 3.2 添加 Secrets

对于每个下面列出的 secret，点击 **New repository secret** 并添加：

#### Container Registry
| Secret 名称 | 值 | 说明 |
|-----------|-----|------|
| `TCB_REGISTRY_USERNAME` | 从 1.1 获取 | CCR 用户名 |
| `TCB_REGISTRY_PASSWORD` | 从 1.1 获取 | CCR 密码 |

**添加步骤**:
- [ ] 点击 **New repository secret**
- [ ] Name: `TCB_REGISTRY_USERNAME`
- [ ] Secret: [你的 CCR 用户名]
- [ ] 点击 **Add secret**
- [ ] 重复添加 `TCB_REGISTRY_PASSWORD`

#### CloudBase
| Secret 名称 | 值 | 说明 |
|-----------|-----|------|
| `TCB_ENV_ID` | 从 1.2 获取 | CloudBase 环境 ID |
| `TCB_SECRET_KEY` | 从 1.2 获取 | CloudBase 密钥 |
| `TCB_API_KEY_ID` | 从 1.3 获取 | API 密钥 ID |
| `TCB_API_KEY` | 从 1.3 获取 | API 密钥 |

**添加步骤** (为每个重复):
- [ ] 点击 **New repository secret**
- [ ] Name: `TCB_ENV_ID` (或其他名称)
- [ ] Secret: [对应的值]
- [ ] 点击 **Add secret**

#### 应用配置
| Secret 名称 | 值 | 说明 |
|-----------|-----|------|
| `JWT_SECRET` | 从 2.1 获取 | JWT 签名密钥 |
| `HUNYUAN_API_KEY` | 从 2.2 获取 | 混元 API 密钥（可选） |

**添加步骤** (为每个重复):
- [ ] 点击 **New repository secret**
- [ ] Name: `JWT_SECRET` (或 `HUNYUAN_API_KEY`)
- [ ] Secret: [对应的值]
- [ ] 点击 **Add secret**

### 3.3 验证所有 Secrets
- [ ] 在 Secrets 列表中看到所有 8 个项目:
  ```
  ✓ TCB_REGISTRY_USERNAME
  ✓ TCB_REGISTRY_PASSWORD
  ✓ TCB_ENV_ID
  ✓ TCB_SECRET_KEY
  ✓ TCB_API_KEY_ID
  ✓ TCB_API_KEY
  ✓ JWT_SECRET
  ✓ HUNYUAN_API_KEY (可选)
  ```

---

## ✅ 步骤 4: 配置工作流触发条件

### 4.1 验证工作流文件
- [ ] 工作流文件已存在: `.github/workflows/tcb-deploy.yml`
- [ ] 文件包含正确的触发条件:
  ```yaml
  on:
    push:
      branches: [main, production]
    workflow_dispatch:
  ```

### 4.2 配置分支保护（推荐）
- [ ] 进入 GitHub 仓库 → **Settings** → **Branches**
- [ ] 点击 **Add branch protection rule**
- [ ] **Branch name pattern**: `main` 或 `production`
- [ ] 启用选项:
  - [ ] Require a pull request before merging
  - [ ] Require status checks to pass before merging
  - [ ] Select `code-quality` as required check

---

## ✅ 步骤 5: 配置通知（可选）

### 5.1 Slack 通知（可选）
- [ ] 如果想要 Slack 通知，获取 Webhook URL:
  - 进入 Slack 工作区 → Apps → Incoming Webhooks
  - 创建新的 Webhook
  - 复制 URL
- [ ] 添加为 GitHub Secret:
  - Name: `SLACK_WEBHOOK_URL`
  - Secret: [Slack Webhook URL]

### 5.2 验证部署通知
- [ ] 部署完成后应收到通知
- [ ] 检查 GitHub Releases 是否有标签版本

---

## ✅ 步骤 6: 验证和测试

### 6.1 本地验证
- [ ] 运行本地测试:
  ```bash
  npm test                    # 运行所有测试
  npm run typecheck          # TypeScript 检查
  npm run lint               # 代码检查
  npm run build              # 构建验证
  ```

### 6.2 测试部署工作流
- [ ] 进入 GitHub 仓库 → **Actions**
- [ ] 选择 **TCB Deployment** 工作流
- [ ] 点击 **Run workflow**
- [ ] 选择环境: **staging** 或 **production**
- [ ] 点击 **Run workflow** 按钮
- [ ] 监控工作流执行:
  - 阶段 1: 代码质量检查 (应在 2 分钟内通过)
  - 阶段 2: Docker 构建和推送 (3-5 分钟)
  - 阶段 3: TCB 部署 (2 分钟)
  - 阶段 4: 健康检查 (最多 100 秒)
  - 阶段 5: 通知 (1 分钟)

### 6.3 验证部署成功
- [ ] 检查 GitHub Actions 日志中没有红色错误
- [ ] 查看最后一个 job (`notify`) 显示 ✓ 通过
- [ ] 检查 Slack 通知（如果配置）
- [ ] 访问 TCB 控制台验证应用已部署

---

## 🔍 常见问题排查

### Q: Docker 构建失败
**检查项**:
- [ ] Dockerfile 在项目根目录
- [ ] 所有依赖在 package.json 中
- [ ] Node.js 版本与 Dockerfile 中一致 (18.17.0)
- [ ] 没有超过大小限制的文件在 `.dockerignore` 中

**解决**:
```bash
# 本地构建测试
docker build -t test:latest .
```

### Q: 镜像推送失败 (认证错误)
**检查项**:
- [ ] `TCB_REGISTRY_USERNAME` 正确
- [ ] `TCB_REGISTRY_PASSWORD` 正确
- [ ] 密码不包含特殊字符问题（如需要转义）
- [ ] 镜像仓库是否存在

**解决**:
```bash
# 本地测试登录
docker login ccr.ccs.tencentyun.com
```

### Q: TCB 部署失败
**检查项**:
- [ ] `TCB_ENV_ID` 正确
- [ ] `TCB_SECRET_KEY` 有效
- [ ] CloudBase 环境已激活
- [ ] 配额限制 (检查 TCB 控制台)

**解决**:
- 在 TCB 控制台查看详细错误
- 检查云函数日志

### Q: 健康检查失败
**检查项**:
- [ ] API 服务器已启动
- [ ] `/api/health` 端点可用
- [ ] 网络连接正常
- [ ] 防火墙规则允许访问

**解决**:
```bash
# 手动测试端点
curl http://your-tcb-domain/api/health
```

### Q: GitHub 中看不到工作流
**检查项**:
- [ ] `.github/workflows/tcb-deploy.yml` 文件已推送
- [ ] 文件在正确的分支中
- [ ] 刷新 GitHub 页面

**解决**:
```bash
# 验证文件存在
ls -la .github/workflows/tcb-deploy.yml
```

---

## 📋 最终检查清单

部署前，确保已完成以下所有项目：

- [ ] **凭证已准备** (8 个 secrets)
- [ ] **GitHub Secrets 已配置** (验证清单 3.3)
- [ ] **工作流文件已存在** (.github/workflows/tcb-deploy.yml)
- [ ] **本地测试通过**
  - [ ] `npm test` ✅
  - [ ] `npm run typecheck` ✅
  - [ ] `npm run lint` ✅
  - [ ] `npm run build` ✅
- [ ] **代码已推送到 main 或 production**
- [ ] **工作流已手动测试** (可选，但推荐)
- [ ] **通知配置已完成** (Slack, GitHub)
- [ ] **团队已知晓** (沟通部署计划)

---

## 🚀 开始部署

完成上述所有步骤后：

### 自动部署
```bash
# 推送代码到 main 或 production
git push origin main

# 工作流自动运行
```

### 或手动触发
1. GitHub 仓库 → Actions → TCB Deployment
2. Run workflow → 选择环境
3. 确认运行

---

## 📊 部署信息参考

```yaml
# 工作流基本信息
工作流名称: TCB Deployment
触发事件: Push to main/production or manual
总耗时: ~8-12 分钟

# 阶段详情
阶段 1: 代码质量检查 (2 min)
  - TypeScript 编译检查
  - ESLint 代码检查
  - npm build 验证

阶段 2: Docker 构建和推送 (3-5 min)
  - 多阶段 Dockerfile 构建
  - GitHub Actions 缓存
  - 推送到 Tencent Cloud CCR

阶段 3: TCB 部署 (2 min)
  - CloudBase 登录
  - 云函数部署
  - 环境变量配置

阶段 4: 健康检查 (max 100s)
  - 10 次重试，10 秒间隔
  - 验证 /api/health 端点
  - 测试关键 API 端点

阶段 5: 通知 (1 min)
  - Slack 通知（如果配置）
  - GitHub Release 创建
```

---

## 📞 获取帮助

- 🐛 检查 GitHub Actions 日志
- 📖 查看 [TEST_AND_DEPLOYMENT_IMPLEMENTATION.md](./TEST_AND_DEPLOYMENT_IMPLEMENTATION.md)
- 🔗 查看 [TESTING_AND_DEPLOYMENT_QUICK_REFERENCE.md](./TESTING_AND_DEPLOYMENT_QUICK_REFERENCE.md)
- 💬 联系开发团队

---

**配置日期**: 2024年
**最后更新**: 2024年
**版本**: 1.0
**检查清单完成度**: ____% (完成后填写)
