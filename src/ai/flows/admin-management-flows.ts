
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, LlmProvider as LlmProviderType } from '@/lib/types';


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
                models: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"]
            },
            {
                providerName: "Google",
                models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-1.0-pro"]
            },
            {
                providerName: "Anthropic",
                models: ["claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
            },
            {
                providerName: "DeepSeek",
                models: ["deepseek-chat", "deepseek-coder"]
            },
            {
                providerName: "Tripo3D",
                models: ["text_to_model"]
            },
            // Add a generic proxy option
            {
                providerName: "LiteLLM-Proxy",
                models: [] // Allow user to input any model
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
        const modelRef = doc(db, 'llm_connections', modelId);
        const modelSnap = await getDoc(modelRef);
        if (!modelSnap.exists()) {
            return { success: false, message: "未找到指定的模型连接配置。" };
        }
        const modelConfig = modelSnap.data() as LlmConnection;

        let resultStatus: 'success' | 'failed' = 'failed';
        let resultMessage = '';

        try {
            // This logic now directly calls the external service via our proxy,
            // but with a very simple, clean payload, ONLY for testing.
            const proxyUrl = process.env.LITELLM_PROXY_URL;
            if (!proxyUrl) {
                throw new Error('代理URL (LITELLM_PROXY_URL) 未在环境变量中配置。');
            }
            
            const testPayload = {
                model: modelConfig.modelName,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
            };

            const response = await fetch(`${proxyUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${modelConfig.apiKey}`,
                },
                body: JSON.stringify(testPayload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                try {
                    const errorJson = JSON.parse(errorBody);
                    throw new Error(errorJson.message || `API 返回错误 (状态 ${response.status}): ${errorBody}`);
                } catch {
                     throw new Error(`API 返回错误 (状态 ${response.status}): ${errorBody}`);
                }
            }

            const responseData = await response.json();
            if (responseData.choices && responseData.choices.length > 0) {
                resultStatus = 'success';
                resultMessage = `连接成功，模型返回了有效响应。`;
            } else {
                throw new Error(`连接成功但模型未返回有效响应。`);
            }

        } catch (error: any) {
            console.error(`[testLlmConnection] Error testing model ${modelId}:`, error);
            resultMessage = error.message || '发生未知错误。';
            if (error.cause) {
                resultMessage += `\n根本原因: ${error.cause}`;
            }
        }

        // Persist the test result to Firestore regardless of outcome
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
    
    

    