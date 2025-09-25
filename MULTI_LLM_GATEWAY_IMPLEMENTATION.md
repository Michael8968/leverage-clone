
# 自研模型无关API网关 - 技术实现方案 (V1.0)

**日期**: 2025-08-26
**作者**: AI 任务流平台开发团队

---

## 1. 概述

本文档详细阐述了在“AI织网平台”项目中成功应用的、用于管理和调用多个大型语言模型（LLM）API的**自研、模型无关的API网关**技术方案。此方案旨在替代如 LiteLLM 等第三方代理，以获得更高的稳定性、灵活性和与 Next.js App Router 的最佳兼容性。

### 1.1. 解决的核心问题

- **兼容性问题**: 第三方AI SDK（如Genkit）与`next@14.x`存在不兼容问题，导致构建失败和运行时错误。
- **灵活性受限**: 依赖第三方库会限制我们快速接入新兴或小众LLM的能力。
- **配置黑盒**: 第三方代理的配置和路由逻辑可能不够透明，难以调试。

### 1.2. 设计目标

- **模型无关 (Model-Agnostic)**: 能够通过数据库配置，动态支持任何提供原生API的LLM，无需修改前端代码。
- **稳定可靠**: 不引入额外的第三方依赖，减少潜在的冲突和不稳定性。
- **易于扩展**: 添加对新LLM的支持应尽可能简单，仅需在后端增添少量适配代码。
- **配置驱动**: 所有的模型信息（包括API Key）均由数据库集中管理，而不是硬编码在代码中。

---

## 2. 核心技术架构

本方案的核心架构由三个部分组成：

1.  **数据模型 (Firestore)**: 一个用于存储LLM连接配置的数据库集合。
2.  **API网关 (Next.js Server Action)**: 一个统一的后端函数，负责接收标准化的请求，并将其转换为特定厂商的API调用。
3.  **调用端 (前端组件)**: 任何需要调用AI的前端组件，都通过统一的接口与API网关交互。

![架构图](https://placehold.co/800x300.png?text=架构图：前端组件+->+API网关+(Server+Action)+->+Firestore+(获取配置)+->+原生LLM+API)

---

## 3. 数据模型设计 (Firestore)

我们在Firestore中创建了一个名为`llm_connections`的集合，用于存储所有LLM的配置信息。每个文档代表一个可用的模型连接。

### 3.1. `llm_connections` 集合的文档结构

```typescript
// 参考: src/lib/data-types.ts -> LlmConnectionSchema

{
  // id: Firestore 自动生成的文档ID
  "provider": "google", // (必填) 厂商唯一标识，小写，如 "google", "openai", "deepseek"
  "modelName": "gemini-1.5-pro-latest", // (必填) 模型官方指定的、可被API调用的确切ID
  "apiKey": "AIzaSy... (加密存储)", // (必填) 该模型对应的API Key
  "scope": "通用", // (必填) "通用" 或 "专属", 用于区分平台级模型和租户私有模型
  "status": "活跃", // (必填) "活跃" 或 "已禁用", 用于控制模型是否可用
  "category": "多模态", // (推荐) 模型分类，如 "文本", "图像", "多模态"
  "priority": 10, // (推荐) 优先级, 数字越小越高 (1-100)，用于自动选择默认模型
  "createdAt": Timestamp // 创建时间
}
```

### 3.2. 关键字段说明

- **`provider`**: 这是我们API网关进行逻辑切换（`switch...case`）的关键。它必须是一个预定义的、在后端代码中有对应处理逻辑的字符串。
- **`modelName`**: **至关重要**。这里存储的**必须**是LLM厂商官方指定的API模型ID，例如 `gpt-4o`, `deepseek-chat`。任何别名或自定义名称都会导致API调用失败。
- **`apiKey`**: 在生产环境中，此字段应使用Firebase Secret Manager或类似服务进行加密和安全管理。

---

## 4. API网关实现 (`prompt-execution-flow.ts`)

这是整个方案的核心。我们创建了一个名为`executePrompt`的Next.js Server Action，它充当了所有AI调用的统一入口。

### 4.1. 关键代码 (`src/ai/flows/prompt-execution-flow.ts`)

```typescript
'use server';

import admin from '@/lib/firebase-admin';
import type { PromptExecutionInput, PromptExecutionOutput, Message } from '@/lib/data-types';

// 1. 在代码中硬编码各厂商的API基础URL
const providerEndpoints: Record<string, string> = {
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
    openai: 'https://api.openai.com/v1',
    deepseek: 'https://api.deepseek.com/v1',
    // ... 未来可在此处添加更多厂商
};

// 2. 主函数：接收一个标准化的输入
export async function executePrompt(input: PromptExecutionInput): Promise<PromptExecutionOutput> {
    
    // 3. 从Firestore获取模型配置
    const modelDetails = await getModelDetails(input.modelId);
    const { provider, modelName, apiKey, apiBaseUrl } = modelDetails;
    
    const { messages, temperature = 0.7, responseFormat } = input;
    
    let requestUrl = '';
    let requestBody: any;
    let requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    let responsePath: (string | number)[];
    
    // 4. (关键) 统一处理System Prompt
    const systemPromptMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // 5. (核心) 根据provider，动态构建特定厂商的请求
    switch (provider.toLowerCase()) {
        case 'google':
            requestUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
            requestBody = {
                contents: conversationMessages.map(m => ({
                    role: m.role === 'user' ? 'user' : 'model', // Google要求用'model'而非'assistant'
                    parts: [{ text: m.content }]
                })),
                generationConfig: { temperature },
            };
            if (systemPromptMessage) {
                 requestBody.systemInstruction = { parts: [{ text: systemPromptMessage.content }] };
            }
            if (responseFormat === 'json_object') {
                requestBody.generationConfig.responseMimeType = 'application/json';
            }
            responsePath = ['candidates', 0, 'content', 'parts', 0, 'text'];
            break;
        
        // 默认分支处理所有与OpenAI API格式兼容的厂商
        case 'openai':
        case 'deepseek':
        default: 
             requestUrl = `${apiBaseUrl}/chat/completions`;
             requestHeaders['Authorization'] = `Bearer ${apiKey}`;
             
             // 将system prompt作为第一条消息，这是OpenAI兼容API的标准做法
             const finalMessages = systemPromptMessage 
                ? [systemPromptMessage, ...conversationMessages] 
                : conversationMessages;

             requestBody = {
                model: modelName,
                messages: finalMessages,
                temperature,
             };
             if (responseFormat === 'json_object') {
                requestBody.response_format = { type: 'json_object' };
             }
             responsePath = ['choices', 0, 'message', 'content'];
             break;
    }

    // 6. 使用原生fetch发送请求并处理响应
    const response = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败，状态码 ${response.status}: ${errorText}`);
    }
      
    const responseData = await response.json();
      
    // 7. 根据预定义的路径，从复杂的响应体中提取出纯文本结果
    const responseText = responsePath.reduce((acc, key) => (acc as any)?.[key], responseData);

    if (typeof responseText !== 'string') {
        throw new Error(`未能从 ${provider} 的响应中提取文本。`);
    }
      
    return { response: responseText };
}

