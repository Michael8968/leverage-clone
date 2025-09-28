# AI智能匹配平台 - 技术设计与功能规格说明书 (V2.2 Final)

## 1. 概述 (Overview)

本文档是“AI智能匹配平台”的终极技术实现指南，旨在提供一份精确、详尽、可供开发者直接参考的开发蓝图。其目标是使任何具备相应技术栈（Next.js, React, TypeScript, TailwindCSS, ShadCN, Genkit, Firebase）的开发者都能依据此文档从零开始，1:1地复现当前版本的完整项目。

---

## 2. 设计系统与UI规范 (Design System & UI Specification)

平台UI基于ShadCN组件库，并进行了深度定制，形成了一套统一、现代的设计语言。

### 2.1. 色彩系统 (`src/app/globals.css`)

所有颜色均通过CSS变量定义在 `:root` 中，以HSL格式表示，便于主题化和维护。

- **主色调 (Primary)**: `hsl(212 98% 73%)` - `var(--primary)`
- **背景色 (Background)**: `hsl(216 100% 96%)` - `var(--background)`
- **卡片色 (Card)**: `hsl(216 100% 98%)` - `var(--card)`
- **强调色 (Accent)**: `hsl(275 43% 77%)` - `var(--accent)`
- **字体色 (Foreground)**: `hsl(224 71.4% 4.1%)` - `var(--foreground)`

### 2.2. 字体排版 (`tailwind.config.ts`, `src/app/layout.tsx`)

- **标题字体 (Headline)**: `Space Grotesk` (variable: `--font-headline`)
- **正文字体 (Body)**: `Inter` (variable: `--font-sans`)

---

## 3. 核心架构与数据流 (Core Architecture & Data Flow)

### 3.1. 文件结构与路由

采用Next.js App Router。
- `/src/app/` 存放所有页面路由。
- `/src/components/` 存放通用组件 (`/ui`) 和功能性组件 (`/features`)。
- `/src/ai/` 存放所有AI流程和配置。
- `/src/store/` 存放Zustand状态管理。
- `/src/lib/` 存放工具函数、Firebase配置和核心类型定义。
- `/src/hooks/` 存放自定义Hooks。

### 3.2. 认证与状态管理 (Authentication & State Management)

采用`src/components/providers/auth-provider.tsx`作为全局唯一的认证状态监听器，在`useEffect`中订阅Firebase的`onAuthStateChanged`事件。它从Firestore获取用户文档，构建一个纯粹的、可序列化的`User`对象，并使用Zustand的`useAuthStore`更新全局状态。根路由守卫`src/app/page.tsx`则根据Zustand中的`isLoading`和`role`状态，在认证完成后执行页面跳转。

### 3.3. 数据库 (Firestore)

- **配置**: `src/lib/firebase.ts`
- **核心集合 (Collections)**:
  - `users`: 存储用户基本信息和角色。
  - `products`: 存储所有产品/服务信息。
  - `demands`: 存储所有用户发布的需求。
  - `suppliers`: 存储供应商信息。
  - `chats`: 存储供需双方的聊天记录。
  - `llm_connections`: **(核心)** 存储所有可用的第三方大语言模型API连接配置。
  - `prompts`: **(核心)** 存储提示词模板，包含`promptKey`用于受保护的调用，以及`modelId`用于绑定特定的LLM连接。
  - `resources`, `designers`: 存储其他配置和资源数据。

---

## 4. 页面与组件功能详解 (Pages & Components Functional Spec)

### 4.1. 登录页 (`/src/app/login/page.tsx`)

- **功能**: 提供用户登录界面。
- **Action**: 调用 Firebase Auth 的 `signInWithEmailAndPassword` 方法。
- **后续流程**: `AuthProvider` 监听认证成功事件，`RootPage` 守卫负责最终的页面跳转。

### 4.2. AI购物助手 (`/src/app/dashboard/page.tsx` -> `ShoppingAssistant`)

