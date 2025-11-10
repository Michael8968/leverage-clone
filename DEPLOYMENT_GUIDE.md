# Leverage AI 平台 - 混合模式部署指南

## 📋 项目概述

本项目已完成从纯Firebase架构到**混合模式架构**的迁移：
- **开发环境**：使用Firebase（认证、数据库）
- **生产环境**：使用腾讯云CloudBase (TCB)（认证、数据库、云函数）

**当前分支**：`tcb-migration-hybrid-mode`  
**GitHub仓库**：https://github.com/Angus1976/leverage-clone

---

## 🏗️ 软件架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Next.js 15)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  服务抽象层 (Service Abstraction Layer)              │   │
│  │  - src/lib/services/auth.ts  (认证服务)              │   │
│  │  - src/lib/services/db.ts    (数据库服务)            │   │
│  └──────────────────────────────────────────────────────┘   │
│         │                                    │                │
│         ▼                                    ▼                │
│  ┌──────────────┐                  ┌──────────────┐         │
│  │ Firebase SDK │                  │   TCB SDK    │         │
│  │  (开发环境)   │                  │  (生产环境)   │         │
│  └──────────────┘                  └──────────────┘         │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌──────────────────┐              ┌──────────────────────────┐
│  Firebase 服务    │              │   腾讯云 TCB 服务          │
│  - Auth          │              │   - 云数据库              │
│  - Firestore     │              │   - 云函数 (19个)         │
│  (仅开发使用)     │              │   - 云存储 (COS)          │
└──────────────────┘              │   - API网关               │
                                  │   (生产环境)              │
                                  └──────────────────────────┘
```

### 核心技术栈

**前端框架**
- Next.js 15.5.6 (App Router)
- React 18.3.1
- TypeScript 5
- Tailwind CSS + shadcn/ui

**认证系统**
- 开发：Firebase Auth
- 生产：TCB自定义认证 (JWT)
- 桥接：`/api/auth/firebase-sync` 端点

**数据库**
- 开发：Firebase Firestore
- 生产：TCB 云数据库 (NoSQL)
- 抽象层：统一的Repository模式

**云函数** (19个)
- 全部部署在TCB环境
- Node.js 18.15 运行时
- HTTP触发器 + API网关

**状态管理**
- Zustand 4.5.4

**测试框架**
- Jest 30.2.0
- Cypress 15.5.0
- Testing Library

---

## 🔧 环境配置

### 开发环境配置

#### 1. 环境变量 (`.env.local`)

```env
# Node环境
NODE_ENV=development

# Firebase配置 (开发环境)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (用于Token验证)
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# TCB配置 (开发环境可选，用于测试)
NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
TCB_SECRET_ID=your_secret_id
TCB_SECRET_KEY=your_secret_key

# 环境切换标识
NEXT_PUBLIC_USE_TCB_AUTH=false

# JWT密钥
JWT_SECRET=dev_jwt_secret_key

# AI服务
OPENAI_API_KEY=your_openai_key
HUNYUAN_API_KEY=your_hunyuan_key
```

#### 2. 依赖安装

```bash
npm install
```

#### 3. 启动开发服务器

```bash
npm run dev
# 或指定端口
npm run dev:3002
```

访问：http://localhost:3000

---

### 生产环境配置

#### 1. TCB环境变量

在腾讯云控制台配置以下环境变量：

```env
# 生产环境标识
NODE_ENV=production
NEXT_PUBLIC_USE_TCB_AUTH=true

# TCB配置
NEXT_PUBLIC_TCB_ENV_ID=your_tcb_env_id
TCB_SECRET_ID=your_tcb_secret_id
TCB_SECRET_KEY=your_tcb_secret_key
TENCENTCLOUD_SECRET_ID=your_tencentcloud_secret_id
TENCENTCLOUD_SECRET_KEY=your_tencentcloud_secret_key
TENCENTCLOUD_REGION=ap-shanghai

# JWT密钥（生产级）
JWT_SECRET=your_production_jwt_secret_min_32_chars

