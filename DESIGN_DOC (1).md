
# AI智能匹配平台 - 技术设计与功能规格说明书 (V1.0)

## 1. 概述 (Overview)

本文档是“AI智能匹配平台”的终极技术实现指南，旨在提供一份精确、详尽、可供开发者直接参考的开发蓝图。其目标是使任何具备相应技术栈（Next.js, React, TypeScript, TailwindCSS, ShadCN, Genkit）的开发者都能依据此文档从零开始，1:1地复现当前版本的完整项目。

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
- **柔和字体色 (Muted Foreground)**: `hsl(223.4 21.3% 44.1%)` - `var(--muted-foreground)`
  - 用途：辅助性描述文本、占位符。
- **边框色 (Border)**: `hsl(215.3 25% 86.5%)` - `var(--border)`
  - 用途：组件边框，如输入框、卡片、表格。

### 2.2. 字体排版 (`tailwind.config.ts`, `src/app/layout.tsx`)

- **标题字体 (Headline)**: `Space Grotesk` (variable: `--font-space-grotesk`)
  - 用途：`<h1>`, `<h2>`, `<CardTitle>`等所有标题元素。通过 `font-headline` 类应用。
- **正文字体 (Body)**: `Inter` (variable: `--font-inter`)
  - 用途：所有非标题文本。通过 `font-body` 类应用在 `<body>` 上。

### 2.3. 核心UI组件 (`src/components/ui/`)

所有UI组件均为ShadCN标准组件，样式通过`globals.css`中的CSS变量进行全局定制。

- **`Card`**: `rounded-lg`, `border`, `bg-card`, `shadow-sm`。
- **`Button`**: `rounded-md`。`default` variant 使用 `bg-primary`。
- **`Input`**: `rounded-md`, `border-input`。
- **`Badge`**: `rounded-full`。
- **`Tabs`**: `TabsList` 使用 `bg-muted`，`TabsTrigger` 在激活时 `data-[state=active]` 使用 `bg-background` 和 `shadow-sm`。

---

## 3. 核心架构与数据流 (Core Architecture & Data Flow)

### 3.1. 文件结构与路由

采用Next.js App Router。
- `/src/app/` 存放所有页面路由。
- `/src/components/` 存放通用组件 (`/ui`) 和功能性组件 (`/features`)。
- `/src/ai/` 存放所有Genkit相关的AI流程和配置。
- `/src/store/` 存放Zustand状态管理。
- `/src/lib/` 存放工具函数（如 `cn`）。
- `/src/hooks/` 存放自定义Hooks。

### 3.2. 状态管理 (`src/store/auth.ts`)

- **技术栈**: Zustand with `persist` middleware.
- **`useAuthStore`**: 全局状态存储，负责管理用户认证信息。
  - **State**:
    - `role: Role | null`: 当前用户角色 (`'admin'`, `'supplier'`, `'user'`, `'creator'`)。
    - `user: User | null`: 当前用户信息对象 (`{ id, name, email, role }`)。
  - **Actions**:
    - `login(userId, role)`: 模拟登录，根据`userId`和`role`设置`user`和`role`状态。
    - `logout()`: 清除用户状态，重置为`null`。
  - **持久化**: 登录状态被保存在`localStorage`中，实现会话保持。

### 3.3. AI流程 (`src/ai/`)

- **技术栈**: Genkit with Google AI provider.
- **`genkit.ts`**: 初始化全局`ai`实例。
- **`flows/*.ts`**: 每个文件定义一个独立的、可导出的异步函数，该函数封装了一个Genkit flow。
  - **Schema定义**: 使用`zod`为每个flow的输入和输出定义强类型Schema。
  - **Prompt定义**: 使用`ai.definePrompt`创建提示词，支持Handlebars模板语法。对于需要结构化输出的场景，在`prompt`字符串中明确指示AI遵循`output.schema`。
  - **Flow定义**: 使用`ai.defineFlow`封装核心逻辑，调用`prompt`并返回其输出。

---

