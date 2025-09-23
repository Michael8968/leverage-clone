# AI智能匹配平台 - 技术设计与功能规格说明书 (V2.1 Final)

## 1. 概述 (Overview)

本文档是“AI智能匹配平台”的终极技术实现指南，旨在提供一份精确、详尽、可供开发者直接参考的开发蓝图。其目标是使任何具备相应技术栈（Next.js, React, TypeScript, TailwindCSS, ShadCN, Genkit, Firebase）的开发者都能依据此文档从零开始，1:1地复现当前版本的完整项目。

---

## 2. 设计系统与UI规范 (Design System & UI Specification)

平台UI基于ShadCN组件库，并进行了深度定制，形成了一套统一、现代的设计语言。

### 2.1. 色彩系统 (`src/app/globals.css`)

所有颜色均通过CSS变量定义在 `:root` 中，以HSL格式表示，便于主题化和维护。

- **主色调 (Primary)**: `hsl(212 98% 73%)` - `var(--primary)`
  - 用途：核心操作按钮、活动标签、输入框焦点环、链接。
- **背景色 (Background)**: `hsl(216 100% 96%)` - `var(--background)`
  - 用途：应用主背景。
- **卡片色 (Card)**: `hsl(216 100% 98%)` - `var(--card)`
  - 用途：所有卡片、弹窗、表格等内容容器的背景。
- **强调色 (Accent)**: `hsl(275 43% 77%)` - `var(--accent)`
  - 用途：AI相关功能模块的背景或高亮，如AI创作、数据处理按钮。
- **字体色 (Foreground)**: `hsl(224 71.4% 4.1%)` - `var(--foreground)`
  - 用途：主要文本颜色。

### 2.2. 字体排版 (`tailwind.config.ts`, `src/app/layout.tsx`)

- **标题字体 (Headline)**: `Space Grotesk` (variable: `--font-headline`)
  - 用途：`<h1>`, `<h2>`, `<CardTitle>`等所有标题元素。通过 `font-headline` 类应用。
- **正文字体 (Body)**: `Inter` (variable: `--font-inter`)
  - 用途：所有非标题文本。通过 `font-body` 类应用在 `<body>` 上。

---

## 3. 核心架构与数据流 (Core Architecture & Data Flow)

### 3.1. 文件结构与路由

采用Next.js App Router。
- `/src/app/` 存放所有页面路由。
- `/src/components/` 存放通用组件 (`/ui`) 和功能性组件 (`/features`)。
- `/src/ai/` 存放所有Genkit相关的AI流程和配置。
- `/src/store/` 存放Zustand状态管理。
- `/src/lib/` 存放工具函数 (`cn`)、Firebase配置 (`firebase`) 和核心类型定义 (`types`)。
- `/src/hooks/` 存放自定义Hooks。

### 3.2. 认证与状态管理 (Authentication & State Management)

**问题背景**: 项目曾面临严重问题——用户登录后无法跳转，根源在于Firebase Auth的异步事件与React同步渲染之间的脱节，以及Zustand `persist`中间件对Firebase复杂对象的错误序列化。

**最终解决方案**:
1.  **纯数据用户对象 (`src/store/auth.ts`)**:
    -   `useAuthStore` 中存储的 `user` 对象被定义为一个纯粹的、可序列化的接口 `User { uid, name, email, role, avatar }`。**它不存储任何Firebase返回的复杂对象**。
    -   `useAuthStore` 结合 `persist` 中间件，将这个纯粹的`user`对象安全地存入 `localStorage`，并在应用加载时恢复。

2.  **单一事实来源 (`src/components/providers/auth-provider.tsx`)**:
    -   `AuthProvider` 组件被放置在根布局 `src/app/layout.tsx` 中，成为**全局唯一**的认证状态监听器。
    -   在 `useEffect` 中，它订阅 Firebase 的 `onAuthStateChanged` 事件。
    -   当监听到 `firebaseUser` 登录时，它**不会**直接存储 `firebaseUser` 对象。相反，它会从 Firestore 的 `users` 集合中获取该用户的文档。
    -   然后，它会**构建一个纯粹的、可序列化的 `User` 对象**（包含 `uid`, `name`, `role` 等），并调用 `useAuthStore` 的 `setUser` 方法更新全局状态。
    -   这个机制确保了无论是首次登录还是从 `localStorage` 恢复，Zustand中的`user`对象始终是结构完整且可预测的纯数据。

3.  **根路由守卫 (`src/app/page.tsx`)**:
    -   `RootPage` 是应用的入口，它的**唯一职责**是充当路由守卫。
    -   它从 `useAuthStore` 中获取 `isLoading` 和 `role` 状态。
    -   在一个 `useEffect` 中，它等待 `isLoading` 变为 `false`（表示 `AuthProvider` 已经完成了认证检查）。
    -   然后，它根据 `role` 计算出正确的跳转路径（例如，`admin` -> `/demand-pool`），并调用 `router.replace()` 执行跳转。

这个架构彻底解决了认证和状态持久化带来的所有问题，保证了应用的稳定性和可预测性。

### 3.3. 数据库 (Firestore)

