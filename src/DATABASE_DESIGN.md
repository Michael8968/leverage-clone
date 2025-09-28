# **数据库与核心AI流程设计文档**

**版本**: 2.5 (Final)
**日期**: 2025年9月1日

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
| **status** | `string` | 用户状态 (`active`, `inactive`)。`active`为在线/可用，`inactive`为离线。 |
| **aiAssistantEnabled**| `boolean`| (可选, 针对 'creator') 是否启用AI助理模式。 |
| **alwaysAvailable**| `boolean`| (可选, 针对 'creator') 是否总是接受预约。 |
| **currentQueueSize**| `number`| (可选, 针对 'creator') 当前排队人数。 |
| **maxQueueSize**| `number` | (可选, 针对 'creator') 最大可接待排队人数。 |
| **bio** | `string` | (可选, 针对 'creator') 个人简介。 |
| **skills** | `Array<string>`| (可选, 针对 'creator') 技能标签。 |
| **createdAt** | `Timestamp`| 用户创建时间。 |
| **defaultAssistantPromptKey** | `string` | (可选, 针对 'creator') 默认助理使用的提示词Key。 |
| **assistantRules** | `Array<Object>`| (可选, 针对 'creator') AI助理的高级行为规则数组。 |


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
| **thumbnailUrl** | `string` | (可选) 产品小图/缩略图的URL。 |
| **images** | `Array<Object>` | (可选) 产品的多张展示图片的URL数组，每个对象包含 `url` 和 `view` 字段。 |
| **details** | `Array<Object>`| (可选) 产品的详细规格表，用于存储动态的键值对信息。 |
| **status** | `string` | (仅创作者提交时) 审核状态 (`审核中`, `已入库`, `需要修改`)。 |
| **createdAt** | `Timestamp`| 创建或提交日期。 |


### 1.3. `demands` 集合

存储由用户发布的需求。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **type** | `string` | 需求类型 (`public`, `private`)。 |
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
| **supplementaryFields** | `Array<Object>` | (可选) 补充信息字段，用于存储自定义的键值对信息。 |

### 1.5. `chats` 集合

存储供需双方的实时聊天记录。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID，与 `demands` 集合的文档ID一致。 |
| **messages** | `Array<Object>` | 存储消息对象的数组。 |

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
| **category** | `string` | 模型类别 (`文本`, `图像`, `多模态`)。 |
| **lastTestStatus** | `string` | 上次可用性测试结果 (`success`, `failed`, `untested`)。 |
| **lastTestTimestamp** | `Timestamp`| 上次测试时间。 |
| **createdAt**| `Timestamp`| 创建时间。 |

### 1.7. `prompts` 集合

存储用于AI流程的提示词模板。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **name** | `string` | 提示词的业务名称。 |
| **promptKey** | `string` | **(核心)** 唯一的、人类可读的业务调用KEY。 |
| **description**| `string` | 提示词功能描述。 |
| **content** | `string` | 完整的提示词内容，支持模板变量。 |
| **scope** | `string` | 使用范围 (`通用`, `专属`)。 |
| **status** | `string` | 状态 (`生效中`, `已停用`)。 |
| **ownerId** | `string` | 创建者UID。 |
| **ownerType** | `string` | 创建者类型 (`platform`, `creator`)。 |
| **modelId** | `string` | (可选) 绑定的`llm_connections`文档ID。 |
| **priority** | `number` | (可选) 特定于此提示词的调用优先级。 |
| **querySources** | `Object` | (可选) 查询范围，定义此提示词可从哪些核心数据源检索信息。 |
| **sourceTemperatures**| `Object`| (可选) 为每个数据源设置独立的创造性温度（0-1）。 |

### 1.8. `ai_scenarios` 集合

存储平台内固定的AI应用场景与提示词的绑定关系。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID，即**场景的唯一标识符** (例如: `chat-assistant`)。 |
| **name** | `string` | 场景的业务名称 (例如: "聊天对话-AI助理")。 |
| **description**| `string` | 场景的功能描述。 |
| **tags** | `Array<string>` | (可选) 分类标签数组，用于前端按功能模块筛选场景。 |
| **configuredPromptKey** | `string` | **(核心)** 绑定的 `prompts` 集合中的 `promptKey`。 |
| **repetition** | `string` | (可选) 重复策略 (`none`, `daily`, `weekly`)。 |
| **daysOfWeek** | `Array<string>` | (可选) 当`repetition`为`weekly`时，存储一周的日子（`mon`, `tue`...）。 |
| **startTime** | `string` | (可选) 时间窗口的开始时间（`HH:mm`）。 |
| **endTime** | `string` | (可选) 时间窗口的结束时间（`HH:mm`）。 |
| **startsAt** | `Timestamp` | (可选) 当`repetition`为`none`时，配置的绝对生效时间。 |
| **expiresAt**| `Timestamp` | (可选) 当`repetition`为`none`时，配置的绝对失效时间。 |
| **targetUserRoles**| `Object`| (可选) 目标用户角色及星级。 |
| **ruleLogic** | `string` | (可选) "时间"与"用户"规则的组合逻辑 (`and`, `or`)。 |

