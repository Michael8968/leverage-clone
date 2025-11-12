# AI 智能匹配与创意生成平台 (Leverage)

这是一个基于 Next.js 15、腾讯云 CloudBase (TCB) 和 AI 大模型构建的全栈应用，旨在无缝连接用户的个性化需求与高品质的产品及服务。

## 🎉 项目状态

**✅ 生产环境已部署上线**

- **部署日期**: 2025年11月10-11日
- **最新更新**: 2025年11月12日 - 添加管理员用户管理系统
- **部署环境**: 腾讯云 CloudBase 云托管
- **部署分支**: `tcb-cloudrun-fullstack-ready`
- **运行状态**: 生产环境稳定运行中

📚 **部署文档**:
- [生产部署成功记录](./PRODUCTION_DEPLOYMENT_SUCCESS.md)
- [TCB 云托管部署方案](./TCB_DEPLOYMENT_SOLUTION.md)
- [健康检查配置指南](./TCB_HEALTH_CHECK_FIX.md)
- [开发笔记 - 最新管理员系统](./DEVELOPMENT_NOTES.md)

## 核心技术栈

*   **前端**: Next.js 15.5.6 (App Router), React 18, TypeScript, ShadCN UI, Tailwind CSS
*   **后端**: Next.js API Routes, Node.js 20 LTS
*   **数据库**: 腾讯云 CloudBase Database (NoSQL)
*   **存储**: 腾讯云 COS (对象存储)
*   **AI 服务**: 腾讯混元 (Hunyuan)、OpenAI、Google Gemini
*   **部署**: Docker + Kubernetes (TCB Cloud Run)
*   **CI/CD**: GitHub + TCB 自动构建部署



## 主要功能模块



1.  **多角色认证系统**: 支持管理员、供应商、创意者和用户四种角色，并提供基于角色的访问控制和动态导航。平台具备动态、可配置的多厂商大语言模型（LLM）对接能力，以及带有高级规则（时间、用户维度）的AI场景配置系统。所有模块都已接入真实的数据库逻辑，形成了一个功能完整、逻辑自洽、可扩展性强的全栈AI应用，已达到上线标准。平台具备动态、可配置的多厂商大语言模型（LLM）对接能力，以及带有高级规则（时间、用户维度）的AI场景配置系统。所有模块都已接入真实的数据库逻辑，形成了一个功能完整、逻辑自洽、可扩展性强的全栈AI应用，已达到上线标准。

2.  **AI 购物助手**: 用户可通过自然语言或上传图片与AI交互，获得基于用户画像分析的个性化商品推荐。

3.  **需求池与AI匹配**: 用户可发布公开需求，管理员可使用AI为需求匹配最合适的供应商或创意者。

4.  **创意者工作台**: 提供任务接取、AI辅助创作（集成Tripo3D、Gemini Image等模型）、作品提交管理和排班预约管理功能。

5.  **实时IM沟通**: 供需双方可在达成合作意向后进行实时聊天，并为创意者提供了可选的'AI助理'模式来辅助沟通。## 核心技术栈## 核心技术栈

6.  **后台管理系统**:

    *   **LLM对接管理**: 允许管理员动态配置、测试和管理来自不同厂商（如Google, OpenAI等）的大语言模型连接。

    *   **提示词管理**: 为管理员和创意者提供一个强大的提示词库，支持知识产权保护、查询范围定义和执行模型绑定。

    *   **AI场景配置**: 允许管理员为平台的业务场景（如聊天助理）绑定特定的提示词，并设置复杂的生效规则（如时间、用户角色/星级）。*   **前端**: Next.js, React, TypeScript, ShadCN UI, Tailwind CSS*   **前端**: Next.js, React, TypeScript, ShadCN UI, Tailwind CSS

    *   **智能路由策略**: 允许管理员为平台的实时服务分配场景，定义一个全局默认策略，并可创建多条带有复杂生效条件（时间、人群）的优先策略，形成一个强大的路由规则引擎。

    *   **权限管理**: 集中控制平台所有用户的角色、状态和星级评定，支持批量操作。*   **后端 & 数据库**: TCB (腾讯云开发) - 云数据库、云函数、云存储*   **后端 & 数据库**: Firebase (Authentication & Firestore) v11.9.1

    *   **知识库与数据导入**: 支持对产品/服务数据的手动管理和批量导入处理。

*   **AI**: Google Genkit (Gemini) 及通过原生API对接的多个第三方LLM*   **AI**: Google Genkit (Gemini) 及通过原生API对接的多个第三方LLM

## 本地开发环境搭建



### 环境要求

- Node.js 18+## 主要功能模块## 主要功能模块

- npm 或 yarn

- TCB (腾讯云开发) 账户



### 安装步骤1.  **多角色认证系统**: 支持管理员、供应商、创意者和用户四种角色，并提供基于角色的访问控制和动态导航。1.  **多角色认证系统**: 支持管理员、供应商、创意者和用户四种角色，并提供基于角色的访问控制和动态导航。



