'use server';
/**
 * @fileOverview Administrative flows for managing platform assets.
 * 
 * - getPlatformAssets - Returns static assets needed by the admin UI, like supported LLM providers.
 * - LlmProvider - The type for a supported LLM provider.
 * - testLlmConnection - Tests the availability of a configured LLM connection.
 * - getPrompts - Returns a list of available prompts for selection in the UI.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePrompt } from './prompt-execution-flow';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const LlmProviderSchema = z.object({
    id: z.string(),
    providerName: z.string(),
    models: z.array(z.string()),
    apiBaseUrl: z.string().optional(),
});

export type LlmProvider = z.infer<typeof LlmProviderSchema>;

const PlatformAssetsSchema = z.object({
    providers: z.array(LlmProviderSchema),
});

export type PlatformAssets = z.infer<typeof PlatformAssetsSchema>;

// This is the single source of truth for supported providers and their models.
const SUPPORTED_PROVIDERS: LlmProvider[] = [
    { id: 'google', providerName: 'Google', models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest', 'gemini-2.0-flash'], apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models' },
    { id: 'openai', providerName: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4.1', 'gpt-4.5'], apiBaseUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', providerName: 'Anthropic', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-4-opus', 'claude-3.7-sonnet'], apiBaseUrl: 'https://api.anthropic.com/v1' },
    { id: 'mistral-ai', providerName: 'Mistral AI', models: ['mistral-large-latest', 'mistral-medium', 'mistral-small-latest'], apiBaseUrl: 'https://api.mistral.ai/v1' },
    { id: 'meta', providerName: 'Meta', models: ['llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b'], apiBaseUrl: 'https://api.meta.com/v1' }, // Note: API URL is hypothetical
    { id: 'deepseek', providerName: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-v3.1'], apiBaseUrl: 'https://api.deepseek.com/v1' },
    { id: 'alibaba', providerName: 'Alibaba', models: ['qwen3', 'qwen2.5-max', 'qwen-q-32b'], apiBaseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation' }, // Note: API URL is for a specific service
    { id: 'tencent', providerName: 'Tencent', models: ['hunyuan-turbo-20250226'], apiBaseUrl: 'https://hunyuan.cloud.tencent.com/hyllm/v1' }, // Note: API URL is hypothetical
    { id: 'bytedance', providerName: 'ByteDance', models: ['doubao-pro'], apiBaseUrl: 'https://api.bytedance.com/v1' }, // Note: API URL is hypothetical
    { id: 'minimax', providerName: 'MiniMax', models: ['minimax-text-01', 'minimax-vl-01'], apiBaseUrl: 'https://api.minimax.chat/v1' }, // Note: API URL is hypothetical
    { id: 'iflytek', providerName: 'iFlytek', models: ['spark-v4'], apiBaseUrl: 'https://api.iflytek.com/v1' }, // Note: API URL is hypothetical
    { id: 'moonshot-ai', providerName: 'Moonshot AI', models: ['kimi-k1'], apiBaseUrl: 'https://api.moonshot.cn/v1' },
];


export async function getPlatformAssets(): Promise<PlatformAssets> {
  return getPlatformAssetsFlow();
}

const getPlatformAssetsFlow = ai.defineFlow(
  {
    name: 'getPlatformAssetsFlow',
    inputSchema: z.void(),
    outputSchema: PlatformAssetsSchema,
  },
  async () => {
    return { providers: SUPPORTED_PROVIDERS };
  }
);


const TestLlmConnectionInputSchema = z.object({
    modelId: z.string(),
});

const TestLlmConnectionOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
});

export async function testLlmConnection(input: z.infer<typeof TestLlmConnectionInputSchema>): Promise<z.infer<typeof TestLlmConnectionOutputSchema>> {
    return testLlmConnectionFlow(input);
}

const testLlmConnectionFlow = ai.defineFlow(
    {
        name: 'testLlmConnectionFlow',
        inputSchema: TestLlmConnectionInputSchema,
        outputSchema: TestLlmConnectionOutputSchema,
    },
    async ({ modelId }) => {
        try {
            const testMessages = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say "hello".' },
            ];
            const result = await executePrompt({ modelId, messages: testMessages });
            
            if (result.text) {
                return { success: true, message: `连接成功！模型返回: "${result.text}"` };
            } else {
                throw new Error("模型返回了空内容。");
            }

        } catch (error: any) {
            console.error(`LLM connection test failed for modelId: ${modelId}`, error);
            return { success: false, message: `连接失败: ${error.message}` };
        }
    }
);


const PromptInfoSchema = z.object({
    name: z.string(),
    promptKey: z.string(),
});
const GetPromptsOutputSchema = z.object({
    prompts: z.array(PromptInfoSchema),
});
export type GetPromptsOutput = z.infer<typeof GetPromptsOutputSchema>;

export async function getPrompts(): Promise<GetPromptsOutput> {
    return getPromptsFlow();
}

const getPromptsFlow = ai.defineFlow({
    name: 'getPromptsFlow',
    inputSchema: z.void(),
    outputSchema: GetPromptsOutputSchema
}, async () => {
    const promptsCollection = collection(db, 'prompts');
    const q = query(
        promptsCollection, 
        where("status", "==", "生效中"), 
        where("scope", "==", "通用"),
        orderBy("name")
    );
    const snapshot = await getDocs(q);
    const prompts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            name: data.name,
            promptKey: data.promptKey,
        };
    });
    return { prompts };
});