# AI服务密钥
OPENAI_API_KEY=your_production_openai_key
HUNYUAN_API_KEY=your_production_hunyuan_key
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1

# Gemini (用于3D生成)
GEMINI_API_KEY=your_gemini_key

# Tripo3D (3D模型生成)
TRIPO3D_API_KEY=your_tripo3d_key

# COS存储配置
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your-bucket-name
COS_REGION=ap-shanghai
```

#### 2. 数据库初始化

```bash
# 设置环境变量
$env:TCB_ENV_ID="cloud1-7galmfiu70af91a6"
$env:TENCENTCLOUD_SECRET_ID="your_secret_id"
$env:TENCENTCLOUD_SECRET_KEY="your_secret_key"

# 运行迁移脚本（创建集合并插入样例数据）
node scripts/migrate.js

# 验证数据库状态
node scripts/db-check.js
```

#### 3. 云函数部署

```bash
# 部署所有云函数
tcb functions deploy

# 验证部署
tcb functions list

# 测试API
npm run test:api
```

#### 4. 前端构建和部署

```bash
# 构建生产版本
npm run build

# 部署到TCB托管
tcb hosting deploy

# 上传静态资源（视频等）
npm run tcb:upload-videos
```

---

## 🗄️ 数据库架构

### 核心集合 (Collections)

#### 1. users (用户集合) ⭐️关键
```javascript
{
  _id: string,              // TCB自动生成
  uid: string,              // 用户唯一标识（Firebase UID）
  email: string,            // 邮箱
  name: string,             // 姓名
  avatar: string,           // 头像URL
  role: 'admin' | 'user' | 'creator' | 'supplier',
  rating: number,           // 评分
  status: 'active' | 'inactive',
  level: 'New' | 'Regular' | 'Pro',
  points_balance: number,   // 积分余额
  aiAssistantEnabled: boolean,  // AI助手开关（creator）
  alwaysAvailable: boolean,     // 永久可用（creator）
  bio: string,              // 个人简介
  skills: string[],         // 技能标签
  createdAt: Date,
  total_llm_calls: number   // LLM调用次数
}
```

#### 2. demands (需求集合) ⭐️关键
```javascript
{
  _id: string,
  id: string,               // 需求ID
  type: 'public' | 'private',
  title: string,
  description: string,
  budget: number,
  category: string,
  status: '开放中' | '进行中' | '已完成',
  requesterId: string,      // 发起人ID
  requesterName: string,
  createdAt: Date
}
```

#### 3. products (产品集合)
```javascript
{
  _id: string,
  id: string,
  name: string,
  description: string,
  price: number,
  category: string,
  purchaseUrl: string,
  imageUrl: string,
  createdAt: Date
}
```

#### 4. suppliers (供应商集合)
```javascript
{
  _id: string,
  id: string,
  name: string,
  region: string,
  email: string,
  creditCode: string,       // 统一社会信用代码
  establishedDate: Date
}
```

#### 5. prompts (提示模板集合)
```javascript
{
  _id: string,
  id: string,
  name: string,
  content: string,
  scope: string,            // 应用范围
  status: '生效中' | '已禁用',
  ownerId: string,
  modelId: string           // LLM模型ID
}
```

#### 6. llm_connections (LLM连接配置)
```javascript
{
  _id: string,
  provider: string,         // OpenAI, Tencent, Google, etc.
  modelName: string,
  apiKey: string,           // 加密存储
  priority: number,         // 优先级
  status: '活跃' | '禁用',
  scope: string,
  category: '文本' | '图像' | '3D',
  lastTestStatus: string,
  createdAt: Date
}
```

---

## ☁️ 云函数列表

### 1. 平台基础服务
- **getPlatformAssets** - 获取LLM平台资产列表
- **getPrompts** - 获取提示模板
- **testLlmConnection** - 测试LLM连接
- **updateModelsFromLiteLLM** - 从LiteLLM同步模型

### 2. AI核心功能
- **executePrompt** - 执行AI提示（统一入口）
- **recommendProducts** - AI产品推荐
- **getProductRecommendations** - 获取产品推荐
- **recommendCreatives** - 推荐创意者

### 3. 需求管理
- **createPrivateDemand** - 创建私有需求（智能分诊）
- **clarifyDemandDetails** - 需求澄清对话
- **intelligentRoutingFlow** - 智能路由分配

### 4. 用户管理
- **batchUpdateUsers** - 批量更新用户

### 5. 数据分析
- **evaluateSellerData** - 供应商数据评估

### 6. 3D/图像生成
- **generate3dModel** - 3D模型图像生成（Gemini）
- **generateTripo3dModel** - Tripo3D模型生成
- **getTripo3dModelStatus** - 查询3D生成状态
- **generateNanoBananaImage** - Nano Banana图像生成

### 7. 媒体处理
- **getUploadUrlForMediaAsset** - 生成上传URL
- **analyzeMediaAsset** - 媒体资源分析

---

## 🔐 认证流程

### 开发环境（Firebase Auth）

```
┌─────────┐   1. Login    ┌──────────────┐
│ 用户登录 │ ───────────> │ Firebase Auth │
└─────────┘               └───────┬──────┘
                                  │ 2. ID Token
                                  ▼
                          ┌───────────────┐
                          │ Firebase SDK  │
                          └───────┬───────┘
                                  │ 3. Send Token
                                  ▼
