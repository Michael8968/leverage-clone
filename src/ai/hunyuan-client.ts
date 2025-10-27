/**
 * @fileOverview 统一的混元 AI 客户端封装（OpenAI 兼容）
 * 用于替代历史上的腾讯 SDK 直连，减少构建体积并统一接口。
 */

import { getOpenAIForHunyuan } from '@/utils/openai-hunyuan';

/**
 * 统一的 AI 生成接口，替代 Genkit 的 ai.generate()
 */
export interface HunyuanMessage {
  Role: 'system' | 'user' | 'assistant';
  Content: string;
}

export interface HunyuanGenerateOptions {
  model?: string;
  messages: HunyuanMessage[];
  temperature?: number;
  userId?: string; // 用于积分扣除
  actionType?: string; // 用于积分计算
}

export interface HunyuanGenerateResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 执行 Hunyuan AI 生成，并自动扣除积分
 */
export async function generateWithHunyuan(
  options: HunyuanGenerateOptions
): Promise<HunyuanGenerateResult> {
  const openai = getOpenAIForHunyuan();
  const model = options.model || process.env.HUNYUAN_MODEL || 'hunyuan-turbos-latest';

  // 将旧版消息格式转换为 OpenAI 消息数组
  const messages = options.messages.map(m => ({
    role: m.Role === 'user' ? 'user' : m.Role === 'assistant' ? 'assistant' : 'system',
    content: m.Content,
  })) as any;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    });
    const text = completion.choices?.[0]?.message?.content ?? '';
    const usage = completion.usage ? {
      promptTokens: completion.usage.prompt_tokens ?? 0,
      completionTokens: completion.usage.completion_tokens ?? 0,
      totalTokens: completion.usage.total_tokens ?? 0,
    } : undefined;

    // 此处不再进行积分扣除持久化，以避免引入 Firestore 依赖。需要时可在上层调用处统一处理。
    return { text, usage };
  } catch (error: any) {
    console.error('Hunyuan (OpenAI-compatible) API Error:', error);
    throw new Error(`Hunyuan AI generation failed: ${error?.message || 'unknown error'}`);
  }
}

/**
 * OpenAI Fallback（用于特定场景）
 */
export async function generateWithOpenAI(
  messages: { role: string; content: string }[],
  options?: { temperature?: number; model?: string }
): Promise<HunyuanGenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || 'gpt-4o-mini',
        messages,
        temperature: options?.temperature ?? 0.7,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage ? {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      totalTokens: data.usage.total_tokens ?? 0,
    } : undefined;
    return { text, usage };
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    throw new Error(`OpenAI generation failed: ${error?.message || 'unknown error'}`);
  }
}
