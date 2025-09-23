# LLM 对接功能技术方案 (V1.0)

**日期**: 2025-08-26

## 1. 概述与目标

### 1.1. 功能目标

本方案旨在为 "AI 任务流平台" 构建一个统一、稳定、可扩展的大语言模型（LLM）对接层。其核心目标是让平台能够：

*   **支持多厂商**: 无缝对接全球主流的LLM提供商，包括但不限于Google, OpenAI, DeepSeek等。
*   **动态可配置**: 平台管理员可以通过后台界面，动态地添加、编辑、删除和测试与各个模型的API连接，而无需修改任何代码。
*   **稳定可靠**: 彻底解决此前因第三方SDK（如Genkit）与Next.js框架版本不兼容而导致的各类编译和运行时错误。
*   **统一调用接口**: 为平台所有上层AI业务（如：需求导航、元数据分析、任务派发）提供一个统一、简洁、标准的调用入口。

### 1.2. 核心策略：模型解耦与原生API调用

为实现上述目标，我们采取了“模型解耦与原生API调用”的核心技术策略。

*   **模型解耦**: 平台业务逻辑与具体的LLM实现完全分离。上层业务只关心“调用哪个模型ID”，而无需关心该模型来自哪个厂商、其API的具体格式是什么。
*   **原生API调用**: 我们放弃了所有可能带来兼容性问题的第三方SDK，回归最基础、最稳定的`fetch` API。我们自建了一个轻量级的“API网关”，它负责将平台内部的标准请求，动态翻译成目标厂商指定的原生API请求格式。

此策略让我们拥有了一个类似“LiteLLM”的、自托管的、完全可控的请求路由和适配层，保证了长期的技术稳定性和灵活性。

---

## 2. 架构设计

本功能的设计贯穿了前端UI、后端流程和数据库，形成了一个完整的数据和逻辑闭环。

### 2.1. 数据模型与来源

#### a. `llm_connections` 集合 (Firestore)

这是所有LLM连接配置的核心存储。每个文档代表一个可被平台调用的具体模型实例。

*   **集合路径**: `firestore_root/llm_connections/{connection_id}`
*   **关键字段**:
    *   `provider` (string): 厂商标识，如 "Google", "OpenAI"。**用于请求路由**。
    *   `modelName` (string): **必须是厂商官方指定的、可通过API调用的确切模型ID**，如 "gemini-1.5-pro-latest", "gpt-4o"。这是保证API调用成功的关键。
    *   `apiKey` (string): 用户提供的该模型的API密钥。
    *   `scope` (enum): "通用" | "专属"。决定该模型是全平台可用还是特定租户可用。
    *   `priority` (number): 1-100。数字越小，优先级越高。用于平台内部流程自动选择默认模型。
    *   `status` (enum): "活跃" | "已禁用"。控制该连接是否可用。
    *   `category` (enum): "文本", "图像"等。用于分类。

#### b. `prompts` 集合 (Firestore) - 新增关联

为了实现提示词与模型的绑定，`prompts`集合将增加字段。

*   **集合路径**: `firestore_root/prompts/{prompt_id}`
*   **新增关键字段**:
    *   `modelId` (string, optional): 关联的`llm_connections`文档ID。如果为空，则使用系统默认模型。
    *   `priority` (number, optional): 特定于此提示词的调用优先级。

#### c. `SUPPORTED_PROVIDERS` (后端硬编码)

这是一个定义在后端流程`admin-management-flows.ts`中的静态常量，是平台**唯一权威的、支持的厂商及其模型列表**。

*   **目的**: 从源头上保证数据配置的准确性，杜绝管理员手动输入无效模型名称的可能性。
*   **结构**:
    ```typescript
    const SUPPORTED_PROVIDERS: LlmProvider[] = [
        { id: 'google', providerName: 'Google', models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'] },
        { id: 'deepseek', providerName: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
        { id: 'openai', providerName: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    ];
    ```
*   **数据流**: 前端通过调用`getPlatformAssets`流程来获取这份列表，并据此动态生成“厂商”和“模型名称”的级联下拉框。

### 2.2. 核心流程：统一API网关 (`executePrompt`)

这是整个LLM对接功能的心脏，位于`src/ai/flows/prompt-execution-flow.ts`。

**工作流程**:

1.  **接收标准输入**: 函数接收一个平台内部标准化的请求对象`PromptExecutionInput`，该对象包含`modelId`, `messages`数组, `temperature`等。
2.  **查询模型配置**: 使用`modelId`从Firestore的`llm_connections`集合中获取该模型的完整配置，包括`provider`, `modelName`, 和`apiKey`。
3.  **分离系统提示词**: 从`messages`数组中找出并分离出`{ role: 'system', ... }`的消息。这是确保后续请求体格式正确的关键一步。
4.  **请求路由与适配 (核心)**: 进入一个`switch (provider.toLowerCase())`分支，根据厂商执行不同的请求体构建逻辑：
    *   **Case 'google'**: 构建符合Google AI `generateContent` API格式的请求。将`system`消息放入独立的`systemInstruction`字段，将其他消息转换为`contents`数组。
    *   **Case 'anthropic'**: (未来扩展) 构建符合Claude API格式的请求。
    *   **Default (OpenAI, DeepSeek等兼容API)**: 构建符合OpenAI `chat/completions` API格式的请求。最关键的一步是：**将分离出的`system`消息重新作为第一条消息，插入到`messages`数组中**。这是确保这些API能够正确理解系统指令的标准做法。
