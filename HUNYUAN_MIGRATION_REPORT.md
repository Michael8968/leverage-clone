# 腾讯混元 AI 集成重构报告

## 📋 概述

已成功将项目从 Google Genkit 迁移到腾讯混元 SDK (v4.0+ with @cloudbase/node-sdk ^3.10.1)。

## 🎯 核心变更

### 1. 新增文件

#### `src/ai/hunyuan-client.ts` ✅
腾讯混元客户端统一接口，提供：
- **createHunyuanClient()**: 初始化混元客户端
- **getHunyuanClient()**: 单例模式获取客户端
- **generateWithHunyuan()**: 统一的 AI 生成接口
  - 自动扣除积分（10 积分 + token 费用）
  - 支持 system/user/assistant 角色消息
  - 返回 text 和 usage 信息
- **generateWithOpenAI()**: OpenAI fallback（用于特殊场景）

#### `test-ai-flow.js` ✅
测试脚本，包含 3 个测试场景：
1. Simple greeting test
2. Scenario-based conversation (设计师助手)
3. Intelligent routing scenario

#### `src/ai/flows/intelligent-routing-flow-new.ts` ✅
重构后的智能路由流程：
- 使用混元 AI 进行决策
- 基于 users status 分配设计师
- 温度设置 0.3 保证决策一致性
- JSON 格式输出解析
- Fallback 到最低队列设计师

### 2. 重构文件

#### `src/ai/flows/prompt-execution-flow.ts` ✅
**变更内容**：
- 移除 `import { ai } from '@/ai/genkit'`
- 移除 `import { z } from 'genkit'` → `import { z } from 'zod'`
- 添加 `import { generateWithHunyuan } from '@/ai/hunyuan-client'`
- 移除 `ai.defineFlow()` 包装，改为直接 async function
- 核心逻辑：
  ```typescript
  // 准备消息
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

  // 调用混元
  const result = await generateWithHunyuan({
    model: 'hunyuan-lite',
    messages: hunyuanMessages,
    temperature: temperature || 0.7,
    userId,
    actionType: scenario || promptKey || 'ai_generation',
  });
  ```
- **新增功能**: `testLlmConnection(connectionId)` - 测试 LLM 连接

#### `src/ai/flows/clarify-demand-details.ts` ⚠️
**变更内容**：
- 移除 Genkit 依赖
- 添加 OpenAI fallback 支持（通过 `generateWithOpenAI`）
- 更新 `intelligentRoutingFlow` 导入路径到新文件
- 保留现有业务逻辑（积分扣除、handoff 机制）

**注意事项**：
- 此文件使用 `executePrompt` 调用 AI，已通过 prompt-execution-flow 使用混元
- Handoff 逻辑使用新的 intelligentRoutingFlow

### 3. Package.json 更新 ✅

添加新脚本：
```json
{
  "scripts": {
    "test-ai-flow": "node test-ai-flow.js"
  }
}
```

## 🔧 技术实现细节

### 混元 SDK 配置

```typescript
const tencentcloud = require('tencentcloud-sdk-nodejs-hunyuan');
const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;

const client = new HunyuanClient({
  credential: {
    secretId: process.env.CLOUDBASE_SECRET_ID,
    secretKey: process.env.CLOUDBASE_SECRET_KEY,
  },
  region: 'ap-hongkong',
  profile: {
    httpProfile: {
      endpoint: 'hunyuan.tencentcloudapi.com',
    },
  },
});
```

### 积分扣除机制

每次 AI 调用自动执行：
- **基础费用**: -10 积分
- **Token 费用**: 每 1000 tokens 额外扣 1 积分
- **记录**: 自动写入 `points_transactions` 集合

```typescript
const totalAmount = -10 - Math.ceil(tokens / 1000);

await addDoc(collection(db, 'points_transactions'), {
  uid: userId,
  amount: totalAmount,
  type: 'consumption',
  action: actionType,
  reason: `AI服务调用 (${actionType})`,
  status: 'completed',
  createdAt: serverTimestamp(),
  metadata: { tokens, model: 'hunyuan' },
});
```

### 智能路由提示词结构

```typescript
const systemPrompt = `You are an intelligent routing AI for a design platform.

Your job is to analyze the user's request and available designers (基于 users status), then make the best routing decision.

STRATEGY:
${strategy.strategyText}

AVAILABLE DESIGNERS (status=active, aiAssistantEnabled=false):
[JSON array of designers]

DECISION RULES:
1. Prioritize specific designer requests
2. Consider status, queue size, skills, rating
3. Fallback if all designers busy

RESPONSE FORMAT (JSON only):
{
  "decision": "route_to_designer" or "fallback_to_ai",
  "designerId": "uid" (if routing),
  "reason": "explanation",
  "aiAssistantMessage": "message" (optional)
}`;
```

## ✅ 验证结果

### TypeScript 编译检查
```bash
npm run typecheck
✅ 无错误
```

### 测试方法
```bash
# 设置环境变量（.env 文件）
CLOUDBASE_SECRET_ID=your_secret_id
CLOUDBASE_SECRET_KEY=your_secret_key

# 运行测试
npm run test-ai-flow
```

## 📊 迁移对照表

| Genkit API | 混元 SDK | 说明 |
|------------|----------|------|
| `ai.generate()` | `generateWithHunyuan()` | 统一生成接口 |
| `ai.defineFlow()` | 直接 async function | 移除 Flow 包装 |
| `ai.definePrompt()` | 手动构建 messages | 不需要模板系统 |
| `z from 'genkit'` | `z from 'zod'` | Zod 独立使用 |
| `googleai/gemini-2.5-flash` | `hunyuan-lite` | 模型切换 |

## 🚀 下一步建议

1. **完成其他 flows 重构**：
   - `shopping-assistant.ts`
   - `demand-matching.ts`
   - `user-profiling.ts`
   - `supplier-data-analysis.ts`
   - 其他辅助 flows

2. **环境配置**：
   - 确保 `.env` 文件包含 `CLOUDBASE_SECRET_ID` 和 `CLOUDBASE_SECRET_KEY`
   - 可选：添加 `OPENAI_API_KEY` 用于 fallback

3. **测试验证**：
   - 运行 `npm run test-ai-flow` 验证基础功能
   - 在开发环境测试实际业务流程
   - 监控积分扣除是否正常

4. **清理旧代码**（可选）：
   - 移除 `src/ai/genkit.ts`（不再使用）
   - 移除 `@genkit-ai/googleai` 依赖（如不需要）
   - 更新 `genkit:dev` 和 `genkit:watch` 脚本

## ⚠️ 注意事项

1. **类型安全**: 所有新代码通过 TypeScript 严格检查
2. **向后兼容**: 保留了所有现有业务逻辑和数据结构
3. **错误处理**: 添加了完善的 try-catch 和 fallback 机制
4. **积分系统**: 自动集成，无需手动调用扣分逻辑

## 📝 文件清单

### 新增文件
- ✅ `src/ai/hunyuan-client.ts` (180 lines)
- ✅ `test-ai-flow.js` (120 lines)
- ✅ `src/ai/flows/intelligent-routing-flow-new.ts` (220 lines)

### 重构文件
- ✅ `src/ai/flows/prompt-execution-flow.ts` (422 lines → 移除 Genkit，使用混元)
- ⚠️ `src/ai/flows/clarify-demand-details.ts` (235 lines → 部分更新)

### 更新文件
- ✅ `package.json` (添加 test-ai-flow 脚本)

---

**总结**: 已成功完成核心 AI 流程从 Genkit 到腾讯混元 SDK 的迁移，保持了类型安全和业务逻辑完整性。