1. **克隆项目**2.  **AI 购物助手**: 用户可通过自然语言或上传图片与AI交互，获得基于用户画像分析的个性化商品推荐。2.  **AI 购物助手**: 用户可通过自然语言或上传图片与AI交互，获得基于用户画像分析的个性化商品推荐。

   ```bash

   git clone <repository-url>3.  **需求池与AI匹配**: 用户可发布公开需求，管理员可使用AI为需求匹配最合适的供应商或创意者。3.  **需求池与AI匹配**: 用户可发布公开需求，管理员可使用AI为需求匹配最合适的供应商或创意者。

   cd leverage-clone

   ```4.  **创意者工作台**: 提供任务接取、AI辅助创作（集成Tripo3D、Gemini Image等模型）、作品提交管理和排班预约管理功能。4.  **创意者工作台**: 提供任务接取、AI辅助创作（集成Tripo3D、Gemini Image等模型）、作品提交管理和排班预约管理功能。



2. **安装依赖**5.  **实时IM沟通**: 供需双方可在达成合作意向后进行实时聊天，并为创意者提供了可选的'AI助理'模式来辅助沟通。5.  **实时IM沟通**: 供需双方可在达成合作意向后进行实时聊天，并为创意者提供了可选的“AI助理”模式来辅助沟通。

   ```bash

   npm install6.  **后台管理系统**:6.  **后台管理系统**:

   ```

    *   **LLM对接管理**: 允许管理员动态配置、测试和管理来自不同厂商（如Google, OpenAI等）的大语言模型连接。    *   **LLM对接管理**: 允许管理员动态配置、测试和管理来自不同厂商（如Google, OpenAI等）的大语言模型连接。

3. **环境配置**

   ```bash    *   **提示词管理**: 为管理员和创意者提供一个强大的提示词库，支持知识产权保护、查询范围定义和执行模型绑定。    *   **提示词管理**: 为管理员和创意者提供一个强大的提示词库，支持知识产权保护、查询范围定义和执行模型绑定。

   cp .env.example .env.local

   # 编辑 .env.local 文件，填入你的 TCB 配置    *   **AI场景配置**: 允许管理员为平台的业务场景（如聊天助理）绑定特定的提示词，并设置复杂的生效规则（如时间、用户角色/星级）。    *   **AI场景配置**: 允许管理员为平台的业务场景（如聊天助理）绑定特定的提示词，并设置复杂的生效规则（如时间、用户角色/星级）。

   ```

    *   **智能路由策略**: 允许管理员为平台的实时服务分配场景，定义一个全局默认策略，并可创建多条带有复杂生效条件（时间、人群）的优先策略，形成一个强大的路由规则引擎。    *   **智能路由策略**: 允许管理员为平台的实时服务分配场景，定义一个全局默认策略，并可创建多条带有复杂生效条件（时间、人群）的优先策略，形成一个强大的路由规则引擎。

4. **数据库初始化**

   ```bash    *   **权限管理**: 集中控制平台所有用户的角色、状态和星级评定，支持批量操作。    *   **权限管理**: 集中控制平台所有用户的角色、状态和星级评定，支持批量操作。

   # 运行数据库迁移验证流程

   node scripts/run-workflow.js    *   **知识库与数据导入**: 支持对产品/服务数据的手动管理和批量导入处理。    *   **知识库与数据导入**: 支持对产品/服务数据的手动管理和批量导入处理。

   ```



5. **启动开发服务器**

   ```bash## 本地开发环境搭建## 小程序部署指南

   npm run dev

   ```



## 生产部署### 环境要求1. 使用微信开发者工具，打开本仓库下 `miniprogram/` 目录。



### 数据库迁移验证- Node.js 18+2. 在 `miniprogram/project.config.json` 中将 `appid` 替换为你的测试 AppID。

在部署前，请确保运行完整的数据库迁移验证流程：

- npm 或 yarn3. 如使用 `@cloudbase/js-sdk`，请在开发者工具中勾选“使用 npm 构建”，并执行构建。

```bash

node scripts/run-workflow.js- TCB (腾讯云开发) 账户4. 确保本地 Next.js 在 http://localhost:3000 运行（小程序默认以此为 API_BASE）。

```

5. 联调完成后，在微信开发者工具中选择“上传”，填写版本号与备注，上传代码。

此命令会执行：

- 数据库状态检查### 安装步骤6. 登陆微信公众平台完成提审与发布流程。

- 数据迁移修复

- API功能测试

- 系统监控验证1. **克隆项目**

   ```bash

### 部署到TCB   git clone <repository-url>

```bash   cd leverage-clone

npm run deploy   ```

```

2. **安装依赖**

### 健康检查   ```bash

```bash   npm install

npm run health-check   ```

```

3. **环境配置**

## 项目结构   ```bash

   cp .env.example .env.local

```   # 编辑 .env.local 文件，填入你的 TCB 配置

├── src/                    # 源代码   ```

│   ├── app/               # Next.js App Router