5.  **发送原生请求**: 使用`fetch` API，带上构建好的`requestUrl`, `requestHeaders`, 和`requestBody`，向目标厂商的API端点发送请求。
6.  **结果解析与返回**: 根据不同厂商的响应体结构，从返回的JSON中精准提取出模型生成的文本内容，并将其作为标准化的`PromptExecutionOutput`对象返回。

### 2.3. 前端交互 (管理员仪表盘)

前端组件`AdminDashboard` (`src/components/app/admin-dashboard.tsx`)负责提供用户界面。

1.  **动态表单**: “添加/编辑LLM连接”的表单(`LlmConnectionForm`)中的“厂商”和“模型名称”是级联的下拉框，其数据源来自后端`getPlatformAssets`返回的`SUPPORTED_PROVIDERS`列表。
2.  **测试调用**: 点击“测试连接”按钮会触发`testLlmConnection`后端流程。
3.  **`testLlmConnection`流程**:
    *   它接收一个`modelId`。
    *   它内部构造一个包含`system`和`user`消息的标准`messages`数组。
    *   它调用核心的`executePrompt`网关函数。
    *   它捕获`executePrompt`的成功或失败结果，并返回给前端一个包含成功信息或详细错误信息的对象，前端则用Toast组件将其展示出来。
4.  **提示词绑定模型 (新增)**:
    *   在“编辑提示词”弹窗 (`PromptEditDialog`) 中，新增一个“绑定模型”的下拉选择框。
    *   该下拉框的数据源为所有状态为“活跃”的 `llm_connections`。
    *   用户保存后，`prompts`文档的`modelId`字段将被更新。

---

## 3. 关键代码实现

#### a. API网关 `executePrompt` (节选)

```typescript
// file: src/ai/flows/prompt-execution-flow.ts

// --- Isolate the system prompt and the rest of the conversation ---
const systemPromptMessage = messages.find(m => m.role === 'system');
const conversationMessages = messages.filter(m => m.role !== 'system');

// This is the model-agnostic adapter
switch (provider.toLowerCase()) {
    case 'google':
        requestUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
        const contents = conversationMessages.map(m => ({ /* ... Google format ... */ }));
        requestBody = { contents, /* ... */ };
        if (systemPromptMessage) {
             requestBody.systemInstruction = { /* ... Google system format ... */ };
        }
        break;
    
    // ... other cases like 'anthropic'
    
    default: // OpenAI, DeepSeek, and other compatible APIs
         requestUrl = `${apiBaseUrl}/chat/completions`;
         requestHeaders['Authorization'] = `Bearer ${apiKey}`;
         
         // For OpenAI-compatible APIs, the standard way to provide a system prompt
         // is to make it the first message in the 'messages' array.
         const finalMessages = systemPromptMessage 
            ? [systemPromptMessage, ...conversationMessages] 
            : conversationMessages;

         requestBody = {
            model: modelName,
            messages: finalMessages,
            // ... other params
         };
         break;
}

// ... fetch call and response parsing
```

#### b. 前端表单 `LlmConnectionForm` (关键部分)

```tsx
// file: src/components/app/admin-dashboard.tsx

const selectedProviderName = form.watch("provider");
const availableModels = useMemo(() => {
    const selectedProvider = providers.find(p => p.providerName === selectedProviderName);
    return selectedProvider ? selectedProvider.models : [];
}, [selectedProviderName, providers]);

// ... in JSX ...
<FormField name="provider" render={/* ... Renders provider dropdown ... */} />

<FormField
    name="modelName"
    render={({ field }) => (
        <FormItem>
            <FormLabel>模型名称</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedProviderName}>
                <SelectContent>
                    {availableModels.map(model => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <FormMessage />
        </FormItem>
    )}
/>
```

---

## 4. 功能总结

*   **多厂商LLM支持**: 可通过后台配置，无代码修改地接入任何提供原生API的LLM厂商。
*   **配置即服务**: 管理员可在UI界面完成模型的添加、编辑、删除和状态切换。
*   **连接健康检查**: 提供一键“测试连接”功能，实时验证API Key和网络配置的有效性。
*   **统一调用接口**: 平台所有需要AI能力的地方，都通过调用`executePrompt({ modelId, messages, ... })`这一个函数来完成，极大简化了上层业务开发。
*   **提示词与模型绑定 (新增)**: 允许在创建或编辑提示词时，从可用模型库中为其指定一个执行模型和调用优先级。
*   **优先级与默认模型**: 通过`priority`字段，实现了平台级默认模型的智能选择机制。
*   **优雅降级**: 如果没有配置可用的模型，或API调用失败，流程会抛出明确、友好的错误信息，便于前端捕获并提示用户。
*   **高可维护性**: 模型支持列表集中在后端管理，便于统一更新和维护。

此方案为平台构建了一个极其稳固和灵活的AI能力底座，是整个项目能够稳定运行并轻松扩展的基石。
