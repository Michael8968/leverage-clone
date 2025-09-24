# **数据库与核心AI流程设计文档**

**版本**: 1.5
**日期**: 2024年8月10日

---

## 1. Firestore 数据库设计

本文档详细描述了项目中使用的Firestore数据库集合的结构和它们之间的关联关系。

### 1.1. `users` 集合

存储平台所有用户的基本信息。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **uid** | `string` | 文档ID，与Firebase Auth UID一致，是用户的唯一标识符。 |
| **name** | `string` | 用户姓名或昵称。 |
| **email** | `string` | 用户注册邮箱 (唯一)。 |
| **avatar** | `string` | 用户头像图片的URL。 |
| **role** | `string` | 用户角色 (`admin`, `supplier`, `creator`, `user`, `suspended`)。 |
| **rating** | `number` | (可选) 平台为用户评定的星级 (1-10)。 |
| **status** | `string` | (可选) 用户状态 (`active`, `suspended`)。默认为 `active`。 |


### 1.2. `products` 集合

存储所有由供应商或创作者提供的产品和服务。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **name** | `string` | 产品或服务名称。 |
| **description** | `string` | 详细描述。 |
| **price** | `number` | 价格 (人民币)。 |
| **category** | `string` | 所属类别 (例如: "3D模型", "消费电子产品")。 |
| **supplierId** | `string` | (可选) 关联的供应商ID，对应 `suppliers` 集合中的文档ID。 |
| **creatorId** | `string` | (可选) 关联的创作者ID，对应 `users` 集合中的文档ID。 |
| **purchaseUrl** | `string` | (可选) 外部购买链接。 |
| **imageUrl** | `string` | (可选) 产品主图的URL。 |
| **imageUrls** | `Array<string>` | (可选) 产品的多张展示图片的URL数组。 |
| **details** | `Array<Object>`| (可选) 产品的详细规格表，用于存储动态的键值对信息。 |
| **status** | `string` | (仅创作者提交时) 审核状态 (`审核中`, `已入库`, `需要修改`)。 |
| **createdAt** | `Timestamp`| 创建或提交日期。 |
| **supplementaryFields** | `Array<Object>` | (可选, 遗留) 补充字段，用于存储动态的产品规格。 |


### 1.3. `demands` 集合

存储由用户发布的需求。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **title** | `string` | 需求标题。 |
| **description** | `string` | 需求的详细描述。 |
| **budget** | `number` | 预算 (人民币)。 |
| **category** | `string` | 需求类别。 |
| **status** | `string` | 需求状态 (`开放中`, `进行中`, `已完成`)。 |
| **requesterId** | `string` | 发布者ID，对应 `users` 集合的文档UID。 |
| **requesterName** | `string` | 发布者姓名。 |
| **requesterAvatar**| `string` | 发布者头像URL。 |
| **creatorId** | `string` | (可选) 接受此需求的创作者ID。 |
| **createdAt** | `Timestamp`| 发布日期。 |

### 1.4. `suppliers` 集合

存储供应商的公司信息。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID，与供应商用户的UID一致。 |
| **name** | `string` | 公司全称。 |
| **shortName** | `string` | (可选) 公司简称。 |
| **region** | `string` | (可选) 公司所在区域。 |
| **address** | `string` | (可选) 公司详细地址。 |
| **establishedDate** | `Timestamp` | (可选) 公司成立日期。 |
| **registeredCapital**|`string` | (可选) 注册资本。 |
| **creditCode** | `string` | (可选) 统一社会信用代码。 |
| **email** | `string` | 公司联系邮箱。 |
| **contactPerson** | `string` | (可选) 主要联系人姓名。 |
| **jobTitle** | `string` | (可选) 联系人职位。 |
| **mobile** | `string` | (可选) 联系人手机。 |
| **supplementaryFields** | `Array<Object>` | (可选) 补充信息字段，用于存储自定义的键值对信息。 |

### 1.5. `chats` 集合

存储供需双方的实时聊天记录。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID，与 `demands` 集合的文档ID一致。 |
| **messages** | `Array<Object>` | 存储消息对象的数组。 |

#### `messages` 数组中的对象结构

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 消息的唯一ID。 |
| **text** | `string` | 消息内容。 |
| **senderId** | `string` | 发送者UID。 |
| **senderName** | `string` | 发送者姓名。 |
| **senderAvatar** | `string` | 发送者头像URL。 |
| **timestamp** | `Timestamp`| 消息发送时间。 |
| **isAIMessage**| `boolean` | (可选) 是否为AI助理发送的消息。 |

### 1.6. `llm_connections` 集合

存储平台可用的大语言模型连接配置。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **provider** | `string` | 厂商名称 (例如: `Google`, `OpenAI`)。 |
| **modelName**| `string` | 厂商官方指定的模型ID (例如: `gemini-1.5-pro-latest`)。 |
| **apiKey** | `string` | 该模型的API密钥。 |
| **priority** | `number` | 优先级，数字越小越高 (1-100)。 |
| **status** | `string` | 状态 (`活跃`, `已禁用`)。 |
| **scope** | `string` | 使用范围 (`通用`, `专属`)。 |
| **category** | `string` | 模型类别 (`文本`, `图像`)。 |
| **createdAt**| `Timestamp`| 创建时间。 |

