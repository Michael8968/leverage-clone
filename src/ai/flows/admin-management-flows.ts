
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, LlmProvider as LlmProviderType } from '@/lib/types';
import { executePrompt } from './prompt-execution-flow';


const LlmProviderSchema = z.object({
    providerName: z.string(),
    models: z.array(z.string()),
});

export const getPlatformAssets = ai.defineFlow(
    { 
        name: 'getPlatformAssets', 
        inputSchema: z.null(), 
        outputSchema: z.object({ providers: z.array(LlmProviderSchema) }) 
    }, 
    async () => {
        // In a real-world scenario, this might be fetched from a database
        // or a configuration file. For now, it's hardcoded as per the design.
        const SUPPORTED_PROVIDERS: LlmProviderType[] = [
            {
                providerName: "OpenAI",
                models: ["gpt-5", "gpt-4.5", "gpt-4.1", "gpt-4o", "gpt-4", "gpt-3.5-turbo"]
            },
            {
                providerName: "Google",
                models: ["gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-1.0-pro", "gemma-3-9b", "gemma-3-2b"]
            },
            {
                providerName: "Anthropic",
                models: ["claude-4-opus", "claude-4-sonnet", "claude-3.7-sonnet"]
            },
            {
                providerName: "xAI",
                models: ["grok-3", "grok-3-mini"]
            },
            {
                providerName: "Mistral AI",
                models: ["mistral-large-2", "mistral-3-medium"]
            },
            {
                providerName: "Meta",
                models: ["llama-3.1", "llama-4"]
            },
            {
                providerName: "IBM",
                models: ["granite-3.3", "granite-3.2"]
            },
            {
                providerName: "DeepSeek",
                models: ["deepseek-v3.1", "deepseek-rl", "deepseek-v3-0324"]
            },
            {
                providerName: "Alibaba",
                models: ["qwen-3", "qwen2.5-max", "qwen-q-32b"]
            },
            {
                providerName: "Tencent",
                models: ["hunyuan-turbo", "hunyuan-turbo-20250226"]
            },
            {
                providerName: "ByteDance",
                models: ["doubao-pro-2025"]
            },
            {
                providerName: "MiniMax",
                models: ["minimax-text-01", "minimax-vl-01"]
            },
            {
                providerName: "iFlytek",
                models: ["spark-v4"]
            },
            {
                providerName: "Moonshot AI",
                models: ["kimi-k1"]
            },
            {
                providerName: "Tripo3D",
                models: ["text_to_model"]
            }
        ];
        return { providers: SUPPORTED_PROVIDERS };
    }
);

// This flow now calls the internal /api/generate proxy route.
export const testLlmConnection = ai.defineFlow(
    {
        name: 'testLlmConnection',
        inputSchema: z.object({ modelId: z.string() }),
        outputSchema: z.object({ success: z.boolean(), message: z.string() })
    },
    async ({ modelId }) => {
        const modelRef = doc(db, 'llm_connections', modelId);
        let resultStatus: 'success' | 'failed' = 'failed';
        let resultMessage = '';

        try {
            const result = await executePrompt({
                modelId: modelId,
                messages: [{ role: 'user', content: 'Hello!' }],
                temperature: 0.1,
            });

            if (result && result.text) {
                const responseSnippet = result.text.substring(0, 50);
                resultStatus = 'success';
                resultMessage = `模型响应: ${responseSnippet}...`;
            } else {
                resultMessage = '连接成功，但模型返回了空响应。';
            }
        } catch (error: any) {
            console.error(`[testLlmConnection] Error testing model ${modelId}:`, error);
            resultMessage = error.message || '发生未知错误。';
        }

        // Persist the test result to Firestore
        try {
             await updateDoc(modelRef, {
                lastTestStatus: resultStatus,
                lastTestTimestamp: serverTimestamp()
            });
        } catch (dbError) {
             console.error(`[testLlmConnection] Failed to persist test result for model ${modelId}:`, dbError);
             // Don't overwrite the original error message, but log this persistence failure.
        }

        return { success: resultStatus === 'success', message: resultMessage };
    }
);



// =================================================================
// Flow to get Prompts
// =================================================================

const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  promptKey: z.string(),
  description: z.string(),
});

const GetPromptsOutputSchema = z.object({
  prompts: z.array(PromptSchema),
});
export type GetPromptsOutput = z.infer<typeof GetPromptsOutputSchema>;

export async function getPrompts(): Promise<GetPromptsOutput> {
    return getPromptsFlow();
}

const getPromptsFlow = ai.defineFlow(
    {
        name: 'getPromptsFlow',
        outputSchema: GetPromptsOutputSchema,
    },
    async () => {
        const promptsCollection = collection(db, 'prompts');
        const q = query(promptsCollection, orderBy('name'));
        const snapshot = await getDocs(q);
        const prompts = snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            promptKey: doc.data().promptKey,
            description: doc.data().description,
        }));
        return { prompts };
    }
);


// =================================================================
// Flow to get the System's Default LLM Connection
// =================================================================

const LlmConnectionSchema = z.object({
    id: z.string(),
    provider: z.string(),
    modelName: z.string(),
    apiKey: z.string(),
    priority: z.number(),
    status: z.string(),
    scope: z.string().optional(),
    category: z.string().optional(),
});

export const getDefaultLlmConnection = ai.defineFlow(
    {
        name: 'getDefaultLlmConnection',
        inputSchema: z.null(),
        outputSchema: LlmConnectionSchema.optional(), // It might not find any
    },
    async () => {
        const connectionsRef = collection(db, 'llm_connections');
        // This query is now efficient thanks to the composite index.
        const q = query(
            connectionsRef,
            where('status', '==', '活跃'),
            orderBy('priority', 'asc'),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.warn("No active LLM connections found to serve as default.");
            return undefined;
        }

        const defaultConnection = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as LlmConnection;
        return defaultConnection;
    }
);
