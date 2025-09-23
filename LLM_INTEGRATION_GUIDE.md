# LLM 对接功能技术方案 (V2.0 Final)

**日期**: 2025-08-26

## 1. 概述与目标

### 1.1. 功能目标

本方案为 "AI 任务流平台" 构建一个统一、稳定、可扩展的大语言模型（LLM）对接层。其核心目标是让平台能够：

*   **支持多厂商**: 无缝对接全球主流的LLM提供商，包括但不限于Google, OpenAI, Anthropic, DeepSeek等。
*   **动态可配置**: 平台管理员可以通过独立的后台界面 (`/admin-dashboard`)，动态地添加、编辑、删除和测试与各个模型的API连接，而无需修改任何代码。
*   **稳定可靠**: 彻底解决因第三方SDK与Next.js框架版本不兼容而导致的各类编译和运行时错误。
*   **统一调用接口**: 为平台所有上层AI业务提供一个统一、简洁、标准的调用入口 (`executePrompt`)，该入口支持按模型ID调用，也支持按提示词KEY调用。
*   **提示词与模型绑定**: 允许在提示词库中，为每个提示词明确指定一个执行模型和调用优先级。

### 1.2. 核心策略：模型解耦与原生API调用

我们采取了“模型解耦与原生API调用”的核心技术策略。

*   **模型解耦**: 上层业务只关心“调用哪个模型ID或提示词Key”，而无需关心该模型来自哪个厂商、其API的具体格式是什么。
*   **原生API调用**: 我们放弃了所有可能带来兼容性问题的第三方SDK，回归最基础、最稳定的`fetch` API。我们自建了一个轻量级的“API网关” (`executePrompt` flow)，它负责将平台内部的标准请求，动态翻译成目标厂商指定的原生API请求格式。

---

## 2. 架构设计

本功能的设计贯穿了前端UI、后端流程和数据库，形成了一个完整的数据和逻辑闭环。

### 2.1. 数据模型与来源

#### a. `llm_connections` 集合 (Firestore)

这是所有LLM连接配置的核心存储。每个文档代表一个可被平台调用的具体模型实例。

*   **集合路径**: `firestore_root/llm_connections/{connection_id}`
*   **关键字段**: `provider`, `modelName`, `apiKey`, `scope`, `priority`, `status`, `category`。

#### b. `prompts` 集合 (Firestore) - 关键关联

`prompts`集合通过`modelId`字段与`llm_connections`集合建立关联。

*   **集合路径**: `firestore_root/prompts/{prompt_id}`
*   **关键字段**:
    *   `promptKey` (string): **(核心)** 唯一的、人类可读的业务调用KEY，是提示词的“调用句柄”，用于保护提示词内容。
    *   `modelId` (string, optional): 关联的`llm_connections`文档ID。如果为空，则使用系统默认模型。
    *   `priority` (number, optional): 特定于此提示词的调用优先级。

#### c. `SUPPORTED_PROVIDERS` (后端硬编码)

这是一个定义在后端流程`admin-management-flows.ts`中的静态常量，是平台**唯一权威的、支持的厂商及其模型列表**。

*   **目的**: 为前端提供预设选项，从源头上保证数据配置的准确性，同时支持管理员输入自定义值。
*   **数据流**: 前端通过调用`getPlatformAssets`流程来获取这份列表，并据此动态生成“厂商”和“模型名称”的级联`Combobox`组件。

### 2.2. 核心流程：统一API网关 (`executePrompt`)

这是整个LLM对接功能的心脏，位于`src/ai/flows/prompt-execution-flow.ts`。

**工作流程**:

1.  **接收标准输入**: 函数接收一个平台内部标准化的请求对象`PromptExecutionInput`，该对象包含`modelId`或`promptKey`, `messages`数组, `temperature`等。
2.  **查询配置 (核心路由)**:
    *   如果提供了 `promptKey`，则优先从`prompts`集合中查找对应的提示词文档，获取其 `content` 和绑定的 `modelId`。
    *   如果没有提供 `promptKey`，则直接使用传入的 `modelId`。
3.  **获取LLM连接**: 根据上一步确定的 `modelId`，从`llm_connections`集合中获取完整的连接配置（API Key, Provider等）。
4.  **请求适配**: 进入一个`switch (provider.toLowerCase())`分支，根据厂商执行不同的请求体构建逻辑（例如，适配Google AI的`generateContent`或OpenAI的`chat/completions` API）。如果使用了 `promptKey`，其 `content` 会被用作 `system` 角色的消息。
5.  **发送原生请求**: 使用`fetch` API，带上构建好的`requestUrl`, `requestHeaders`, 和`requestBody`，向目标厂商的API端点发送请求。
6.  **结果解析与返回**: 根据不同厂商的响应体结构，从返回的JSON中精准提取出模型生成的文本内容，并将其作为标准化的`PromptExecutionOutput`对象返回。

### 2.3. 前端交互

#### a. 管理后台 (`/src/app/admin-dashboard/page.tsx`)

这是`admin`角色的专属页面，用于管理LLM连接。

1.  **动态表单 (`LlmConnectionForm`)**: “添加/编辑LLM连接”的表单中的“厂商”、“模型名称”、“范围”、“类别”均为`Combobox`组件，它们的数据源部分来自后端`getPlatformAssets`返回的`SUPPORTED_PROVIDERS`列表，同时也支持直接输入自定义值。
2.  **测试调用**: 点击“可用性测试”按钮会触发`testLlmConnection`后端流程。该流程内部调用`executePrompt`网关函数，并捕获结果，通过Toast向管理员展示成功或失败信息。

#### b. 提示词管理 (`/src/app/prompt-management/page.tsx`)

`admin`和`creator`角色可访问此页面。

1.  **提示词列表**: 展示提示词名称、唯一的`promptKey`、状态、以及绑定的模型名称。
2.  **提示词编辑弹窗 (`PromptEditDialog`)**:
    *   **模型绑定**: 提供“绑定模型”下拉框，数据源为所有状态为“活跃”的 `llm_connections`。
    *   **`promptKey`生成与显示**: 新增时自动生成，编辑时只读显示。
    *   **Base URL显示**: 为已创建的提示词显示完整的外部调用地址。
    *   **元提示词导入**: 一键导入预设的专业模板。
    *   **内容权限控制**: 非所有者和非管理员无法编辑提示词内容。

---

## 3. 功能总结

*   **多厂商LLM支持**: 可通过后台配置，无代码修改地接入任何提供原生API的LLM厂商。
*   **配置即服务**: 管理员可在独立的UI界面完成模型的添加、编辑、删除和状态切换。
*   **连接健康检查**: 提供一键“测试连接”功能，实时验证API Key和网络配置的有效性。
*   **统一调用接口**: 平台所有AI能力都通过调用`executePrompt`这一个函数来完成，支持按`modelId`或`promptKey`调用。
*   **提示词与模型绑定**: 允许在创建或编辑提示词时，为其指定一个执行模型和调用优先级。
*   **提示词知识产权保护**: 通过`promptKey`调用机制，保护了提示词内容不被非授权用户查看。
*   **高可维护性**: 模型支持列表集中在后端管理，便于统一更新和维护；所有配置均支持预设与自定义输入，兼顾易用性和扩展性。

此方案为平台构建了一个极其稳固和灵活的AI能力底座，是整个项目能够稳定运行并轻松扩展的基石。