┌────────────────┐      ┌────────────────────┐
│ TCB Database   │ <──4─│ /api/auth/        │
│ (users table)  │      │ firebase-sync      │
└────────────────┘      └────────┬───────────┘
                                  │ 5. Return User
                                  ▼
                          ┌───────────────┐
                          │ Zustand Store │
                          │ (auth state)  │
                          └───────────────┘
```

### 生产环境（TCB Auth）

```
┌─────────┐   1. Login    ┌─────────────────┐
│ 用户登录 │ ───────────> │ /api/auth/login │
└─────────┘               └────────┬────────┘
                                   │ 2. Verify
                                   ▼
                          ┌────────────────┐
                          │ TCB Database   │
                          │ bcrypt verify  │
                          └────────┬───────┘
                                   │ 3. Generate JWT
                                   ▼
                          ┌────────────────┐
                          │ Return Token   │
                          └────────┬───────┘
                                   │ 4. Store
                                   ▼
                          ┌────────────────┐
                          │ Session Storage│
                          └────────────────┘
```

---

## 🧪 测试指南

### 开发环境测试步骤

#### 1. 克隆代码

```bash
git clone https://github.com/Angus1976/leverage-clone.git
cd leverage-clone
git checkout tcb-migration-hybrid-mode
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置Firebase

创建 `.env.local` 文件：

```env
NODE_ENV=development
NEXT_PUBLIC_USE_TCB_AUTH=false

# 替换为你的Firebase配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK JSON
FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# TCB配置（用于同步用户到TCB）
NEXT_PUBLIC_TCB_ENV_ID=cloud1-7galmfiu70af91a6
TCB_SECRET_ID=your_secret_id
TCB_SECRET_KEY=your_secret_key

JWT_SECRET=dev_jwt_secret
```

#### 4. 启动开发服务器

```bash
npm run dev
```

#### 5. 测试功能清单

**基础功能**
- [ ] 用户注册 (`/register`)
- [ ] 用户登录 (`/login`)
- [ ] 查看用户信息 (`/dashboard`)
- [ ] 退出登录

**需求管理**
- [ ] 创建需求 (`/demand-pool`)
- [ ] 查看需求列表
- [ ] AI需求澄清

**AI功能**
- [ ] 购物助手 (`/dashboard`)
- [ ] 产品推荐
- [ ] 创意者推荐 (`/designers`)
- [ ] 智能路由分配 (`/intelligent-routing`)

**管理功能（需要admin角色）**
- [ ] 用户管理 (`/admin-dashboard`)
- [ ] 提示模板管理 (`/prompt-management`)
- [ ] LLM连接配置 (`/ai-scenario-config`)
- [ ] 积分管理 (`/points-management`)