### 1.9. `intelligent_routing_strategy` 集合

存储用于实时服务分配的智能路由策略。这是一个只有一个文档的单例集合。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID, 永远是 `main_strategy`。 |
| **strategyText** | `string` | 管理员用自然语言定义的全局默认策略。 |
| **factors** | `Array<Object>` | 可动态配置的影响决策的因子数组。 |
| **factorTemperatures**|`Object` | 全局默认的、各因子的权重（温度）对象。 |
| **advancedRules** | `Array<Object>` | **(新增)** 包含多条带有生效条件和执行动作的优先策略规则。 |
| **updatedAt** | `Timestamp` | 最后更新时间。 |


### 1.10. `resources` 集合

存储外部行业资讯的数据源配置。

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **name** | `string` | 数据源的业务名称。 |
| **sourceUrl** | `string` | 原始数据来源网址。 |
| **apiKey** | `string` | (可选) 访问该数据源所需的API密钥。 |
| **category** | `string` | 资讯类别。 |
| **tags** | `Array<string>` | 相关标签数组。 |
| **updateFrequency**| `string` | 更新频率 (`实时`, `每日`, `每周`, `每月`)。 |
| **status** | `string` | 状态 (`可用`, `已停用`)。 |
| **createdAt** | `Timestamp`| 创建时间。 |

### 1.11. `availabilities` & `appointments` 集合 (新增)

用于支持创意者排班和用户预约功能。

#### `availabilities` 集合

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **creatorId** | `string` | 文档ID，与 `users` 集合中的创意者UID一致。 |
| **slots** | `Array<Timestamp>` | 存储该创意者所有空闲时间点的时间戳数组。 |

#### `appointments` 集合

| 字段名 | 数据类型 | 描述 |
| :--- | :--- | :--- |
| **id** | `string` | 文档ID。 |
| **creatorId** | `string` | 被预约的创作者ID。 |
| **requesterId**| `string` | 发起预约的用户ID。 |
| **requesterName**| `string` | 预约者姓名。 |
| **appointmentTime**| `Timestamp` | 预约的具体时间点。 |
| **status** | `string` | 预约状态 (`pending`, `confirmed`, `cancelled`)。 |
| **createdAt** | `Timestamp` | 预约创建时间。 |

---

## 2. 核心AI流程 (Genkit Flows)

*   `generateUserProfile`: 分析用户输入，生成用户画像总结和关键词标签。
*   `getProductRecommendations`: 根据用户画像，从产品和服务中进行匹配，返回推荐列表。
*   `recommendCreatives`: 为指定需求匹配最合适的创意方，并给出理由。
*   `generate3dModel`, `generateTripo3dModel`, `generateNanoBananaImage`: 调用各类AI模型生成图像。
*   `evaluateSellerData`: 批量分析CSV文件内容，评估供应商或产品的匹配度。
*   `clarifyDemandDetails`: 作为AI助理，分析对话上下文，生成澄清问题。当无法处理时，触发智能路由进行人工转接。
*   **`executePrompt` (核心网关)**: 统一的API网关，根据场景配置、提示词Key或模型ID，智能路由AI请求。
*   **`createPrivateDemand` (智能分诊)**: 为用户和设计师创建专属的`private`需求和聊天室，并根据设计师状态决定连接本人还是AI助理。
*   **`intelligentRoutingFlow` (智能路由中枢)**: 接收来自各方的转人工请求，根据全局策略智能分配给最合适的设计师。
*   **`batchUpdateUsers`**: 批量更新用户的角色、星级或状态。
*   **`getDesigners`**: 获取所有角色为`creator`的用户信息。
*   **`getUploadUrlForMediaAsset` & `analyzeMediaAsset`**: 支持多模态文件的上传和分析。
*   **`updateUserStatus`**: 更新创作者的在线状态或AI助理模式。
*   **`updateUserAssistantRules`**: 更新创意者的AI助理规则。