## 4. 页面与组件功能详解 (Pages & Components Functional Spec)

### 4.1. 登录页 (`/src/app/login/page.tsx`)

- **功能**: 提供角色选择界面，用于模拟不同用户身份登录。
- **UI**:
  - 页面居中布局，包含应用标题和四个角色卡片。
  - 每个卡片代表一个角色，包含头像、名称。
- **交互**:
  - 点击任一卡片下的“登录”按钮。
  - **Action**: 调用 `useAuthStore` 的 `login(userId, role)` 方法。
  - **Navigation**: 使用 Next.js `useRouter` 跳转到角色对应的首页 (`/`)。

### 4.2. 应用布局 (`/src/components/app-layout.tsx`)

- **功能**: 包裹所有页面的主布局，负责渲染侧边栏、主内容区，并处理认证逻辑。
- **State**:
  - `const { role, user, logout } = useAuthStore()`: 订阅认证状态。
  - `const pathname = usePathname()`: 获取当前路由。
  - `const router = useRouter()`: 获取路由实例。
- **核心逻辑**:
  - **路由守卫**: 在`useEffect`中实现。如果组件已挂载 (`mounted`) 且 `role` 为`null`（未登录），则调用 `router.replace('/login')` 强制跳转到登录页。此逻辑避免了在渲染期间直接调用路由方法，解决了“setState in render”的错误。
  - **动态导航**: `navItemsByRole` 对象根据当前`role`过滤出对应的导航菜单项。
- **组件**:
  - `SidebarProvider`: 包裹所有内容，提供侧边栏状态的Context。
  - `Sidebar`:
    - `SidebarHeader`: 显示Logo和应用名称。
    - `SidebarContent`: 遍历`currentNavItems`渲染`SidebarMenuItem`和`SidebarMenuButton`。
    - `SidebarFooter`: 显示用户信息下拉菜单，包含“退出登录”操作。
  - `SidebarInset`: 主内容区域。

### 4.3. AI购物助手 (`/src/app/page.tsx` -> `ShoppingAssistant`)

- **文件**: `/src/components/features/shopping-assistant.tsx`
- **功能**: 用户与AI交互的核心界面。
- **State**:
  - `useState<Message[]>`: 存储整个对话消息数组。`Message`类型定义为 `{ type, text?, imageUrl?, profile?, recommendations? }`。
  - `useState<string | null>`: 存储待上传图片的预览URL。
- **表单 (`react-hook-form` + `zod`)**:
  - `description: string`: 用户输入的文本。
  - `image: File?`: 用户上传的图片文件。
- **核心交互 (`onSubmit`)**:
  1.  **准备数据**: 将用户输入的文本和图片（转换为Data URI）准备好。
  2.  **更新UI**: 将用户消息和加载状态消息添加到`messages`数组中，清空表单。
  3.  **调用AI Flow (1 - 画像)**: `await generateUserProfile({ description, photoDataUri })`。
  4.  **调用AI Flow (2 - 推荐)**: `await getProductRecommendations({ userProfile: profile, photoDataUri })`。
  5.  **更新UI**: 找到`messages`数组中的加载状态消息，并用包含`profile`和`recommendations`结果的AI消息替换它。
  6.  **错误处理**: `try...catch`块捕获AI调用失败，并通过`toast`显示错误信息。
- **子组件**:
  - `UserMessage`: 显示用户发送的消息。
  - `AIMessage`: 显示AI的回复，内部分为`UserProfileDisplay`和`RecommendationsDisplay`。
  - `LoadingMessage`: 显示加载骨架屏。
  - `CustomServiceConnector`: 高端定制服务模块。
    - **State**: `useState<'initial' | 'input' | 'loading' | 'results'>`: 管理自身的多步流程状态。
    - **交互**: 根据`step`状态渲染不同UI，模拟从需求输入到匹配结果的完整流程。

### 4.4. 需求池 (`/src/app/demand-pool/page.tsx`)

