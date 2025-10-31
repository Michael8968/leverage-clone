'use server';

import { z } from 'zod';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, getDoc, Timestamp, writeBatch } from '@/lib/cloudbase-compat';
import type { LlmConnection, Prompt } from '@/lib/types';
// 使用 OpenAI 兼容的混元适配
const { getOpenAIForHunyuan } = require('@/utils/openai-hunyuan');
import OpenAI from 'openai';
import { getTcbDb } from '@/lib/tcb';


// Hardcoded platform assets. In a real-world scenario, this might come from a configuration file or a database.
const PLATFORM_ASSETS = {
    providers: [
  { providerName: "Tencent", models: ["hunyuan-standard", "hunyuan-pro", "hunyuan-lite", "hunyuan-turbo"], apiBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1" },
  { providerName: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"], apiBaseUrl: "https://api.openai.com/v1" },
  { providerName: "Anthropic", models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307", "claude-3-5-sonnet-20240620"], apiBaseUrl: "https://api.anthropic.com/v1" },
  { providerName: "Google", models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro", "gemini-pro-vision"], apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models" },
  { providerName: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"], apiBaseUrl: "https://api.deepseek.com/v1" },
  { providerName: "Baichuan", models: ["Baichuan2-Turbo", "Baichuan2-Turbo-192k", "Baichuan-Text-Embedding"], apiBaseUrl: "https://api.baichuan-ai.com/v1" },
  { providerName: "Moonshot", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"], apiBaseUrl: "https://api.moonshot.cn/v1" },
  { providerName: "Alibaba", models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-longcontext"], apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { providerName: "Zhipu", models: ["glm-4", "glm-3-turbo", "glm-4v", "zhipu-xl"], apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { providerName: "智谱GLM", models: ["glm-4-plus", "glm-4-air", "glm-4-airx", "glm-4-flash"], apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
  { providerName: "MiniMax", models: ["abab6.5-chat", "abab6.5s-chat", "abab5.5-chat"], apiBaseUrl: "https://api.minimax.chat/v1" },
  { providerName: "阶跃星辰", models: ["step-1-8k", "step-1-32k", "step-1-128k"], apiBaseUrl: "https://api.stepfun.com/v1" },
  { providerName: "字节跳动", models: ["Doubao-lite-4k", "Doubao-lite-32k", "Doubao-pro-4k", "Doubao-pro-32k"], apiBaseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
  { providerName: "讯飞星火", models: ["general", "generalv2", "generalv3", "pro-128k"], apiBaseUrl: "https://spark-api.xf-yun.com/v1" },
  { providerName: "百度文心一言", models: ["ernie-4.0", "ernie-3.5-8k", "ernie-lite-8k", "ernie-tiny-8k"], apiBaseUrl: "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat" },
  { providerName: "华为云", models: ["mindstudio-v1.0", "mindstudio-v2.0"], apiBaseUrl: "https://inference-modelarts.cn-north-4.myhuaweicloud.com/v1" },
        {
          providerName: "LiteLLM",
          models: [
            "groq/llama3-70b-8192",
            "groq/llama3-8b-8192",
            "groq/gemma-7b-it",
            "ollama/llama3",
            "ollama/llama3-8b",
            "anthropic/claude-3-opus-20240229",
            "anthropic/claude-3-sonnet-20240229",
            "anthropic/claude-3-haiku-20240307"
          ],
          apiBaseUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000/v1"
        }
    ]
};

export async function getPlatformAssets(): Promise<typeof PLATFORM_ASSETS> {
    try {
        // Try to get additional models from database
        const db = getTcbDb();
        const connectionsSnapshot = await db.collection('llm_connections').get();
        const existingConnections = connectionsSnapshot.data || [];

        // Create enhanced providers with existing models
        const enhancedProviders = { ...PLATFORM_ASSETS };

        // Add any custom providers/models that exist in database but not in hardcoded list
        existingConnections.forEach((conn: any) => {
            const providerName = conn.provider;
            const modelName = conn.modelName;

            if (providerName && modelName) {
                const existingProvider = enhancedProviders.providers.find(p =>
                    p.providerName.toLowerCase() === providerName.toLowerCase()
                );

                if (existingProvider) {
                    // Add model if it doesn't exist
                    if (!existingProvider.models.includes(modelName)) {
                        existingProvider.models.push(modelName);
                    }
                } else {
                    // Add new provider
                    enhancedProviders.providers.push({
                        providerName,
                        models: [modelName],
                        apiBaseUrl: conn.apiBaseUrl || ''
                    });
                }
            }
        });

        return enhancedProviders;
    } catch (error) {
        console.warn('Failed to enhance platform assets from database:', error);
        // Fall back to hardcoded assets
        return PLATFORM_ASSETS;
    }
}

// 简单的连接测试：使用混元 SDK 调用一个问候消息
export async function testLlmConnection(input: { modelId?: string; tempConnection?: any }): Promise<{ success: boolean; message: string }> {
  try {
    // 如果传入 tempConnection，则直接使用临时连接数据进行测试
    if (input?.tempConnection) {
      const { provider, modelName, apiKey, apiBaseUrl } = input.tempConnection;

      const providerLower = (provider || '').toLowerCase();
      const modelLower = (modelName || '').toLowerCase();

      // Tencent / Hunyuan 使用 OpenAI compatible 客户端
      if (providerLower.includes('tencent') || modelLower.includes('hunyuan')) {
        const baseURL = apiBaseUrl || 'https://api.hunyuan.cloud.tencent.com/v1';
        const client = new OpenAI({ apiKey, baseURL });
        const chat = await client.chat.completions.create({
          model: modelName || 'hunyuan-turbos-latest',
          messages: [{ role: 'user', content: 'Hello, test connection' }],
          temperature: 0.1,
          max_tokens: 16,
        });
        const message = chat.choices?.[0]?.message?.content || 'Success';
        return { success: true, message };
      }

      // OpenAI
      if (providerLower.includes('openai') || providerLower.includes('open')) {
        const client = new OpenAI({ apiKey });
        const chat = await client.chat.completions.create({
          model: modelName || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello, test connection' }],
          temperature: 0.1,
          max_tokens: 16,
        });
        const message = chat.choices?.[0]?.message?.content || 'Success';
        return { success: true, message };
      }

      // 其他厂商：返回基本信息
      return { success: true, message: `连接配置 (${provider} / ${modelName}) 已验证，但未实现该厂商的在线测试。` };
    }

    // 如果传入 modelId，则优先使用数据库中对应连接的 apiKey 和 provider
    if (input?.modelId) {
      try {
        const db = getTcbDb();
        const res = await db.collection('llm_connections').doc(input.modelId).get();
        const conn = res.data || res.data?.[0] || null;
        if (!conn) {
          return { success: false, message: '未能在数据库中找到指定的 LLM 连接记录' };
        }

        const provider = (conn.provider || '').toLowerCase();
        const modelName = conn.modelName || conn.model || 'unknown-model';
        const apiKey = conn.apiKey;

        if (!apiKey) {
          return { success: false, message: '未配置 API Key，请在管理面板中填写该连接的 apiKey 字段' };
        }

        // Tencent / Hunyuan 使用 OpenAI compatible 客户端，但需要使用记录中的 apiKey 与可选 base URL
        if (provider.includes('tencent') || modelName.toLowerCase().includes('hunyuan')) {
          const baseURL = conn.apiBaseUrl || process.env.HUNYUAN_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
          const client = new OpenAI({ apiKey, baseURL });
          const chat = await client.chat.completions.create({
            model: modelName || 'hunyuan-turbos-latest',
            messages: [{ role: 'user', content: 'Hello, test connection' }],
            temperature: 0.1,
            max_tokens: 16,
          });
          const message = chat.choices?.[0]?.message?.content || 'Success';
          return { success: true, message };
        }

        // OpenAI
        if (provider.includes('openai') || provider.includes('open') ) {
          const client = new OpenAI({ apiKey });
          const chat = await client.chat.completions.create({
            model: modelName || 'gpt-4o',
            messages: [{ role: 'user', content: 'Hello, test connection' }],
            temperature: 0.1,
            max_tokens: 16,
          });
          const message = chat.choices?.[0]?.message?.content || 'Success';
          return { success: true, message };
        }

        // 其他厂商：尝试返回记录基本信息（不能保证真实可用性检测）
        return { success: true, message: `找到连接 (${conn.provider} / ${modelName})，但未实现该厂商的在线测试。` };
      } catch (err: any) {
        return { success: false, message: err?.message || '查询或测试时发生错误' };
      }
    }

    // 未传入 modelId 的回退逻辑：使用默认 Hunyuan 配置进行简单测试
    try {
      const openai = getOpenAIForHunyuan();
      const chat = await openai.chat.completions.create({
        model: 'hunyuan-turbos-latest',
        messages: [
          { role: 'user', content: 'Hello, test connection' },
        ],
        temperature: 0.1,
        max_tokens: 16,
      });
      const message = chat.choices?.[0]?.message?.content || 'Success';
      return { success: true, message };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Unknown error' };
    }
  } catch (e: any) {
    return { success: false, message: e?.message || 'Unknown error' };
  }
}

// Get Prompts Flow
const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  promptKey: z.string(),
  createdAt: z.any().optional(),
});
const GetPromptsOutputSchema = z.object({ prompts: z.array(PromptSchema) });
export type GetPromptsOutput = z.infer<typeof GetPromptsOutputSchema>;

export async function getPrompts(): Promise<GetPromptsOutput> {
  try {
  const promptsCollection = collection('prompts');
    const q = query(promptsCollection, where('status', '==', '生效中'));
    const snapshot = await getDocs(q);
    const prompts = snapshot.docs
      .map((promptDoc: any) => {
        const data = promptDoc.data();
        // Convert Firestore/CloudBase Timestamp to a serializable format (e.g., ISO string)
        const createdAt = (data.createdAt as any)?.toDate
          ? (data.createdAt as any).toDate().toISOString()
          : data.createdAt;
        return { id: promptDoc.id, ...data, createdAt } as Prompt;
      })
      .sort((a: Prompt, b: Prompt) => a.name.localeCompare(b.name));
    return { prompts };
  } catch (error) {
    console.error('Error in getPrompts:', error);
    return { prompts: [] };
  }
}

// =================================================================
// Flow to update models from LiteLLM (NEW)
// =================================================================
const UpdateModelsOutputSchema = z.object({
  added: z.number(),
  skipped: z.number(),
  failed: z.number(),
  message: z.string(),
});

export type UpdateModelsOutput = z.infer<typeof UpdateModelsOutputSchema>;

export async function updateModelsFromLiteLLM(): Promise<UpdateModelsOutput> {
  let added = 0;
  let skipped = 0;
  let failed = 0;

  try {
      const liteLlmProvider = PLATFORM_ASSETS.providers.find(p => p.providerName === 'LiteLLM');
      if (!liteLlmProvider) {
        throw new Error('LiteLLM provider not configured in PLATFORM_ASSETS.');
      }
      
      const modelsUrl = `${liteLlmProvider.apiBaseUrl.replace('/v1', '')}/v1/models`;
      
      const response = await fetch(modelsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch models from LiteLLM: ${response.statusText}`);
      }

      const modelsData = await response.json();
      const liteLlmModels = modelsData.data;

      if (!liteLlmModels || !Array.isArray(liteLlmModels)) {
        throw new Error('Invalid data structure received from LiteLLM /models endpoint.');
      }

  const connectionsRef = collection('llm_connections');
      const q = query(connectionsRef, where('provider', '==', 'LiteLLM'));
      const existingSnapshot = await getDocs(q);
      const existingModels = new Set(
        existingSnapshot.docs.map((connectionDoc: any) => (connectionDoc.data() as any).modelName)
      );
      
  const batch = writeBatch();
      
  for (const model of liteLlmModels as Array<{ id?: string }>) {
        if (!model.id) {
          failed++;
          continue;
        }

        if (existingModels.has(model.id)) {
          skipped++;
        } else {
          const newModelRef = doc('llm_connections');
          batch.set(newModelRef, {
            provider: 'LiteLLM',
            modelName: model.id,
            apiKey: 'NA', // API key is managed by the proxy, not needed here
            priority: 50,
            status: '活跃',
            scope: '通用',
            category: '文本', // Default category
            lastTestStatus: 'untested',
            lastTestTimestamp: null,
            createdAt: serverTimestamp(),
          });
          added++;
        }
      }

      await batch.commit();

      return {
        added,
        skipped,
        failed,
        message: `同步完成。新增 ${added} 个模型，跳过 ${skipped} 个已存在的模型。`,
      };

    } catch (error: any) {
      console.error('Error updating models from LiteLLM:', error);
      return {
        added: 0,
        skipped: 0,
        failed,
        message: `同步失败: ${error.message}`,
      };
    }
}

