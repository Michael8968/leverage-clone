
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, AIScenarioRules, Prompt } from '@/lib/types';
import { getPlatformAssets, getDefaultLlmConnection } from './admin-management-flows';

// ... (existing schemas, isRuleSetValid, findAvailableModels)
const PromptMessageSchema = z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string() });
const PromptExecutionInputSchema = z.object({ /* ... */ });
const PromptExecutionOutputSchema = z.object({ text: z.string() });
async function isRuleSetValid(rules: AIScenarioRules, userId?: string): Promise<boolean> { /* ... */ return true; }
async function findAvailableModels(promptDoc?: Prompt, allConnections?: LlmConnection[]): Promise<LlmConnection[]> { /* ... */ return []; }

// =================================================================
// Core Flow: executePrompt (Upgraded with Unified Proxy Logic)
// =================================================================
export async function executePrompt(input: z.infer<typeof PromptExecutionInputSchema>): Promise<z.infer<typeof PromptExecutionOutputSchema>> {
  return executePromptFlow(input);
}

const executePromptFlow = ai.defineFlow(
  {
    name: 'executePromptFlow',
    inputSchema: PromptExecutionInputSchema,
    outputSchema: PromptExecutionOutputSchema,
  },
  async ({ modelId, promptKey, messages, temperature, scenario, userId }) => {
    // 1. Determine target prompt and models (existing logic)
    // ...
    let finalModelId = modelId;
    let finalPromptKey = promptKey;
    // ... (logic to resolve scenario to finalPromptKey)
    const modelsToTry = await findAvailableModels(/* ... */);
    if (modelsToTry.length === 0) throw new Error("No models match criteria.");

    // 2. Loop with Failover
    const assets = await getPlatformAssets();
    const errors: any[] = [];
    for (const connection of modelsToTry) {
        try {
            const providerInfo = assets.providers.find(p => p.providerName.toLowerCase() === connection.provider.toLowerCase());
            if (!providerInfo) throw new Error(`Provider "${connection.provider}" is not configured.`);
            
            const { provider, modelName, apiKey } = connection;
            const { apiBaseUrl } = providerInfo;
            
            let requestUrl: string;
            let requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            let requestBody: any;

            // 3. (KEY CHANGE) Simplified Switch for Native vs. Proxy
            switch (provider.toLowerCase()) {
                case 'google':
                    requestUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
                    // ... (Google-specific body)
                    break;
                
                // All other providers use the OpenAI-compatible format
                case 'openai':
                case 'deepseek':
                case 'litellm':
                default:
                    requestUrl = `${apiBaseUrl}/chat/completions`;
                    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
                    const systemPrompt = messages.find(m => m.role === 'system');
                    const conversation = messages.filter(m => m.role !== 'system');
                    const finalMessages = systemPrompt ? [systemPrompt, ...conversation] : conversation;
                    requestBody = { model: modelName, messages: finalMessages, temperature };
                    break;
            }

            // 4. Native fetch and response handling (existing logic)
            const response = await fetch(requestUrl, { method: 'POST', headers: requestHeaders, body: JSON.stringify(requestBody) });
            if (!response.ok) throw new Error(`API returned ${response.status}: ${await response.text()}`);
            const responseData = await response.json();
            
            let outputText = '';
            switch (provider.toLowerCase()) {
                case 'google':
                    outputText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    break;
                default: // OpenAI-compatible response path
                    outputText = responseData.choices?.[0]?.message?.content || '';
                    break;
            }

            if (outputText) return { text: outputText };
        } catch (error) {
            console.error(`Attempt with model ${connection.modelName} failed:`, error);
            errors.push({ modelName: connection.modelName, error: (error as Error).message });
        }
    }

    throw new Error(`All available models failed. Errors: ${JSON.stringify(errors)}`);
  }
);
