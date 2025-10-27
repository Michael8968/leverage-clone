'use server';

import { z } from 'zod';
import type { PointsTransaction } from '@/lib/types';
import { getPointsStore } from '@/lib/datastore';
// 使用 JS 版本以确保在 Node 运行测试时无类型依赖
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getOpenAIForHunyuan } = require('@/utils/openai-hunyuan');

// 有效且精简的执行函数（修复损坏的文件内容）
const PromptInputSchema = z.object({
  prompt: z.string(),
  scenario: z.string().optional(),
  userId: z.string(),
});

/**
 * 扣减用户积分并记录交易
 * @param userId 用户ID
 * @param amount 扣减金额（正数）
 * @param reason 扣减原因
 */
async function deductUserPoints(userId: string, amount: number, reason: string): Promise<void> {
  const store = getPointsStore();
  try {
    const meta: Partial<PointsTransaction> = { llm_action: 'prompt_execution' };
    await store.deduct(userId, amount, reason, meta);
  } catch (error) {
    console.error('积分扣减失败:', error);
    // 非关键路径，不影响 AI 执行
  }
}

export async function executePrompt(input: { prompt: string; scenario?: string; userId: string }): Promise<{ output: string; cost: number }> {
  const parsed = PromptInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error('Invalid input: ' + JSON.stringify(parsed.error.format()));
  }
  const { prompt, scenario, userId } = parsed.data;

  // 优先使用 OpenAI 兼容的混元（通过 .env 配置）
  try {
    const openai = getOpenAIForHunyuan();
    const chat = await openai.chat.completions.create({
      model: 'hunyuan-turbos-latest',
      messages: [
        { role: 'system', content: scenario || '默认助手' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
    const text = chat.choices?.[0]?.message?.content || '';
    
    // 执行积分扣减
    const cost = 10; // 每次执行固定消耗 10 积分
    await deductUserPoints(userId, cost, `AI提示词执行: ${scenario || '默认助手'}`);
    
    return { output: text || 'Success', cost };
  } catch (error: any) {
    // 新策略：无可用 LLM 时直接提示
    throw new Error('请至少先配置一个可用的LLM连接');
  }
}

// 注：连接测试函数已在 admin-management-flows.ts 中提供，这里不再重复定义。