### 1.7. `prompts` 集合

存储用于AI流程的提示词模板，实现对提示词的调用和知识产权保护。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **name** | `string` | 提示词的业务名称。 |
| **promptKey** | `string` | **(核心)** 唯一的、人类可读的业务调用KEY。这是外部调用和内部路由的唯一句柄。 |
| **description**| `string` | 提示词功能描述。 |
| **content** | `string` | 完整的提示词内容，支持模板变量。此内容对非所有者和非管理员隐藏。 |
| **scope** | `string` | 使用范围 (`通用`, `专属`)。 |
| **status** | `string` | 状态 (`生效中`, `已停用`)。 |
| **ownerId** | `string` | 创建者UID。 |
| **ownerType** | `string` | 创建者类型 (`platform`, `creator`)。 |
| **modelId** | `string` | **(核心)** (可选) 绑定的`llm_connections`文档ID。如果为空，则使用系统默认模型。 |
| **priority** | `number` | **(核心)** (可选) 特定于此提示词的调用优先级。 |
| **querySources** | `Object` | (可选) 查询范围，定义此提示词可从哪些核心数据源检索信息。 |
| **sourceTemperatures**| `Object`| (可选) 为每个数据源设置独立的创造性温度（0-1）。 |

### 1.8. `ai_scenarios` 集合 (新增 & 升级)

存储平台内固定的AI应用场景与提示词的绑定关系，实现业务逻辑与AI实现的解耦。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **ID** | `string` | 文档ID，即**场景的唯一标识符** (例如: `chat-assistant`)。 |
| **name** | `string` | 场景的业务名称 (例如: "聊天对话-AI助理")。 |
| **description**| `string` | 场景的功能描述。 |
| **configuredPromptKey** | `string` | **(核心)** 绑定的 `prompts` 集合中的 `promptKey`。 |
| **repetition** | `string` | (可选) 重复策略 (`none`, `daily`, `weekly`)。 |
| **daysOfWeek** | `Array<string>` | (可选) 当`repetition`为`weekly`时，存储一周的日子（`mon`, `tue`...）。 |
| **startTime** | `string` | (可选) 当启用重复策略时，定义时间窗口的开始时间（`HH:mm`）。 |
| **endTime** | `string` | (可选) 当启用重复策略时，定义时间窗口的结束时间（`HH:mm`）。 |
| **startsAt** | `Timestamp` | (可选) 当`repetition`为`none`时，配置的绝对生效时间。 |
| **expiresAt**| `Timestamp` | (可选) 当`repetition`为`none`时，配置的绝对失效时间。 |
| **targetUserRoles**| `Object`| (可选) 目标用户角色及星级。键为角色名，值为星级数组。例如 `{ "creator": [8, 9, 10] }`。若为空对象或不存在，则对所有用户生效。 |
| **ruleLogic** | `string` | (可选) "时间"与"用户"两个维度规则的组合逻辑 (`and`, `or`)，默认为 `and`。 |


### 1.9. 其他集合

*   **`resources`**: 存储公共资源，如外部API链接。

---

## 2. 核心AI流程 (Genkit Flows)

项目中使用Genkit构建的核心AI流程如下：

*   **`generateUserProfile`**:
    *   **输入**: 用户需求描述 (文本)、可选的参考图片。
    *   **功能**: 分析输入，生成用户画像总结和关键词标签。

*   **`getProductRecommendations`**:
    *   **输入**: 用户画像、所有产品/服务数据、所有供应商数据。
    *   **功能**: 根据用户画像，从产品和服务中进行匹配，返回推荐列表。

*   **`recommendCreatives`**:
    *   **输入**: 一个或多个需求、所有“创意方”（产品+供应商）数据。
    *   **功能**: 为指定需求匹配最合适的创意方，并给出理由。

*   **`generate3dModel`**:
    *   **输入**: 文本提示 (Prompt)。
    *   **功能**: 调用AI模型（如Imagen），根据文本生成3D模型的预览图。

*   **`evaluateSellerData`**:
    *   **输入**: CSV文件数据 (Data URI格式)。
    *   **功能**: 解析CSV内容，评估其中每一行代表的供应商与平台的匹配度，并返回结构化数据。
      
*   **`clarifyDemandDetails`**:
    *   **输入**: 需求标题、需求描述、当前聊天记录, **用户UID**。
    *   **功能**: 作为AI助理，分析对话上下文，生成一个专业的问题来进一步澄清需求细节。 **(已改造)** 现在通过调用 `executePrompt` 并传入 `scenario: 'chat-assistant'` 和 `userId` 来执行。

*   **`executePrompt` (核心网关)**:
    *   **输入**: `modelId` (可选), `promptKey` (可选), `scenario` (可选), `userId` (可选), `messages`, `temperature`。
    *   **功能**: **(已升级)** 统一的API网关。按以下优先级顺序确定执行目标：
        1.  **场景配置**: 根据 `scenario` 和 `userId` 查找 `ai_scenarios` 集合中符合当前时间、重复策略和用户角色/星级的、优先级最高的配置。
        2.  **手动指定**: 如果没有场景覆盖，则使用调用时传入的 `promptKey` 或 `modelId`。
    *   **调用位置**: 被所有需要调用大模型的上层业务流程调用。
