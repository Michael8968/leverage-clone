# 腾讯混元 AI 迁移变更日志

## 📅 迁移日期
2025-01-XX（最后更新）

## ✅ 已完成的迁移

### 1. 核心基础设施

#### 📄 `src/ai/hunyuan-client.ts` (新增)
**描述**: 腾讯混元 AI 客户端的统一接口层

**功能模块**:
- **createHunyuanClient()**: 创建混元客户端实例
  - 从环境变量读取 `CLOUDBASE_SECRET_ID` 和 `CLOUDBASE_SECRET_KEY`
  - 配置区域: `ap-hongkong`
  - 端点: `hunyuan.tencentcloudapi.com`

- **getHunyuanClient()**: 单例模式获取客户端
  - 确保全局只有一个客户端实例
  - 性能优化

- **generateWithHunyuan(options)**: 统一的 AI 生成接口
  - 参数:
    ```typescript
    {
      model: string,           // 默认 'hunyuan-lite'
      messages: HunyuanMessage[],
      temperature?: number,    // 默认 0.7
      userId: string,          // 必需，用于积分扣除
      actionType?: string,     // 操作类型，默认 'ai_generation'
    }
    ```
  - 返回:
    ```typescript
    {
      text: string,           // AI 生成的文本
      usage: {
        PromptTokens: number,
        CompletionTokens: number,
        TotalTokens: number,
      }
    }
    ```
  - 自动积分扣除:
    - 基础: -10 积分
    - Token 费用: 每 1000 tokens -1 积分
    - 写入 `points_transactions` 集合

- **deductPoints(userId, actionType, tokens)**: 积分扣除函数
  - 自动记录到 Firestore
  - 包含元数据: tokens, model, timestamp

- **generateWithOpenAI()**: OpenAI fallback（预留）
  - 用于特殊场景的 OpenAI API 调用
  - 参数与 generateWithHunyuan 类似

**导出类型**:
- `HunyuanMessage`: `{ Role: 'system' | 'user' | 'assistant', Content: string }`
- `HunyuanGenerateOptions`: 生成选项接口
- `HunyuanGenerateResult`: 生成结果接口

---

#### 📄 `test-ai-flow.js` (新增)
**描述**: 测试腾讯混元 AI 集成的脚本

**测试场景**:
1. **Test 1: Simple Greeting**
   - 输入: "Hello"
   - 验证: 基础连接和响应
   
2. **Test 2: Scenario-based Conversation**
   - 场景: 设计师助手
   - 输入: "我想做一个现代极简风格的 logo"
   - 验证: 场景化交互

3. **Test 3: Intelligent Routing Scenario**
   - 输入: 需求详情 + 设计师列表
   - 验证: AI 决策能力（JSON 格式输出）

**运行方式**:
```bash
npm run test-ai-flow
```

**输出信息**:
- ✅ 成功/❌ 失败状态
- 响应文本
- Token 使用量（Prompt + Completion + Total）
- 执行时间

---

### 2. 已重构的 Flow 文件

#### 📄 `src/ai/flows/intelligent-routing-flow.ts` (完全重写)
**原实现**: 使用 Genkit `ai.defineFlow()` 和 `ai.definePrompt()`

**新实现**: 
- 移除所有 Genkit 依赖
- 直接使用 `generateWithHunyuan()`
- 标准 async function: `export async function intelligentRoutingFlow(input): Promise<IntelligentRoutingOutput>`

**核心逻辑**:
1. **获取路由上下文**:
   - 查询所有 `status=active` 的设计师
   - 过滤 `aiAssistantEnabled=false` 的设计师
   - 获取路由策略（从 `intelligent_routing_strategy/main_strategy` 集合）
   - 获取请求者信息

2. **构建 AI 提示**:
   ```typescript
   const systemPrompt = `You are an intelligent routing AI...
   
   STRATEGY:
   ${strategy.strategyText}
   
   AVAILABLE DESIGNERS (基于 users status):
   ${JSON.stringify(allDesigners, null, 2)}
   
   DECISION RULES:
   1. Prioritize specific designer requests
   2. Consider status, queue size, skills, rating
   3. Fallback if all designers busy
   `;
   ```

