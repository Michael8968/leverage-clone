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

### 4.3. 需求池 (`/src/app/demand-pool/page.tsx`)

- **功能**: 需求发布、浏览、管理和AI匹配推荐。
- **核心交互**:
  - **新增需求**: `user` 角色点击“发布新需求”，使用`CreateDemandDialog`写入`demands`集合。
  - **抢单/沟通**: `supplier`或`creator`角色可“抢单”；达成合作后，相关方可通过`ChatDialog`进行实时沟通，并可选择启用“AI助理”模式。
  - **AI推荐**: `admin`可见，选中需求后，调用`recommendCreatives`流程进行匹配。

### 4.4. 创意者工作台 (`/src/app/creator-workbench/page.tsx`)

- **功能**: 为创意者提供任务发现和AI创作工具。
- **核心交互**:
  - **`TasksTab`**: 从`demands`集合查询“开放中”的需求。
  - **`CreationsTab`**: 集成多个AI图像生成工具（内置模型, Tripo3D, Gemini Image），创作者可调用流程生成预览图。
  - **作品提交**: AI生成图片后，通过`SubmissionForm`表单将作品信息（名称、价格、描述等）作为一条新记录（包含`creatorId`和`status: '审核中'`）**存入`products`集合**。
  - **`SubmissionsTab`**: 从`products`集合加载**当前创作者**已提交的作品列表和审核状态。

### 4.5. 管理后台 (`/src/app/admin-dashboard/page.tsx`)

- **功能**: **(新增)** 专为`admin`角色设计的后台管理中心，目前专注于LLM模型对接。
- **核心交互**:
  - **LLM连接列表**: 以卡片式布局展示所有已配置的LLM模型连接，信息包括模型名称、供应商、优先级、状态等。
  - **添加/编辑连接**:
    - **`LlmConnectionForm`**: 提供一个统一的表单用于添加或编辑LLM连接。
    - **预设与自定义输入**: “厂商”和“模型名称”等字段采用`Combobox`组件，既提供主流模型的预设选项（数据源自后端的`SUPPORTED_PROVIDERS`），也支持管理员直接输入自定义值，保证了极高的灵活性。
  - **可用性测试**:
    - **Action**: 点击“可用性测试”按钮，将触发`testLlmConnection`后端流程。
    - **Flow**: 该流程内部会调用统一的`executePrompt` API网关，向目标模型发送一个测试请求。
    - **Feedback**: 前端通过Toast组件，向管理员实时反馈连接是否成功以及模型的返回信息。

### 4.6. 提示词管理 (`/src/app/prompt-management/page.tsx`)

- **功能**: 为`admin`和`creator`角色提供一个强大、安全的提示词工程界面。
- **核心交互**:
  - **提示词列表**: 展示用户有权访问的提示词，包含名称、唯一的`promptKey`、状态和绑定的模型。
  - **新增/编辑提示词 (`PromptEditDialog`)**:
    - **`promptKey`**: 新增提示词保存后，系统会自动生成一个唯一的、人类可读的`promptKey`，作为其外部调用的句柄。
    - **内容保护**: 管理员可以查看所有提示词内容，但无法编辑非自己创建的提示词内容，实现了知识产权保护。
    - **模型绑定**: 提供一个“绑定模型”的下拉框，其选项来自“LLM对接”中所有状态为“活跃”的模型。管理员可在此将提示词与一个具体的执行模型关联。
    - **Base URL**: 为已创建的提示词提供一个只读的“调用地址”，清晰展示如何通过API进行外部集成。
    - **元提示词导入**: 提供“一键导入”功能，可将专业的、带变量的底层提示词模板快速填充到内容框中。

---
**文档结束**
