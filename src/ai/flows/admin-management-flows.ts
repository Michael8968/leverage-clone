'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, addDoc, serverTimestamp, getDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, Prompt } from '@/lib/types';


// Hardcoded platform assets. In a real-world scenario, this might come from a configuration file or a database.
const PLATFORM_ASSETS = {
    providers: [
        { providerName: "Google", models: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest"], apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/models" },
        { providerName: "OpenAI", models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"], apiBaseUrl: "https://api.openai.com/v1" },
        { providerName: "DeepSeek", models: ["deepseek-chat"], apiBaseUrl: "https://api.deepseek.com/v1" },
        { providerName: "Tencent", models: ["hunyuan-standard", "hunyuan-pro"], apiBaseUrl: "https://hunyuan.tencentcloudapi.com" },
        { 
            providerName: "LiteLLM", 
            models: ["groq/llama3-70b-8192", "ollama/llama3", "anthropic/claude-3-haiku-20240307"], 
            apiBaseUrl: process.env.LITELLM_PROXY_URL || "http://localhost:4000/v1" 
        },
    ]
};

export const getPlatformAssets = ai.defineFlow(
    { name: 'getPlatformAssets', inputSchema: z.null().optional(), outputSchema: z.any() },
    async () => PLATFORM_ASSETS
);

export const testLlmConnection = ai.defineFlow(
    { name: 'testLlmConnection', inputSchema: z.any(), outputSchema: z.any() },
    async ({ modelId }) => {
        try {
            const llmDocRef = doc(db, 'llm_connections', modelId);
            const llmDocSnap = await getDoc(llmDocRef);
            if (!llmDocSnap.exists()) {
                 throw new Error("Could not find the specified LLM connection.");
            }
            const llmConnection = llmDocSnap.data() as LlmConnection;
            const { provider, modelName, apiKey } = llmConnection;
            
            const assets = await getPlatformAssets(null);
            const providerInfo = assets.providers.find(p => p.providerName.toLowerCase() === provider.toLowerCase());
            
            if (!providerInfo) { // FIX: Check if providerInfo is found
                throw new Error(`Provider "${provider}" is not configured or supported.`);
            }
            
            // Construct request based on provider type
            let requestUrl: string;
            let requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            let requestBody: any;
            let responsePath: (string | number)[];

            switch (provider.toLowerCase()) {
                case 'google':
                    requestUrl = `${providerInfo.apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
                    requestBody = {
                        contents: [{
                            role: 'user',
                            parts: [{ text: 'This is a connection test. Please respond with just the word "OK".' }]
                        }],
                        generationConfig: { maxOutputTokens: 5, temperature: 0.1 }
                    };
                    responsePath = ['candidates', 0, 'content', 'parts', 0, 'text'];
                    break;
                
                case 'tencent':
                     // The actual Tencent API requires a complex signature. We assume it's used via an OpenAI-compatible proxy.
                     // Fall-through to default is the intended behavior here.
                
                // All other providers (including LiteLLM proxies) are assumed to be OpenAI-compatible.
                default:
                    requestUrl = `${providerInfo.apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
                    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
                    requestBody = {
                        model: modelName,
                        messages: [{ role: 'user', content: 'This is a connection test. Please respond with just the word "OK".' }],
                        temperature: 0.1,
                        max_tokens: 5,
                    };
                     responsePath = ['choices', 0, 'message', 'content'];
                    break;
            }

            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: requestHeaders,
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                 const errorBody = await response.text();
                 throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
            }

            // If we get here, the HTTP request was successful (2xx status). This is a successful connection.
            await updateDoc(llmDocRef, { lastTestStatus: 'success', lastTestTimestamp: serverTimestamp() });
            
            let reply: string | undefined;
            try {
                const responseData = await response.json();
                reply = responsePath.reduce((acc, key) => (acc as any)?.[key], responseData) as string | undefined;
            } catch (jsonError) {
                // If parsing fails, it means the body was likely empty, which is fine.
                reply = undefined;
            }

            if (reply) {
                return { success: true, message: `连接成功，模型返回: "${reply}"` };
            } else {
                return { success: true, message: `连接成功，但模型未返回任何文本内容。这对于某些模型是正常现象。` };
            }

        } catch (error: any) {
             if (modelId) {
                try {
                    await updateDoc(doc(db, 'llm_connections', modelId), { lastTestStatus: 'failed', lastTestTimestamp: serverTimestamp() });
                } catch (dbError) {
                    console.error("Failed to update test status in DB:", dbError);
                }
            }
            return { success: false, message: `连接失败: ${error.message}` };
        }
    }
);

// Get Prompts Flow
const PromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  promptKey: z.string(),
  createdAt: z.any().optional(),
});
const GetPromptsOutputSchema = z.object({ prompts: z.array(PromptSchema) });
export type GetPromptsOutput = z.infer<typeof GetPromptsOutputSchema>;

export const getPrompts = ai.defineFlow(
  {
    name: 'getPrompts',
    inputSchema: z.null().optional(),
    outputSchema: GetPromptsOutputSchema,
  },
  async () => {
    const promptsCollection = collection(db, 'prompts');
    const q = query(promptsCollection, where('status', '==', '生效中'));
    const snapshot = await getDocs(q);
    const prompts = snapshot.docs
        .map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to a serializable format (e.g., ISO string)
            const createdAt = data.createdAt instanceof Timestamp 
                ? data.createdAt.toDate().toISOString() 
                : data.createdAt;
            return { id: doc.id, ...data, createdAt } as Prompt;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    return { prompts };
  }
);

// =================================================================
// Flow to update models from LiteLLM (NEW)
// =================================================================
const UpdateModelsOutputSchema = z.object({
  added: z.number(),
  skipped: z.number(),
  failed: z.number(),
  message: z.string(),
});

export const updateModelsFromLiteLLM = ai.defineFlow(
  {
    name: 'updateModelsFromLiteLLM',
    inputSchema: z.null().optional(),
    outputSchema: UpdateModelsOutputSchema,
  },
  async () => {
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

      const connectionsRef = collection(db, 'llm_connections');
      const q = query(connectionsRef, where('provider', '==', 'LiteLLM'));
      const existingSnapshot = await getDocs(q);
      const existingModels = new Set(existingSnapshot.docs.map(doc => doc.data().modelName));
      
      const batch = writeBatch(db);
      
      for (const model of liteLlmModels) {
        if (!model.id) {
          failed++;
          continue;
        }

        if (existingModels.has(model.id)) {
          skipped++;
        } else {
          const newModelRef = doc(connectionsRef);
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
);