3. **调用混元 AI**:
   ```typescript
   const result = await generateWithHunyuan({
     model: 'hunyuan-lite',
     messages: [
       { Role: 'system', Content: systemPrompt },
       { Role: 'user', Content: userPrompt },
     ],
     temperature: 0.3, // 较低温度以保证决策一致性
     userId: requesterId,
     actionType: 'intelligent_routing',
   });
   ```

4. **解析 AI 决策**:
   - 使用正则提取 JSON: `result.text.match(/\{[\s\S]*\}/)`
   - 验证决策格式和内容
   - 回退逻辑: 解析失败 → 选择队列最小的设计师

**输出格式**:
```typescript
{
  decision: 'route_to_designer' | 'fallback_to_ai',
  designerId?: string,
  reason: string,
  aiAssistantMessage?: string,
}
```

**变更总结**:
- ❌ 移除: `import { ai } from '@/ai/genkit'`
- ❌ 移除: `ai.defineFlow()`, `ai.definePrompt()`
- ✅ 新增: `import { generateWithHunyuan } from '@/ai/hunyuan-client'`
- ✅ 新增: 完整的 try-catch 错误处理
- ✅ 新增: JSON 解析和验证逻辑
- ✅ 保留: 所有原有业务逻辑（策略、设计师筛选等）

---

#### 📄 `src/ai/flows/prompt-execution-flow.ts` (部分重构)
**原实现**: 使用 Genkit 进行 AI 生成和 Flow 定义

**新实现**:
- 移除 Genkit 依赖
- 保留积分扣除的复杂业务逻辑
- 使用 `generateWithHunyuan()` 替代 `ai.generate()`

**核心变更**:

1. **导入更新**:
   ```typescript
   // 移除
   - import { ai } from '@/ai/genkit'
   - import { z } from 'genkit'
   
   // 新增
   + import { z } from 'zod'
   + import { generateWithHunyuan, type HunyuanMessage } from '@/ai/hunyuan-client'
   ```

2. **executePrompt 函数重构**:
   ```typescript
   // 旧代码（Genkit）
   const result = await ai.generate({
     model: gemini15Flash,
     prompt: finalSystemPrompt,
     config: { temperature },
   });
   
   // 新代码（混元）
   const hunyuanMessages: HunyuanMessage[] = [];
   if (finalSystemPrompt) {
     hunyuanMessages.push({ Role: 'system', Content: finalSystemPrompt });
   }
   for (const msg of conversationMessages) {
     hunyuanMessages.push({ 
       Role: msg.role === 'assistant' ? 'assistant' : 'user',
       Content: msg.content 
     });
   }
   
   const result = await generateWithHunyuan({
     model: 'hunyuan-lite',
     messages: hunyuanMessages,
     temperature: temperature || 0.7,
     userId,
     actionType: scenario || promptKey || 'ai_generation',
   });
   ```

3. **新增功能: testLlmConnection**:
   ```typescript
   export async function testLlmConnection(connectionId: string) {
     console.log(`Testing LLM connection: ${connectionId}`);
     const result = await generateWithHunyuan({
       model: 'hunyuan-lite',
       messages: [{ Role: 'user', Content: 'Hello' }],
       userId: 'test-user',
       actionType: 'connection_test',
     });
     console.log(`Connection test result: ${result.text}`);
     return result;
   }
   ```

**保留功能**:
- ✅ 积分规则评估（RuleEngine）
- ✅ 用户积分查询和扣除逻辑
- ✅ 对话历史管理
- ✅ Prompt 变量替换
- ✅ System prompt 和 user prompt 合并
- ✅ 所有原有的类型定义（ExecutePromptInput, ExecutePromptOutput）

**变更总结**:
- ❌ 移除: Genkit Flow 包装
- ✅ 新增: 混元 SDK 集成
- ✅ 新增: testLlmConnection 测试函数
- ✅ 保留: 100% 业务逻辑（积分系统、规则引擎等）

---

#### 📄 `src/ai/flows/clarify-demand-details.ts` (部分重构)
**原实现**: 使用 Genkit Flow 包装

**新实现**:
- 移除 `ai.defineFlow()` 包装
- 转为标准 async function
- 使用 `executePrompt`（已重构为混元）
- 预留 `generateWithOpenAI()` fallback

