
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
                providerName: "Google",
                models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-1.0-pro", "gemini-2.5-flash-image-preview"]
            },
            {
                providerName: "OpenAI",
                models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
            },
            {
                providerName: "Anthropic",
                models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229"]
            },
             {
                providerName: "Tripo3D",
                models: ["text_to_model"]
            }
        ];
        return { providers: SUPPORTED_PROVIDERS };
    }
);

export const testLlmConnection = ai.defineFlow(
    { 
        name: 'testLlmConnection', 
        inputSchema: z.object({ modelId: z.string() }), 
        outputSchema: z.object({ success: z.boolean(), message: z.string() }) 
    }, 
    async ({ modelId }) => {
        try {
            const result = await executePrompt({
                modelId: modelId,
                messages: [{ role: 'user', content: 'Hello!' }],
                temperature: 0.1,
            });

            if (result && result.text) {
                return { success: true, message: `模型响应: ${result.text.substring(0, 50)}...` };
            } else {
                return { success: false, message: '模型返回了空响应。' };
            }
        } catch (error: any) {
            return { success: false, message: error.message || '发生未知错误。' };
        }
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

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as LlmConnection;
    }
);
