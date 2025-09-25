# **自研模型无关API网关 - 技术实现方案 (V2.2 Final)**

**日期**: 2024年8月19日
**作者**: AI 任务流平台开发团队

---

## 1. 概述

本文档详细阐述了在“AI织网平台”项目中应用的、用于管理和调用多个大型语言模型（LLM）API的**自研、模型无关的API网关**技术方案。此方案的核心策略是**“原生调用为主，代理回退为辅”**，以获得最高的灵活性和稳定性。

### 1.1. 设计目标

- **模型无关 (Model-Agnostic)**: 通过数据库配置，动态支持任何提供原生API或与OpenAI API兼容的LLM。
- **稳定可靠**: 核心逻辑不引入额外的第三方AI SDK，减少潜在冲突。
- **易于扩展**: 添加新LLM仅需在数据库和后端配置中进行少量修改。
- **配置驱动**: 所有模型信息（API Key, Provider, Base URL）均由数据库和后端配置集中管理。

---

## 2. 核心技术架构

架构由三部分组成：
1.  **数据模型 (Firestore)**: `llm_connections` 集合存储LLM连接配置。
2.  **后端配置 (`admin-management-flows.ts`)**: 一个硬编码的 `PLATFORM_ASSETS` 常量，用于定义每个`provider`的`apiBaseUrl`。
3.  **API网关 (`executePrompt` Flow)**: 一个统一的后端流程，负责将标准化请求转换为特定厂商的API调用，并支持代理模式。

---

## 3. 数据与配置

### 3.1. `llm_connections` 集合 (Firestore)
- **`provider`**: 关键字段。必须是后端`PLATFORM_ASSETS`中已定义的厂商标识（如 `Google`, `OpenAI`, `LiteLLM`）。

### 3.2. `PLATFORM_ASSETS` (后端配置)
这是在 `src/ai/flows/admin-management-flows.ts` 中定义的一个常量，是实现动态调用的核心。

```typescript
// src/ai/flows/admin-management-flows.ts

const PLATFORM_ASSETS = {
    providers: [
        { providerName: "Google", ..., apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models" },
        { providerName: "OpenAI", ..., apiBaseUrl: "https://api.openai.com/v1" },
        { providerName: "DeepSeek", ..., apiBaseUrl: "https://api.deepseek.com/v1" },
        { 
            providerName: "LiteLLM", // 代理提供商
            models: ["groq/llama3-70b-8192", ...], 
            apiBaseUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000/v1" 
        },
    ]
};
```

---

## 4. API网关实现 (`executePrompt`)

`executePrompt` 流程的核心逻辑是根据 `provider` 字段智能选择调用路径。

### 4.1. 关键代码 (`src/ai/flows/prompt-execution-flow.ts`)

```typescript
// ... (获取connection和providerInfo的逻辑)

// (核心) 根据provider，动态构建特定厂商的请求
switch (provider.toLowerCase()) {
    case 'google':
        // ... (处理原生Google API的请求体和URL)
        break;
    
    // 默认分支处理所有与OpenAI API格式兼容的厂商及代理
    case 'openai':
    case 'deepseek':
    case 'litellm':
    default: 
         requestUrl = `${apiBaseUrl}/chat/completions`;
         requestHeaders['Authorization'] = `Bearer ${apiKey}`;
         // ... (构建OpenAI兼容的请求体)
         break;
}

// ... (使用原生fetch发送请求并处理响应)
```

### 4.2. 可用性连通性测试方案

管理员后台的 `testLlmConnection` 流程无需任何修改。它通过直接调用 `executePrompt`，自动覆盖了所有调用路径：
- 如果测试的连接 `provider` 是 `Google`，`executePrompt` 会走原生调用路径。
- 如果测试的连接 `provider` 是 `LiteLLM` 或任何其他未明确定义的厂商，`executePrompt` 会自动走 `default` 的代理调用路径。

这确保了“可用性测试”能够端到端地验证任何一种类型的模型连接。

---

## 5. 总结

本方案通过将原生调用和代理调用相结合，提供了一个极其灵活和健壮的多LLM管理和路由系统。管理员只需在数据库中正确配置 `provider` 字段，系统即可自动选择最高效、最合适的调用方式，实现了真正的“模型无关”架构。