- **功能**: 用户与AI交互的核心界面，获取个性化商品推荐。
- **核心交互 (`onSubmit`)**:
  1.  **调用AI**: 依次调用 `generateUserProfile` (生成用户画像) 和 `getProductRecommendations` (获取推荐结果) 两个AI流程。
  2.  **更新UI**: AI返回推荐的产品ID列表，前端根据ID筛选并显示包含用户画像和推荐产品的AI消息。

### 4.3. 需求池 (`/demand-pool/page.tsx`) (非实时需求)

- **定位**: 异步、公开的需求发布与承接中心，用于解决用户非紧急、希望获得多种解决方案的复杂需求。
- **功能**: 需求发布、浏览、管理和AI匹配推荐。
- **核心交互**:
  - **新增需求**: `user` 角色点击“发布新需求”，使用`CreateDemandDialog`写入`demands`集合。
  - **抢单/沟通**: `supplier`或`creator`角色可“抢单”；达成合作后，相关方可通过`ChatDialog`进行实时沟通，并可选择启用“AI助理”模式。
  - **AI推荐**: `admin`可见，选中需求后，调用`recommendCreatives`流程进行匹配。

### 4.4. 创意设计师 (`/designers/page.tsx`) (实时需求)

- **定位**: 实时、即时需求的解决入口。当用户需要立即与人沟通时，通过此页面发起请求，由平台的**智能路由系统**进行服务分配。
- **功能**: 浏览平台所有设计师，并发起即时沟通。
- **核心交互**:
  - **发起交流**: 用户点击设计师卡片上的“立即交流”按钮。
  - **智能分诊**: 系统弹出对话框，让用户选择“与AI助理先沟通”或“直接与设计师本人聊”。
  - **路由决策**: 根据用户的选择和设计师的实时状态（是否在线、是否启用AI助理、排队人数等），后端的**智能路由策略 (`intelligentRoutingFlow`)**会做出决策：
    - **直接连接**: 将用户直接连接到空闲的设计师。
    - **AI助理接待**: 如果设计师繁忙或启用了AI助理，则先由AI助理进行第一轮沟通。
    - **智能分配**: 如果用户选择“直接聊”但设计师繁忙，系统会根据管理员配置的路由策略，尝试将请求分配给平台上其他合适且空闲的设计师。
  - **创建私密需求**: 无论最终分配给谁，系统都会在 `demands` 集合中创建一个 `type: 'private'` 的专属沟通需求，并拉起聊天窗口。

### 4.5. 创意者工作台 (`/creator-workbench/page.tsx`)

- **功能**: 为创意者提供任务发现和AI创作工具。
- **核心交互**:
  - **`TasksTab`**: 从`demands`集合查询“开放中”的需求。
  - **`CreationsTab`**: 集成多个AI图像生成工具（内置模型, Tripo3D, Gemini Image），创作者可调用流程生成预览图。
  - **作品提交**: AI生成图片后，通过`SubmissionForm`表单将作品信息（名称、价格、描述等）作为一条新记录（包含`creatorId`和`status: '审核中'`）**存入`products`集合**。
  - **`SubmissionsTab`**: 从`products`集合加载**当前创作者**已提交的作品列表和审核状态。

### 4.6. 管理后台 (`/admin-dashboard` & `/intelligent-routing`) (新增)

- **功能**: 专为`admin`角色设计的后台管理中心。
- **核心模块**:
  - **LLM对接 (`/admin-dashboard`)**: 管理所有LLM模型连接，包括添加、编辑、测试。
  - **智能路由策略 (`/intelligent-routing`)**: 平台服务调度的核心。管理员可以在此用**自然语言**定义全局的、唯一的路由策略，并为不同的决策因子（如技能匹配度、设计师闲忙程度、用户优先级等）设置独立的权重（温度），以智能地分配所有**实时用户请求**。

### 4.7. 提示词管理 (`/prompt-management/page.tsx`)

- **功能**: 为`admin`和`creator`角色提供一个强大、安全的提示词工程界面。
- **核心交互**:
  - **提示词列表与IP保护**: 展示用户有权访问的提示词。
  - **新增/编辑提示词**: 提供表单，支持模型绑定和元提示词导入。

---
**文档结束**
