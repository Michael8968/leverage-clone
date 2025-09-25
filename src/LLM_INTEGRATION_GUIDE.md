# LLM 对接功能技术方案 (V2.2 Final)

**日期**: 2025-08-28

## 1. 概述与目标

### 1.1. 功能目标

本方案为 "AI 任务流平台" 构建一个统一、稳定、可扩展的大语言模型（LLM）对接层。其核心目标是让平台能够：

*   **支持多厂商**: 无缝对接全球主流的LLM提供商。
*   **动态可配置**: 管理员可通过后台 (`/admin-dashboard`)，动态地添加、编辑、删除和测试模型API连接，无需修改代码。
*   **稳定可靠**: 实现原生调用与第三方代理（如LiteLLM）的智能切换，确保系统在任何情况下都具备高可用性。
*   **统一调用接口**: 为所有上层AI业务提供统一、简洁的调用入口 (`executePrompt`)。
*   **提示词与模型绑定**: 允许在提示词库中为每个提示词指定执行模型和调用优先级。
*   **场景化配置 (新增)**: 允许将业务场景（如“聊天助理”）与特定的提示词（`promptKey`）进行绑定，并可增加**时间维度**和**用户维度**的生效规则，实现AI行为的最高优先级配置。

### 1.2. 核心策略：原生调用与代理回退相结合

我们采取了“**原生调用为主，代理回退为辅**”的核心技术策略，以实现高可用性和无限扩展性。

*   **原生调用 (默认)**: 对于Genkit原生支持的厂商（如Google, OpenAI等），系统将直接通过`ai.generate()`进行调用，以获得最佳性能和最低延迟。
*   **代理回退**: 对于Genkit暂未支持的厂商，或在原生接口出现故障时作为备用方案，系统支持通过一个统一的LLM代理（如LiteLLM）进行调用。这极大地扩展了平台可接入的模型范围，因为我们无需为每一个大模型都构建一个独立的接口程序。
*   **配置驱动**: 采用哪种调用方式，完全由管理员在“LLM对接”后台的配置决定，无需修改任何代码。

---

## 2. 架构设计

### 2.1. 数据模型与来源

#### a. `llm_connections` 集合 (Firestore)
所有LLM连接配置的核心存储。**`provider`字段是决定调用路径的关键**。

#### b. `prompts` 集合 (Firestore)
`prompts`集合通过`modelId`字段与`llm_connections`集合建立关联。

#### c. `ai_scenarios` 集合 (Firestore, 升级)
这是实现“场景化配置”的核心。它建立了业务场景和提示词之间的映射关系。
*   **集合路径**: `firestore_root/ai_scenarios/{scenario_id}`
*   **文档ID (`scenario_id`)**: 一个代表业务场景的、硬编码在代码中的唯一字符串（例如: `chat-assistant`）。
*   **关键字段**:
    *   `name` (string): 场景的业务名称。
    *   `description` (string): 场景的功能描述。
    *   `configuredPromptKey` (string): 绑定的 `prompts` 集合中的 `promptKey`。
    *   `repetition` (`'none' | 'daily' | 'weekly'`, 可选): 重复策略。
    *   `daysOfWeek` (`Array<string>`, 可选): 当 `repetition` 为 `'weekly'` 时，存储选中的星期 (`mon`, `tue`, ...)。
    *   `startTime`, `endTime` (`string`, 可选): 当启用重复策略时，存储 `HH:mm` 格式的时间窗口。
    *   `startsAt`, `expiresAt` (`Timestamp`, 可选): 当 `repetition` 为 `'none'` 时，定义绝对的生效和失效时间。
    *   `targetUserRoles` (`Object`, 可选): 目标用户角色及星级。键为角色名，值为星级数组。例如 `{ "creator": [8, 9, 10] }`。
    *   `ruleLogic` (`'and' | 'or'`, 可选): "时间"与"用户"两个维度规则的组合逻辑，默认为 `'and'`。

#### d. `SUPPORTED_PROVIDERS` (后端硬编码)
平台唯一权威的、支持的厂商及其模型列表，用于前端`Combobox`的预设选项。

