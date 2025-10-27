# **云函数 (Genkit AI Flows) 功能说明文档**

**版本**: 1.0
**日期**: 2025年9月30日
**目的**: 本文档详细描述了项目中所有作为后端核心逻辑的 Genkit AI 流程（在功能上等同于云函数），并说明了它们各自的作用、输入、输出及与其他服务的交互。

---

## **1. 概述**

本项目的后端逻辑主要由一系列 Genkit AI 流程构成，这些流程被部署为应用的一部分，并由前端调用来执行特定的业务和AI任务。它们涵盖了从数据管理、AI分析到用户交互的方方面面，构成了整个平台的大脑。

---

## **2. 流程详解**

### **2.1. 管理与配置 (Admin & Config)**

| 流程名称 (Function Name)     | 文件路径                                     | 核心作用                                                                                                     |
| :------------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `getPlatformAssets`              | `admin-management-flows.ts`                  | 返回一个硬编码在后端的、平台支持的所有LLM厂商及其模型列表，供前端动态渲染下拉选项。                          |
| `testLlmConnection`              | `admin-management-flows.ts`                  | **核心功能**：接收一个LLM连接的ID，从数据库读取其配置（API Key, 模型名等），然后发送一个真实的测试API请求，并将测试结果（成功/失败）写回数据库。 |
| `getPrompts`                     | `admin-management-flows.ts`                  | 从`prompts`集合中查询所有状态为“生效中”的提示词，用于在“AI场景配置”等页面作为下拉选项。                      |
| `updateModelsFromLiteLLM`        | `admin-management-flows.ts`                  | (新增) 连接到一个LiteLLM代理服务，获取其支持的所有模型列表，并自动将数据库中不存在的新模型添加进来。         |
| `executePrompt`                  | `prompt-execution-flow.ts`                   | **核心网关**：平台所有AI调用的统一入口。它会根据传入的场景(scenario)、用户ID等，智能判断并执行**积分扣除**，然后根据配置（场景、提示词、模型）选择最佳路径（手动配置的API或Genkit备用方案）来调用LLM。 |

### **2.2. 用户与权限 (User & Permissions)**

| 流程名称 (Function Name)     | 文件路径                                     | 核心作用                                                                                                     |
| :------------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `batchUpdateUsers`               | `user-management-flows.ts`                   | **批量管理**：接收一个用户ID列表和需要更新的数据（如角色、星级、状态），在数据库中批量更新这些用户信息。     |
| `getDesigners`                   | `user-management-flows.ts`                   | 查询并返回所有角色为`creator`（创意者）的用户公开信息（如姓名、头像、简介、技能、在线状态等），用于“创意设计师”页面展示。 |
| `updateUserStatus`               | `user-management-flows.ts`                   | 更新单个用户的特定状态，如“在线接待/挂起示忙” (`status`) 或“AI助理启用/禁用” (`aiAssistantEnabled`)。         |
| `updateUserAssistantRules`       | `user-management-flows.ts`                   | (新增) 接收一个完整的规则数组，并将其更新到指定创意者的`assistantRules`字段中，用于实现AI助理的高级行为定制。 |
| `generateUserProfile`            | `user-profiling.ts`                          | 接收用户的文本描述或图片，使用AI分析并生成一个结构化的用户画像，包含一句话总结和几个关键词标签。           |
| `grantPointsToGroup`             | `user-management-flows.ts`                   | **批量赋分**：根据指定的角色或星级，为匹配的用户群体创建一批状态为`pending`的积分增加交易记录。         |
| `approveGrantRequest`            | `user-management-flows.ts`                   | **双人审批**：管理员批准一个赋分批次。当第一个管理员批准时，记录其ID；当第二个管理员批准时，将积分实际增加到用户的余额上，并更新交易状态为`approved`。 |

### **2.3. 核心业务流程 (Business Logic)**

| 流程名称 (Function Name)     | 文件路径                                     | 核心作用                                                                                                     |
| :------------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `getProductRecommendations`      | `shopping-assistant.ts`                      | **AI导购核心**：先调用`generateUserProfile`生成用户画像，然后基于画像和商品/供应商列表，使用AI推荐3-5个最匹配的产品ID。 |
| `recommendCreatives`             | `demand-matching.ts`                         | **AI匹配（需求池）**：接收一个“需求”和一份“创意方”列表，使用AI分析并推荐3-5个最匹配的创意方及其理由和匹配分数。 |
| `createPrivateDemand`            | `demand-matching.ts`                         | **智能分诊**：当用户想与设计师即时沟通时调用。它会创建一个私有的`demand`和`chat`，并根据设计师的实时状态（是否在线、是否启用AI助理）智能决定初始消息是由设计师本人发送还是由AI助理发送。 |
| `clarifyDemandDetails`           | `clarify-demand-details.ts`                  | **AI助理对话**：分析聊天上下文，调用`executePrompt`生成澄清问题。当无法处理或检测到特定关键词时，会触发`intelligentRoutingFlow`请求人工转接。 |
| `intelligentRoutingFlow`         | `intelligent-routing-flow.ts`                | **智能路由中枢**：接收转接请求，从数据库读取全局路由策略和设计师实时状态，使用AI决策，将请求分配给最合适的可用设计师，或回退到平台通用助理。 |
| `evaluateSellerData`             | `supplier-data-analysis.ts`                  | 接收一个CSV文件，将其内容转换为JSON，然后调用AI为每一条数据进行分析，给出匹配度分数和建议，用于批量导入供应商数据。 |

### **2.4. AI 内容生成 (Content Generation)**

| 流程名称 (Function Name)     | 文件路径                                     | 核心作用                                                                                                     |
| :------------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `generate3dModel`                | `generate-3d-model.ts`                       | **图像生成**：调用Google的`imagen-4.0`模型，根据文本提示词生成一张“看起来像是3D模型的”高清参考图。       |
| `generateTripo3dModel`           | `generate-tripo3d-model.ts`                  | **3D模型生成（代理）**：代理用户的请求，调用第三方Tripo3D的API来创建一个3D模型生成任务，并返回任务ID。     |
| `getTripo3dModelStatus`          | `get-tripo3d-model-status.ts`                | **任务状态轮询（代理）**：根据任务ID，代理用户的请求，调用Tripo3D的API来查询3D模型生成的进度和结果。     |
| `generateNanoBananaImage`        | `generate-nanobanana-image.ts`               | **图生图/文生图**：调用Google的`gemini-2.5-flash-image`模型，可以根据文本提示或“文本+图片”的组合来编辑或生成新图片。 |

### **2.5. 多模态与文件处理 (Multimodal & Files)**

| 流程名称 (Function Name)     | 文件路径                                     | 核心作用                                                                                                     |
| :------------------------------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| `getUploadUrlForMediaAsset`      | `multimodal-flows.ts`                        | **获取上传链接**：使用`firebase-admin`为用户要上传的文件生成一个有时效性的、安全的签名URL (Signed URL)，并预先在`media_assets`集合中创建一条记录。 |
| `analyzeMediaAsset`              | `multimodal-flows.ts`                        | **媒体分析**：接收一个已上传文件的ID，获取其公开URL，然后调用多模态模型（`gemini-pro-vision`）对该文件（图片/视频）进行分析，并将分析结果写回数据库。 |

---
**文档结束**