**3D生成功能**
- [ ] 3D模型生成
- [ ] Tripo3D集成
- [ ] 图像生成

#### 6. API测试

```bash
# 运行完整API测试套件
npm run test:api

# 运行端到端测试
npm run cypress:open
```

#### 7. 验证Firebase同步

1. 在Firebase中注册新用户
2. 检查TCB数据库中是否自动创建了对应用户记录
3. 验证用户信息同步正确

---

## 📊 监控和日志

### 开发环境

- **浏览器控制台**：查看前端日志
- **终端输出**：查看服务器日志
- **Next.js Dev Tools**：性能分析

### 生产环境

- **TCB控制台**：https://console.cloud.tencent.com/tcb
- **云函数日志**：实时查看函数执行日志
- **数据库监控**：查看请求量和性能
- **云监控**：告警配置

---

## 🚨 常见问题

### Q1: Firebase Auth用户如何同步到TCB？

**A**: 通过 `/api/auth/firebase-sync` 端点自动同步：
1. 用户在Firebase登录
2. 前端获取Firebase ID Token
3. 调用firebase-sync端点验证token
4. 自动在TCB创建/更新用户记录
5. 返回TCB用户信息

### Q2: 如何切换开发/生产环境？

**A**: 通过环境变量 `NEXT_PUBLIC_USE_TCB_AUTH`：
- `false` = Firebase（开发）
- `true` = TCB（生产）

### Q3: 云函数如何本地测试？

**A**: 
```bash
# 使用Mock服务器
npm run test:api

# 或直接调用TCB云函数
curl -X POST https://your-env.service.tcloudbase.com/executePrompt \
  -H "Content-Type: application/json" \
  -d '{"promptId":"test","userId":"user1"}'
```

### Q4: 数据库集合不存在怎么办？

**A**: 
```bash
# 运行迁移脚本自动创建
node scripts/migrate.js

# 验证
node scripts/db-check.js
```

### Q5: API测试失败？

**A**: 检查：
1. Jest环境是否为 `node`（不是jsdom）
2. Babel配置是否正确
3. Mock服务器是否正常启动
4. 网络连接是否正常

---

## 📝 部署检查清单

### 开发环境部署前

- [ ] `.env.local` 配置完整
- [ ] Firebase项目创建并配置
- [ ] 依赖安装完成
- [ ] 开发服务器可正常启动
- [ ] 用户注册登录流程测试通过
- [ ] Firebase同步到TCB正常

### 生产环境部署前

- [ ] TCB环境变量配置完整
- [ ] 数据库集合已创建并有样例数据
- [ ] 19个云函数全部部署成功
- [ ] API网关配置完成
- [ ] JWT密钥已更新为生产级
- [ ] AI服务密钥已配置
- [ ] COS存储已配置
- [ ] SSL证书已配置
- [ ] 域名DNS已解析
- [ ] API测试全部通过（18/18）
- [ ] 端到端测试通过
- [ ] 性能测试通过
- [ ] 安全审计完成
- [ ] 监控和告警配置完成
- [ ] 备份策略已制定

---

## 🔗 相关文档

- **迁移计划**: `MIGRATION_PLAN.md`
- **混合模式TODO**: `HYBRID_MODE_TODO.md`
- **数据库迁移工作流**: `DATABASE_MIGRATION_WORKFLOW_README.md`
- **开发笔记**: `DEVELOPMENT_NOTES.md`
- **API测试指南**: `scripts/TCB_API_FULL_VALIDATION_README.md`
- **生产检查清单**: `docs/PRODUCTION_CHECKLIST.md`

---

## 📞 技术支持

**GitHub仓库**: https://github.com/Angus1976/leverage-clone  
**当前分支**: `tcb-migration-hybrid-mode`

**关键技术联系人**:
- TCB迁移架构: 本文档作者
- Firebase团队: 负责开发环境测试
- 生产部署: DevOps团队

---

**文档版本**: v1.0  
**最后更新**: 2025-11-10  
**状态**: ✅ 架构完成，等待开发环境测试