- **配置**: `src/lib/firebase.ts`
- **集合 (Collections)**:
  - `products`: 存储所有产品/服务信息。
  - `demands`: 存储所有用户发布的需求。
  - `suppliers`: 存储供应商信息。
  - `users`: 存储用户基本信息和角色。
  - `designers`: 存储设计师信息。
  - `prompts`, `resources`: 存储配置数据。

---

## 4. 页面与组件功能详解 (Pages & Components Functional Spec)

### 4.1. 登录页 (`/src/app/login/page.tsx`)

- **功能**: 提供用户登录界面。
- **交互**:
  - 用户输入邮箱和密码。
  - **Action**: 调用 Firebase Auth 的 `signInWithEmailAndPassword` 方法。
  - **后续流程**: 登录成功后，`AuthProvider` 中的 `onAuthStateChanged` 会被触发，处理后续的用户数据获取、状态设置。`RootPage` 守卫会负责最终的页面跳转。
  - **用户反馈**: 点击登录后，按钮显示加载状态。登录成功后，会显示一个准确的提示信息，如“登录成功，正在验证您的角色信息...”。

### 4.2. 应用布局 (`/src/components/app-layout.tsx`)

- **功能**: 包裹所有页面的主布局，负责渲染侧边栏和主内容区。
- **核心逻辑**:
  - **动态导航**: `navItems` 数组根据当前登录用户的`role`被过滤，以生成用户可见的导航菜单。
  - **不含路由守卫**: 该组件不包含任何路由守卫逻辑，所有守卫职责已上移到 `page.tsx`。

### 4.3. AI购物助手 (`/src/app/dashboard/page.tsx` -> `ShoppingAssistant`)

- **文件**: `/src/components/features/shopping-assistant.tsx`
- **功能**: 用户与AI交互的核心界面，获取个性化商品推荐。
- **数据获取**: 在`useEffect`中，从Firestore的`products`和`suppliers`集合加载所有数据。
- **核心交互 (`onSubmit`)**:
  1.  **调用AI**: 依次调用 `generateUserProfile` (生成用户画像) 和 `getProductRecommendations` (获取推荐结果) 两个AI流程。
  2.  **更新UI**: AI返回推荐的产品ID列表。前端根据ID筛选出完整的产品对象，并显示包含用户画像和推荐产品的AI消息。
  3.  **权限控制**: `DemandPoolConnector`（“发布到需求池”入口）**仅在当前用户角色为 `'user'` 时显示**。

### 4.4. 需求池 (`/src/app/demand-pool/page.tsx`)

- **功能**: 需求发布、浏览、管理和AI匹配推荐。
- **核心交互**:
  - **新增需求**: `user` 角色点击“发布新需求”按钮，弹出 `CreateDemandDialog`。
    - **表单验证**: 使用 `zod` 和 `react-hook-form`。对 `budget` 字段有特殊的 `preprocess` 解析逻辑以确保数字验证正确。
    - **数据写入**: 表单提交时，调用 `addDoc` 将新需求写入 `demands` 集合，并正确地将当前用户的 `uid` 作为 `requesterId` 存入。
  - **抢单**: (`supplier`或`creator`角色) 点击“抢单”按钮，调用`updateDoc`将需求的`status`更新为“进行中”。
  - **AI推荐**: (`admin`可见) 选中一个或多个需求后，点击“AI推荐”，打开`RecommendationDialog`，调用`recommendCreatives`流程进行匹配。

### 4.5. 供应商中心 (`/src/app/suppliers/page.tsx`)

- **功能**: 供应商信息和产品的深度管理。
- **数据获取/操作**:
  - **公司信息**: 表单与 `suppliers` 集合双向绑定，实时保存。
  - **产品列表**:
    - **数据读写**: 页面加载时，通过 `query` 从 `products` 集合加载**当前供应商**的产品数据。
    - **增删改**: `addProduct` (`addDoc`), `updateProduct` (`updateDoc`), `removeProduct` (`deleteDoc`) 功能完整，所有操作实时同步到Firestore。`updateProduct` 通过 `debounce` 优化性能。
  - **批量数据处理 (`DataProcessor`)**:
    - **AI调用**: 上传CSV，调用`evaluateSellerData` AI流程进行分析。
    - **数据写入**: 分析结果通过`writeBatch`批量写入`suppliers`集合。

### 4.6. 创意者工作台 (`/src/app/creator-workbench/page.tsx`)

- **功能**: 为创意者提供任务发现和AI创作工具。
- **访问控制**: 页面在加载时检查用户角色，非`creator`角色将被拒绝访问。
- **子组件**:
  - **`TasksTab`**: 从Firestore查询`demands`集合中所有“开放中”的需求。
  - **`CreationForm`**: 调用 `generate3dModel` AI流程生成图片预览。
  - **作品提交**:
    - AI生成图片后，显示一个表单让创作者填写作品信息（名称、价格、描述等）。
    - 点击“提交审核”后，调用`addDoc`将此作品作为一条新记录（包含`creatorId`和`status: '审核中'`）**存入`products`集合**。
  - **`Submissions Tab`**: 从`products`集合加载**当前创作者**已提交的作品列表，并正确处理`createdAt`可能为空的情况。

---
**文档结束**
