
# AI智能匹配平台 - 技术设计与功能规格说明书 (V2.0 Final)

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
- **`Button`**: `rounded-md`。`default` variant 使用 `bg-primary`。新增 `accent` variant 以使用 `bg-accent`。
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
- `/src/lib/` 存放工具函数 (`cn`)、Firebase配置 (`firebase`) 和核心类型定义 (`types`)。
- `/src/hooks/` 存放自定义Hooks (如 `use-toast`)。

### 3.2. 状态管理 (`src/store/auth.ts`)

- **技术栈**: Zustand with `persist` middleware.
- **`useAuthStore`**: 全局状态存储，负责管理用户认证信息。
  - **State**:
    - `role: Role | null`: 当前用户角色 (`'admin'`, `'supplier'`, `'user'`, `'creator'`)。
    - `user: User | null`: 当前用户信息对象 (`{ id, name, email, role, avatar }`)。
  - **Actions**:
    - `login(user)`: 模拟登录，根据传入的`user`对象设置`user`和`role`状态。
    - `logout()`: 清除用户状态，重置为`null`。
  - **持久化**: 登录状态被保存在`localStorage`中，实现会话保持。

### 3.3. 数据库 (Firestore)

- **配置**: `src/lib/firebase.ts`
- **集合 (Collections)**:
  - `products`: 存储所有产品/服务信息。其结构遵循 `ProductService` 类型 (`src/lib/types.ts`)。
  - `demands`: 存储所有用户发布的需求。其结构遵循 `Demand` 类型 (`src/lib/types.ts`)。
  - `suppliers`: 存储由批量上传功能分析并存入的供应商信息。

### 3.4. AI流程 (`src/ai/`)

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
  - 每个卡片代表一个角色，包含头像、名称、描述和图标。
- **交互**:
  - 点击任一卡片下的“登录”按钮。
  - **Action**: 调用 `useAuthStore` 的 `login(user)` 方法，传入该角色对应的预设用户信息。
  - **Navigation**: 使用 Next.js `useRouter` 跳转到应用首页 (`/`)。

### 4.2. 应用布局 (`/src/components/app-layout.tsx`)

- **功能**: 包裹所有页面的主布局，负责渲染侧边栏、主内容区，并处理认证逻辑。
- **State**:
  - `const { role, user, logout } = useAuthStore()`: 订阅认证状态。
  - `const pathname = usePathname()`: 获取当前路由。
  - `const router = useRouter()`: 获取路由实例。
- **核心逻辑**:
  - **路由守卫**: 在`useEffect`中实现。如果组件已挂载 (`mounted`) 且 `role` 为`null`（未登录），则调用 `router.replace('/login')` 强制跳转到登录页。此逻辑避免了在渲染期间直接调用路由方法，解决了“setState in render”的错误。
  - **动态导航**: `navItems` 数组根据当前`role`被过滤，以生成当前用户可见的导航菜单项。
- **组件**:
  - `SidebarProvider`: 包裹所有内容，提供侧边栏状态的Context。
  - `Sidebar`:
    - `SidebarHeader`: 显示Logo和应用名称。
    - `SidebarContent`: 遍历过滤后的`navItems`渲染`SidebarMenuItem`。
    - `SidebarFooter`: 显示包含用户姓名和邮箱的下拉菜单，提供“退出登录”操作。
  - `SidebarInset`: 主内容区域。

### 4.3. AI购物助手 (`/src/app/page.tsx` -> `ShoppingAssistant`)

- **文件**: `/src/components/features/shopping-assistant.tsx`
- **功能**: 用户与AI交互的核心界面，获取个性化商品推荐。
- **数据获取**: 在`useEffect`中，从Firestore的`products`集合加载所有商品数据到`products`状态中。
- **表单 (`react-hook-form` + `zod`)**:
  - `description: string`: 用户输入的文本。
  - `image: File?`: 用户上传的图片文件。