### 2.2. 核心流程：统一API网关 (`executePrompt`)

这是整个LLM对接功能的心脏，位于`src/ai/flows/prompt-execution-flow.ts`。它实现了智能的双路径执行逻辑。

**工作流程 (已升级)**:

1.  **接收标准输入**: 函数接收`PromptExecutionInput`对象，包含可选的`scenario`和`userId`字段。
2.  **查询配置 (核心路由)**:
    *   **第一优先级：场景查询**: 如果提供了 `scenario`，则**首先**从`ai_scenarios`集合中查找对应的文档，并根据`userId`和当前时间，严格校验文档中定义的所有高级规则。如果规则满足，则该文档配置的`configuredPromptKey`将成为本次调用的最终执行目标。
    *   **第二优先级：提示词Key**: 如果没有场景覆盖，且提供了 `promptKey`，则从`prompts`集合中查找对应的提示词文档，获取其 `content` 和绑定的 `modelId`。
    *   **第三优先级：模型ID**: 如果以上两者都未提供，则直接使用传入的 `modelId`进行调用。
3.  **获取LLM连接**: 根据上一步确定的 `modelId`，从`llm_connections`集合中获取完整的连接配置，包括关键的`provider`字段。
4.  **智能路径选择 (新增)**:
    *   **路径A (原生)**: 如果`provider`是Genkit原生支持的厂商之一（如 `google`, `openai`），流程将直接调用 `ai.generate()`。
    *   **路径B (代理)**: 如果`provider`是一个自定义的代理名称（如 `LiteLLM-Proxy`），流程将自动切换到`fetch`模式，将请求发送到在`.env`文件中配置的代理服务器地址。
5.  **请求发送与结果返回**: 根据选择的路径执行调用，并解析返回结果，输出标准化的`PromptExecutionOutput`对象。

### 2.3. 前端交互

#### a. 业务流程调用 (例如: `testLlmConnection`)
现在，`testLlmConnection`的实现非常简单，它只需要调用统一的`executePrompt`网关即可。它无需关心目标模型是原生调用还是通过代理调用，**可用性测试只检查网络连接是否通畅**。

```typescript
// 示例：testLlmConnection 的新实现
const result = await executePrompt({
    modelId: 'some-model-id-from-frontend',
    messages: [{ role: 'user', content: 'Hello' }], // 一个简单的测试消息
});
```
这种方式确保了测试逻辑的统一性和简单性。

#### b. AI场景配置页面 (`/ai-scenario-config`)
这是一个专为`admin`角色设计的新页面，用于管理`ai_scenarios`集合。
*   **功能**: 列出平台所有可配置的AI场景，并允许管理员为每个场景选择并绑定一个已存在的提示词（`promptKey`）。
*   **高级配置 (新)**: 在编辑弹窗中，通过复选框、时间选择器和日历控件，为配置添加复杂的“时间维度”和“用户维度”规则。

---

## 3. 功能总结

*   **高可用性与弹性**: 通过“原生+代理”的双路径设计，确保了在Genkit原生服务不可用时，可通过配置快速切换到备用代理，保证业务连续性。
*   **无限扩展性**: 借助LiteLLM等代理工具，平台可以轻松集成任何提供API的大模型，不再受限于Genkit原生支持的范围。
*   **动态可配置**: 管理员可在UI界面动态调整模型的调用方式（原生或代理）、优先级和绑定关系，无需修改任何代码。
*   **统一调用接口**: 平台所有AI能力都通过`executePrompt`这一个函数完成，底层复杂的路由和切换逻辑被完全封装。
*   **场景化配置 (新)**: 实现了业务逻辑与AI实现的终极解耦。管理员可以为特定业务场景配置复杂的生效规则，实现最高优先级的行为覆盖。
*   **提示词知识产权保护**: 通过`promptKey`调用机制，保护了提示词内容不被非授权用户查看。

此方案为平台构建了一个极其稳固和灵活的AI能力底座，是整个项目能够稳定运行并轻松扩展的基石。