│   ├── components/        # React组件4. **数据库初始化**

│   ├── lib/              # 工具库   ```bash

│   └── ai/               # AI相关代码   # 运行数据库迁移验证流程

├── scripts/              # 构建和部署脚本   node scripts/run-workflow.js

├── data/                 # 测试数据   ```

├── public/               # 静态资源

└── docs/                 # 文档5. **启动开发服务器**

```   ```bash

   npm run dev

## 数据库设计   ```



项目使用TCB云数据库，核心集合包括：## 生产部署

- `users` - 用户数据

- `products` - 产品数据### 数据库迁移验证

- `demands` - 需求数据在部署前，请确保运行完整的数据库迁移验证流程：

- `suppliers` - 供应商数据

- `prompts` - 提示词数据```bash

node scripts/run-workflow.js

详细的数据库迁移和验证流程请参考 `DATABASE_MIGRATION_WORKFLOW_README.md`。```



## 开发脚本此命令会执行：

- 数据库状态检查

- `npm run dev` - 启动开发服务器- 数据迁移修复

- `npm run build` - 构建生产版本- API功能测试

- `npm run start` - 启动生产服务器- 系统监控验证

- `npm run lint` - 代码检查

- `npm run test` - 运行测试### 部署到TCB

- `npm run typecheck` - TypeScript类型检查```bash

npm run deploy

## 许可证```



本项目采用 MIT 许可证。### 健康检查
```bash
npm run health-check
```

## 项目结构

```
├── src/                    # 源代码
│   ├── app/               # Next.js App Router
│   │   ├── api/          # API路由
│   │   │   ├── users/    # 用户管理API (新增PUT/DELETE)
│   │   │   └── auth/     # 认证API (增强的管理员注册)
│   │   └── register/     # 注册页面 (智能表单)
│   ├── components/        # React组件
│   ├── lib/              # 工具库
│   │   ├── auth/        # JWT认证模块 (新增)
│   │   ├── repositories/ # 数据层接口
│   │   │   ├── users.ts        # 用户Repository
│   │   │   └── tcb/            # TCB实现
│   │   └── tcb.ts       # TCB初始化
│   ├── ai/               # AI相关代码
│   └── types/            # 类型定义
├── scripts/              # 构建和部署脚本
├── data/                 # 测试数据
├── public/               # 静态资源
└── docs/                 # 文档
```

## 管理员用户管理系统 (新增 v1.1)

### 核心功能

#### 1. **JWT认证模块** (`src/lib/auth/jwt.ts`)
- Token生成和验证
- 支持7天有效期
- 集成所有管理员操作

#### 2. **用户管理API** (`src/app/api/users/route.ts`)
- **GET**: 列表查询、精确查询、模糊搜索、分页
- **PUT**: 更新用户信息 (仅管理员)
- **DELETE**: 删除用户账户 (仅管理员，防自删)

#### 3. **增强的管理员注册** (`src/app/api/auth/register/route.ts`)
- 首个管理员可自注册
- 后续管理员需由现有管理员授权
- 最多10个管理员上限
- JWT token验证

#### 4. **智能注册表单** (`src/app/register/page.tsx`)
- 动态显示admin选项 (仅管理员可见)
- 管理员创建模式
- 自动包含Authorization header

#### 5. **权限管理UI** (`src/app/permissions/page.tsx`)
- 用户删除功能 (带确认对话框)
- 自我保护 (管理员不能删除自己)
- 完善的错误处理

### 使用示例

**创建管理员** (首个):
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secure_password",
  "name": "Admin User",
  "role": "admin"
}
```

**创建管理员** (由现有管理员):
```bash
POST /api/auth/register
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "email": "admin2@example.com",
  "password": "secure_password",
  "name": "Second Admin",
  "role": "admin"
}
```

**更新用户**:
```bash
PUT /api/users?uid=u_123456
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "role": "creator",
  "status": "active"
}
```

**删除用户**:
```bash
DELETE /api/users?uid=u_123456
Authorization: Bearer {admin_token}
```

### 安全特性

- ✅ JWT token认证 (每个管理操作)
- ✅ 角色检查 (仅admin可操作)
- ✅ 自我保护 (管理员不能自删)
- ✅ UID不可修改 (身份保护)
- ✅ 管理员数量限制 (最多10个)
- ✅ 操作日志 (控制台记录)

## 数据库设计

项目使用TCB云数据库，核心集合包括：
- `users` - 用户数据 (支持新的Repository接口)
- `products` - 产品数据
- `demands` - 需求数据
- `suppliers` - 供应商数据
- `prompts` - 提示词数据

详细的数据库迁移和验证流程请参考 `DATABASE_MIGRATION_WORKFLOW_README.md`。

更新日志请参考 `DEVELOPMENT_NOTES.md` 中的管理员系统实现部分。

## 开发脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 代码检查
- `npm run test` - 运行测试
- `npm run typecheck` - TypeScript类型检查

## 许可证

本项目采用 MIT 许可证。