**核心变更**:

1. **导入更新**:
   ```typescript
   // 移除
   - import { ai } from '@/ai/genkit'
   
   // 新增（预留 OpenAI fallback）
   + import { generateWithOpenAI } from '@/ai/hunyuan-client'
   
   // 更新路径
   - import { intelligentRoutingFlow } from './intelligent-routing-flow-new'
   + import { intelligentRoutingFlow } from './intelligent-routing-flow'
   ```

2. **函数签名更新**:
   ```typescript
   // 旧代码
   export async function clarifyDemandDetails(input) {
     return clarifyDemandDetailsFlow(input);
   }
   const clarifyDemandDetailsFlow = ai.defineFlow({ ... }, async (input) => { ... });
   
   // 新代码
   export async function clarifyDemandDetails(input: ClarifyDemandDetailsInput): Promise<ClarifyDemandDetailsOutput> {
     try {
       // 原有逻辑...
     } catch (error) {
       console.error('Error in clarifyDemandDetails:', error);
       throw error;
     }
   }
   ```

3. **依赖关系**:
   - 使用 `executePrompt()` 进行 AI 调用（已重构为混元）
   - 使用 `intelligentRoutingFlow()` 进行路由（已重构为混元）
   - 保留所有 handoff 逻辑（AI 失败 → 路由 → 系统消息）

**保留功能**:
- ✅ 需求澄清逻辑
- ✅ 创建者和请求者数据获取
- ✅ AssistantRule 规则应用
- ✅ Handoff 机制（AI → 设计师）
- ✅ Chat 消息更新到 Firestore
- ✅ 所有错误处理和 fallback 逻辑

**变更总结**:
- ❌ 移除: `ai.defineFlow()` 包装
- ✅ 转换: 标准 async function
- ✅ 新增: try-catch 错误处理
- ✅ 更新: intelligentRoutingFlow 导入路径
- ✅ 保留: 100% 业务逻辑

---

#### 📄 `src/ai/flows/shopping-assistant.ts` (完全重构)
**原实现**: 使用 Genkit `ai.definePrompt()` 和 `ai.defineFlow()`

**新实现**:
- 移除所有 Genkit 依赖
- 直接使用 `generateWithHunyuan()`
- 依赖 `user-profiling` 生成用户画像

**核心逻辑**:
1. **生成用户画像**: 调用 `generateUserProfile()` 分析用户描述
2. **构建推荐提示**: 
   ```typescript
   const systemPrompt = `You are an expert shopping assistant...
   Based on all the information, analyze the product list and select the 3 to 5 products that best match the user's profile and query.
   Consider the product's attributes and its supplier's category and reputation (matchScore).`;
   ```
3. **调用混元 AI**: 温度 0.7，返回 JSON 格式的产品 ID 列表
4. **验证推荐**: 确保推荐的产品 ID 存在于输入列表中
5. **Fallback**: 解析失败 → 返回前 3 个产品

**输入**: 
- `description`: 用户描述
- `products`: 可用产品列表
- `suppliers`: 供应商列表
- `photoDataUri`: 可选的图片（预留）

**输出**:
- `userProfile`: 生成的用户画像
- `recommendations`: 推荐的产品 ID 数组（3-5个）

**变更总结**:
- ❌ 移除: `ai.definePrompt()`, `ai.defineFlow()`
- ✅ 新增: `generateWithHunyuan()` 集成
- ✅ 新增: JSON 解析和验证逻辑
- ✅ 新增: Fallback 到默认推荐
- ✅ 保留: 用户画像生成流程

---

#### 📄 `src/ai/flows/user-profiling.ts` (完全重构)
**原实现**: 使用 Genkit Prompt 和 Flow

**新实现**:
- 标准 async function
- 直接使用 `generateWithHunyuan()`
- JSON 格式输出解析

**核心逻辑**:
1. **分析用户输入**: 根据 description 和可选的 photoDataUri
2. **生成画像**: 
   - `summary`: 一句话总结
   - `tags`: 3-5个关键词标签
3. **JSON 解析**: 使用正则提取并验证
4. **标签验证**: 确保 3-5 个标签，不足或超出则调整
5. **Fallback**: 解析失败 → 使用 description 前 100 字符 + 默认标签

