'use server';

import { z } from 'zod';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, getDoc, Timestamp, writeBatch } from '@/lib/cloudbase-compat';
import type { LlmConnection, Prompt } from '@/lib/types';
// 使用 OpenAI 兼容的混元适配
const { getOpenAIForHunyuan } = require('@/utils/openai-hunyuan');


// Hardcoded platform assets. In a real-world scenario, this might come from a configuration file or a database.
const PLATFORM_ASSETS = {
    providers: [
        { providerName: "Google", models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-pro", "gemini-pro-vision"], apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models" },
        { providerName: "OpenAI", models: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-4-turbo-preview", "gpt-3.5-turbo", "gpt-3.5-turbo-instruct"], apiBaseUrl: "https://api.openai.com/v1" },
        { providerName: "DeepSeek", models: ["deepseek-chat", "deepseek-coder"], apiBaseUrl: "https://api.deepseek.com/v1" },
        { providerName: "Tencent", models: ["hunyuan-standard", "hunyuan-pro"], apiBaseUrl: "https://hunyuan.tencentcloudapi.com" },
        { 
            providerName: "LiteLLM", 
            models: [
                "groq/llama3-70b-8192", 
                "groq/llama3-8b-8192",
                "groq/gemma-7b-it",
                "ollama/llama3", 
                "anthropic/claude-3-opus-20240229",
                "anthropic/claude-3-sonnet-20240229",
                "anthropic/claude-3-haiku-20240307"
            ], 
            apiBaseUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000/v1" 
        },
        { providerName: "Moonshot", models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"], apiBaseUrl: "https://api.moonshot.cn/v1" },
        { providerName: "Baichuan", models: ["Baichuan2-Turbo", "Baichuan2-Turbo-192k", "Baichuan-Text-Embedding"], apiBaseUrl: "https://api.baichuan-ai.com/v1" },
        { providerName: "Zhipu", models: ["glm-4", "glm-3-turbo"], apiBaseUrl: "https://open.bigmodel.cn/api/paas/v4" },
        { providerName: "Alibaba", models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-max-longcontext"], apiBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    ]
};

export async function getPlatformAssets(): Promise<typeof PLATFORM_ASSETS> {
    return PLATFORM_ASSETS;
}

// 简单的连接测试：使用混元 SDK 调用一个问候消息
export async function testLlmConnection(_input: { modelId?: string }): Promise<{ success: boolean; message: string }> {
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

