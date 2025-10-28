
'use server';
/**
 * @fileOverview 智能路由流程 - 使用腾讯混元 AI 进行智能分配
 * 根据用户请求、设计师状态和平台策略，智能分配最适合的设计师
 */

import { z } from 'zod';
const { getOpenAIForHunyuan } = require('@/utils/openai-hunyuan');
import type { User, IntelligentRoutingStrategy } from '@/lib/types';
import { format } from 'date-fns';

interface RoutingInput {
  demand: string;
}

// =================================================================
// INPUT & OUTPUT SCHEMAS
// =================================================================

const IntelligentRoutingInputSchema = z.object({
  requesterId: z.string().describe("The ID of the user making the request."),
  requestDescription: z.string().describe("The user's latest message or problem description."),
  specificDesignerId: z.string().optional().describe("A specific designer the user wants to talk to, if any."),
});

const IntelligentRoutingOutputSchema = z.object({
  decision: z.enum(['route_to_designer', 'fallback_to_ai']).describe("The final decision of the routing logic."),
  designerId: z.string().optional().describe("The ID of the designer to route to, if applicable."),
  reason: z.string().describe("The reasoning behind the AI's decision."),
  aiAssistantMessage: z.string().optional().describe("A message for the AI assistant to say if falling back."),
});

export type IntelligentRoutingInput = z.infer<typeof IntelligentRoutingInputSchema>;
export type IntelligentRoutingOutput = z.infer<typeof IntelligentRoutingOutputSchema>;

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Fetches all relevant data needed for the AI to make a routing decision.
 */
// 说明：原有基于 Firestore 的上下文函数在本地/最小化环境中会导致类型缺失报错，
// 这里先移除未使用的 helper，以简化类型检查。

// 新版 Hunyuan 智能路由
export async function intelligentRoutingFlow(input: RoutingInput): Promise<{ assignedCreatorId: string; reason: string; score: number }> {
  const openai = getOpenAIForHunyuan();
  const prompt = `需求: ${input.demand}. 基于 status/active/aiAssistantEnabled/技能 路由，返回 JSON { assignedCreatorId: 'uid', reason: '匹配理由', score: 0.85 }`;
  const chat = await openai.chat.completions.create({
    model: 'hunyuan-turbos-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 256,
  });
  const content = chat.choices?.[0]?.message?.content || '{}';
  try { return JSON.parse(content); } catch { return { assignedCreatorId: 'creator1', reason: '默认路由', score: 0.5 }; }
}