**输出格式**:
```typescript
{
  summary: "用户想要现代极简风格的 logo 设计",
  tags: ["logo", "极简", "现代", "设计", "品牌"]
}
```

**变更总结**:
- ❌ 移除: Genkit Prompt 模板系统
- ✅ 新增: 直接构建 system/user prompts
- ✅ 新增: 标签数量验证逻辑
- ✅ 新增: 完善的 fallback 机制
- ✅ 保留: UserProfile 类型定义

---

#### 📄 `src/ai/flows/demand-matching.ts` (部分重构)
**原实现**: 两个 Genkit Flows：`recommendCreatives` 和 `createPrivateDemand`

**新实现**:
- 两个独立的 async functions
- `recommendCreatives`: 使用混元 AI
- `createPrivateDemand`: 纯业务逻辑（无 AI）

**recommendCreatives 逻辑**:
1. **分析需求**: 接收 demand 对象和 creatives 数组
2. **AI 匹配**: 
   ```typescript
   const systemPrompt = `You are an expert at matching creative talent and products with client demands.
   
   Your task is to:
   1. Identify the top 3-5 most suitable creatives for the demand.
   2. For each recommendation, provide 'creativeId', 'reason', 'matchScore'.`;
   ```
3. **返回推荐**: 
   ```typescript
   {
     recommendations: [
       { creativeId: "id1", reason: "原因", matchScore: 85 },
       ...
     ]
   }
   ```
4. **Fallback**: 解析失败 → 返回空数组

**createPrivateDemand 逻辑**:
- 创建私聊需求（不使用 AI）
- 判断连接人工还是 AI 助理
- 更新设计师队列
- 创建 demand 和 chat 文档
- 完全保留原有业务逻辑

**变更总结**:
- ❌ 移除: `ai.definePrompt()`, `ai.defineFlow()`
- ✅ 新增: `generateWithHunyuan()` 用于推荐
- ✅ 新增: JSON 解析和验证
- ✅ 保留: createPrivateDemand 的所有业务逻辑
- ✅ 保留: Firestore 事务处理

---

### 3. 配置文件更新

#### 📄 `package.json`
**新增脚本**:
```json
{
  "scripts": {
    "test-ai-flow": "node test-ai-flow.js"
  }
}
```

**依赖保留**:
- ✅ `tencentcloud-sdk-nodejs-hunyuan: ^4.1.131` (已存在)
- ✅ `@cloudbase/node-sdk: ^3.10.1` (安全升级)
- ✅ `next: 15.5.6` (安全升级)
- ✅ `zod: ^3.24.1` (独立使用)

**可选清理**（待决定）:
- ❓ `@genkit-ai/googleai` (已不使用)
- ❓ `@genkit-ai/core` (已不使用)

---

## 🔄 迁移对照表

| 迁移项 | Genkit 旧实现 | 混元新实现 | 状态 |
|-------|--------------|----------|------|
| **Flow 定义** | `ai.defineFlow()` | 标准 async function | ✅ |
| **Prompt 定义** | `ai.definePrompt()` | 直接构建 messages | ✅ |
| **AI 生成** | `ai.generate()` | `generateWithHunyuan()` | ✅ |
| **模型** | `gemini-2.0-flash` | `hunyuan-lite` | ✅ |
| **消息格式** | `{ role, content }` | `{ Role, Content }` | ✅ |
| **Schema 验证** | `z from 'genkit'` | `z from 'zod'` | ✅ |
| **积分扣除** | 手动调用 | 自动集成 | ✅ |
| **错误处理** | Genkit 内置 | 自定义 try-catch | ✅ |

---

## ⏳ 待迁移文件

以下文件仍使用 Genkit，需要逐步迁移：

### 高优先级
- [x] `src/ai/flows/shopping-assistant.ts` - 购物助手 ✅
- [x] `src/ai/flows/demand-matching.ts` - 需求匹配 ✅
- [x] `src/ai/flows/user-profiling.ts` - 用户画像 ✅

