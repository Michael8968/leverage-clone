'use server';
/**
 * @fileOverview Administrative flows for managing platform assets.
 * 
 * - getPlatformAssets - Returns static assets needed by the admin UI, like supported LLM providers.
 * - LlmProvider - The type for a supported LLM provider.
 * - testLlmConnection - Tests the availability of a configured LLM connection.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePrompt } from './prompt-execution-flow';

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
    { id: 'google', providerName: 'Google', models: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'], apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models' },
    { id: 'deepseek', providerName: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'], apiBaseUrl: 'https://api.deepseek.com/v1' },
    { id: 'openai', providerName: 'OpenAI', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'], apiBaseUrl: 'https://api.openai.com/v1' },
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