- **核心交互 (`onSubmit`)**:
  1.  **准备数据**: 将用户输入的文本和图片（转换为Data URI）准备好。
  2.  **更新UI**: 将用户消息和加载状态骨架屏添加到`messages`数组中，清空表单。
  3.  **调用AI Flow (1 - 画像)**: `await generateUserProfile({ description, photoDataUri })`。返回结构化的用户画像。
  4.  **调用AI Flow (2 - 推荐)**: `await getProductRecommendations({ userProfile: profile, products: allProductsFromDB, photoDataUri })`。将画像和从数据库加载的**全部产品**传给AI。
  5.  **更新UI**: AI返回推荐的产品ID列表。前端根据ID从`products`状态中筛选出完整的产品对象，并用包含`profile`和推荐产品信息的AI消息替换加载状态。
  6.  **错误处理**: `try...catch`块捕获AI调用失败，并通过`toast`显示错误信息。
- **子组件**:
  - `UserMessage`: 显示用户发送的消息。
  - `AIMessage`: 显示AI的回复，内部分为`UserProfileDisplay`和`RecommendationsDisplay`。
  - `RecommendationsDisplay`: 以卡片形式展示推荐的商品，包含图片、名称、价格和“查看详情”、“立即购买”按钮。
  - `LoadingMessage`: 显示加载骨架屏。
  - `CustomServiceConnector`: 高端定制服务模块。点击按钮后，跳转到`/suppliers`页面。
  - `DemandPoolConnector`: 当AI返回结果后，对`user`角色可见，点击后跳转到`/demand-pool`页面。

### 4.4. 需求池 (`/src/app/demand-pool/page.tsx`)

- **功能**: 需求发布、浏览、管理和AI匹配推荐。
- **数据获取**: 在`useEffect`中，从Firestore的`demands`集合加载所有需求数据。
- **核心交互**:
  - **新增需求**: （功能简化）“发布新需求”按钮为静态展示。
  - **批量/单项推荐**: (`admin`可见)
    - 选中一个或多个需求后，点击“AI推荐”按钮，打开`RecommendationDialog`。
- **子组件**:
  - **`RecommendationDialog`**:
    - **数据获取**: 在对话框打开时，从Firestore的`products`集合加载所有产品作为“创意方”数据。
    - **AI调用**: 点击“启动AI推荐”后，调用`recommendCreatives`流程，将选中的需求和从数据库加载的**产品/创意方数据**传给AI。
    - **UI**: 根据加载状态和AI返回结果，渲染加载动画或推荐结果列表。结果以Accordion（手风琴）形式展示。

### 4.5. 供应商中心 (`/src/app/suppliers/page.tsx`)

- **功能**: 供应商信息和产品的深度管理。
- **数据获取/操作**:
  - **公司信息**: 从`useAuthStore`中获取当前登录用户的姓名和邮箱。
  - **产品列表**: 在`useEffect`中，从Firestore的`products`集合加载产品数据。
  - **产品增删改**: `addProduct`, `updateProduct`, `removeProduct`函数直接调用Firestore API (`addDoc`, `updateDoc`, `deleteDoc`) 对`products`集合进行实时操作。
- **子组件**:
  - **`ProductServiceItem`**:
    - **状态同步**: 对产品信息的任何修改（包括补充字段）都会通过`onUpdate`回调，将**完整的、更新后的产品对象**传回父组件，由父组件写入Firestore。
  - **`DataProcessor`**: 批量处理模块。
    - **功能**: 上传CSV，调用`evaluateSellerData` AI流程进行分析。
    - **数据写入**: AI流程返回分析结果后，`saveData`函数通过`writeBatch`将这些处理过的供应商数据**写入Firestore的`suppliers`集合**。

### 4.6. 创意者工作台 (`/src/app/creator-workbench/page.tsx`)

- **功能**: 为创意者提供任务发现和AI创作工具。
- **访问控制**: 页面在加载时检查用户角色，非`creator`角色将被拒绝访问。
- **子组件**:
  - **`TasksTab`**: 在`useEffect`中，通过Firestore查询`query(collection(db, 'demands'), where("status", "==", "开放中"))`，获取所有**开放中的真实需求**，并通过`DemandList`组件展示。
  - **`CreationForm`**: 提供表单调用`generate3dModel` AI流程，并将返回的图片（Data URI）进行预览。
  - **`Submissions Tab`**: 静态占位符，显示“功能开发中”。

---
**文档结束**