### 中优先级
- [x] `src/ai/flows/admin-management-flows.ts` - 管理员流程 ✅
- [x] `src/ai/flows/user-management-flows.ts` - 用户管理流程 ✅
- [ ] `src/ai/flows/supplier-data-analysis.ts` - 供应商分析
- [ ] `src/ai/flows/multimodal-flows.ts` - 多模态流程

### 低优先级（工具类）
- [ ] `src/ai/flows/generate-3d-model.ts` - 3D 模型生成
- [ ] `src/ai/flows/generate-nanobanana-image.ts` - 图片生成
- [ ] `src/ai/flows/generate-tripo3d-model.ts` - Tripo3D 模型
- [ ] `src/ai/flows/get-tripo3d-model-status.ts` - 模型状态查询

### 可选清理
- [ ] `src/ai/genkit.ts` - Genkit 初始化文件（可废弃）
- [ ] `src/ai/dev.ts` - Genkit 开发服务器（可废弃）

---

## 📋 迁移清单（逐文件）

### ✅ 已完成（9个文件）
1. ✅ **intelligent-routing-flow.ts** - 完全重写
2. ✅ **prompt-execution-flow.ts** - 核心逻辑重构
3. ✅ **clarify-demand-details.ts** - Flow 包装移除
4. ✅ **shopping-assistant.ts** - 产品推荐流程重构
5. ✅ **user-profiling.ts** - 用户画像生成重构
6. ✅ **demand-matching.ts** - 需求匹配和私聊创建重构
7. ✅ **admin-management-flows.ts** - 管理员功能重构
8. ✅ **user-management-flows.ts** - 用户管理重构
9. ✅ **6 个应用页面** - 函数调用修复

### ⏳ 进行中（0个文件）
无

### 📅 计划中（8个文件）
1. admin-management-flows.ts
2. user-management-flows.ts
3. supplier-data-analysis.ts
4. multimodal-flows.ts
5. generate-3d-model.ts
6. generate-nanobanana-image.ts
7. generate-tripo3d-model.ts
8. get-tripo3d-model-status.ts

---

## 🧪 测试验证

### TypeScript 编译检查
```bash
npm run typecheck
```
**状态**: ✅ 通过（无错误）

### AI 功能测试
```bash
npm run test-ai-flow
```
**状态**: ⏳ 待测试（需要配置环境变量）

### 所需环境变量
```env
# 腾讯云密钥（必需）
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key

# OpenAI API Key（可选，用于 fallback）
OPENAI_API_KEY=your_openai_key
```

---

## 📊 迁移进度

- **总文件数**: 14 个 Flow 文件
- **已完成**: 8 个 (57%)
- **待迁移**: 6 个 (43%)
- **预计完成时间**: 30-60 分钟（按当前速度）

---

## 🎯 下一步行动

1. **立即执行**:
   - 配置 `.env` 文件
   - 运行 `npm run test-ai-flow` 验证基础功能
   - 在开发环境测试已重构的 3 个 flows

2. **短期目标** (本周):
   - 完成高优先级文件迁移（shopping-assistant, demand-matching, user-profiling）
   - 测试所有核心业务流程

3. **中期目标** (本月):
   - 完成所有 Flow 文件迁移
   - 移除 Genkit 依赖
   - 更新文档和部署配置

---

## 💡 经验总结

### 成功经验
1. **分层架构**: 创建 `hunyuan-client.ts` 作为抽象层，简化了 Flow 文件的迁移
2. **渐进式迁移**: 一个文件一个文件迁移，避免大规模破坏性变更
3. **保留业务逻辑**: 只替换 AI 调用层，保留所有业务逻辑和数据结构
4. **自动积分扣除**: 在客户端层集成积分逻辑，减少重复代码

### 注意事项
1. **消息格式差异**: Genkit 用 `{ role, content }`，混元用 `{ Role, Content }` (大小写不同)
2. **JSON 解析**: 混元返回的 JSON 需要用正则提取，不是直接结构化输出
3. **温度设置**: 智能决策类任务建议用低温度（0.3），创意类任务用高温度（0.7+）
4. **错误处理**: 必须添加完善的 fallback 逻辑（AI 解析失败 → 默认逻辑）

---

**最后更新**: 2025-01-XX
**维护者**: GitHub Copilot & Development Team
