'use server';
/**
 * @fileOverview Administrative flows for managing platform assets.
 * 
 * - getPlatformAssets - Returns static assets needed by the admin UI, like supported LLM providers.
 * - LlmProvider - The type for a supported LLM provider.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