// 辅助函数: 从Firestore获取模型详情
async function getModelDetails(modelId: string) {
    const db = admin.firestore();
    const modelRef = db.collection('llm_connections').doc(modelId);
    const modelDoc = await modelRef.get();
    if (!modelDoc.exists) throw new Error(`无法找到ID为'${modelId}'的模型配置。`);
    
    const modelData = modelDoc.data();
    const apiBaseUrl = providerEndpoints[modelData.provider.toLowerCase()];
    if (!apiBaseUrl) throw new Error(`厂商'${modelData.provider}'的API地址未在系统中配置。`);

    return { ...modelData, apiBaseUrl };
}
```

### 4.2. 可用性连通性测试方案

我们在管理员后台实现了一个`testLlmConnection`流程，它提供了一种简单而有效的测试方法。

```typescript
// 文件: src/ai/flows/admin-management-flows.ts

export async function testLlmConnection(input: { id: string }): Promise<{ success: boolean; message: string }> {
    try {
        // 直接调用我们的API网关
        const result = await executePrompt({
            modelId: input.id, // 要测试的模型ID
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'This is a connection test. Please respond with a short confirmation message.' }
            ],
            temperature: 0.1,
        });
        const shortResponse = result.response.substring(0, 80);
        return { success: true, message: `连接成功，模型返回: "${shortResponse}..."` };
    } catch (error: any) {
        // 如果executePrompt中发生任何错误（如网络问题、4xx/5xx错误），都会被这里捕获
        return { success: false, message: `连接失败: ${error.message}` };
    }
}
```

这个测试覆盖了从数据库读取配置 -> 构建请求 -> API调用 -> 解析响应 的完整链路，能够有效地验证一个模型连接是否**端到端可用**。

---

## 5. 依赖库

本方案的核心优势在于其**极简的依赖**。

- **`firebase-admin`**: 用于在服务器端（Server Action）安全地访问Firestore数据库。
- **`next`**: 框架本身，我们利用其Server Action能力来构建后端逻辑。
- **`zod`**: 用于定义数据结构和进行严格的类型验证，保证了数据的健壮性。

**无需任何第三方AI SDK或代理库（如 `litellm`, `genkit`, `@google/generative-ai`等）。**

---

## 6. 如何复刻此方案到其他项目

1.  **复制数据库设计**: 在您的新项目中，使用相同的结构（见3.1节）在Firestore或其他数据库中创建一个用于存储LLM配置的表/集合。
2.  **复制代码文件**:
    *   将`src/ai/flows/prompt-execution-flow.ts`文件完整地复制到您的新项目中。
    *   根据需要，将`src/lib/data-types.ts`中的`PromptExecutionInputSchema`等相关类型定义也复制过去。
3.  **配置环境变量**: 确保您的项目环境（如`.env.local`）中设置了访问数据库所需的安全凭证（如Firebase Admin SDK的配置）。
4.  **在前端调用**: 在您的前端组件中，通过`import`导入`executePrompt`函数，并像调用一个普通的异步函数一样使用它。

**示例调用**:
```jsx
// In a React component
import { executePrompt } from './path/to/prompt-execution-flow';

async function handleGenerate() {
    const result = await executePrompt({
        modelId: "your-model-id-from-database", // e.g., an ID representing gpt-4o
        messages: [{ role: 'user', content: '你好，世界！' }],
        temperature: 0.7
    });
    console.log(result.response);
}
```

通过以上步骤，您可以轻松地将这套轻量、高效且极易扩展的多LLM管理方案集成到任何基于Next.js的项目中。