- **功能**: 需求发布、浏览、管理和匹配推荐。
- **State**:
  - `useState<boolean>` (`isRecDialogOpen`): 控制推荐对话框的显示。
  - `useState<Demand | null>` (`selectedDemand`): 存储单项推荐时选中的需求对象。
  - `useState<string[]>` (`selectedRows`): 存储批量推荐时选中的需求ID数组。
- **核心交互**:
  - **新增需求**: 点击"发布新需求"，打开`DemandFormDialog`，提交表单（模拟）。
  - **行选择**: (`admin`可见)
    - `Checkbox`的`onCheckedChange`事件触发`handleSelectRow`，更新`selectedRows`状态。
  - **批量推荐**: (`admin`可见)
    - 按钮的`disabled`状态与`selectedRows.length === 0`绑定。
    - `onClick`触发`handleBatchRecommendClick`，清空`selectedDemand`并打开推荐对话框。
  - **单项推荐**: (`admin`可见)
    - `onClick`触发`handleRecommendClick`，设置`selectedDemand`并打开推荐对话框。
- **子组件**:
  - **`RecommendationDialog`**:
    - **Props**: `demand`, `selectedDemands`, `open`, `onOpenChange`。
    - **State**:
      - `useState<boolean>` (`isLoading`): AI推荐加载状态。
      - `useState<RecommendCreativesOutput | null>` (`aiResults`): 存储AI推荐结果。
    - **逻辑**:
      - `handleAiRecommend`: 异步函数。
        1.  设置`isLoading = true`。
        2.  `await recommendCreatives({ demand, creatives })`。
        3.  将返回结果存入`aiResults`。
        4.  `catch`错误并显示`toast`。
        5.  `finally`块中设置`isLoading = false`。
      - **UI**: 根据`isLoading`和`aiResults`的状态，条件渲染“启动AI推荐”按钮、加载动画或结果列表。
      - **HTML修复**: 将`<p>`包裹`<Badge>`的地方修正为`<div>`，以避免hydration error。

### 4.5. 供应商中心 (`/src/app/suppliers/page.tsx`)

- **功能**: 供应商信息和产品的深度管理。
- **State**:
  - `useState<ProductService[]>` (`products`): 存储产品/服务列表。
  - `useState<SupplementaryField[]>` (`infoSupplementaryFields`): 存储公司基本信息的补充字段。
- **核心交互**:
  - **添加产品**: `addProduct`函数向`products`数组中添加一个新的、包含默认值的对象。
  - **更新产品**: `updateProduct`函数通过ID在`products`数组中找到并更新指定产品。此函数作为prop传递给`ProductServiceItem`。
  - **删除产品**: `removeProduct`函数通过ID从`products`数组中过滤掉指定产品。
- **子组件**:
  - **`ProductServiceItem`**:
    - **Props**: `product`, `onUpdate`, `onRemove`。
    - **逻辑**: 所有输入框的`onChange`事件都会创建一个新的产品对象，并调用`onUpdate`将更改传回父组件，遵循React的不可变状态原则。
    - **`SupplementaryFieldsManager`**: 在`ProductServiceItem`和页面根组件中复用，用于管理补充字段的增删改。
  - **`DataProcessor`**: 批量处理模块 (`/src/components/features/data-processor.tsx`)。
    - **功能**: 上传CSV，调用AI进行分析。
    - **交互**: `processData`函数调用`evaluateSellerData`流程，并在UI上展示结果。

---

## 5. 路由与文件重构记录

- `/demands/*` -> `/demand-pool`: 需求管理功能整合到需求池页面。
- `/permission-management` -> `/permissions`: 路由路径简化。
- `/supplier-onboarding` -> `/suppliers`: 路由路径简化。
- `/shopping-assistant` -> `/`: 核心功能设为应用根路径。
- `/components/app-shell.tsx` -> `/components/app-layout.tsx`: 组件重命名以更准确地反映其功能。
- 所有被移除的路由页面文件均已在文件系统中删除，以保持项目整洁。

---
**文档结束**
