'use server';
/**
 * @fileOverview The core API gateway for executing prompts against any configured LLM.
 *
 * - executePrompt - The single entry point for all LLM calls.
 * - PromptExecutionInput - The standardized input for the gateway.
 * - PromptExecutionOutput - The standardized output from the gateway.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection } from '@/lib/types';
import { getPlatformAssets } from './admin-management-flows';

// Standardized Message Format
const PromptMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});
export type PromptMessage = z.infer<typeof PromptMessageSchema>;


// Standardized Input for the Gateway
const PromptExecutionInputSchema = z.object({
  modelId: z.string().optional().describe("The ID of the llm_connections document. Required if promptKey is not provided."),
  promptKey: z.string().optional().describe("The business key of the prompt in the prompts collection. Required if modelId is not provided."),
  messages: z.array(PromptMessageSchema).describe("The conversation history. The content from the prompt document will be used as the 'system' message if a promptKey is provided."),
  temperature: z.number().optional().default(0.7),
  // other generic parameters can be added here
});
export type PromptExecutionInput = z.infer<typeof PromptExecutionInputSchema>;


// Standardized Output from the Gateway
const PromptExecutionOutputSchema = z.object({
  text: z.string().describe("The generated text from the model."),
  // other generic outputs can be added here (e.g., usage stats)
});
export type PromptExecutionOutput = z.infer<typeof PromptExecutionOutputSchema>;


export async function executePrompt(input: PromptExecutionInput): Promise<PromptExecutionOutput> {
  return executePromptFlow(input);
}

const executePromptFlow = ai.defineFlow(
  {
    name: 'executePromptFlow',
    inputSchema: PromptExecutionInputSchema,
    outputSchema: PromptExecutionOutputSchema,
  },
  async ({ modelId, promptKey, messages, temperature }) => {
    let connection: LlmConnection;
    let systemPromptContent: string | undefined;

    if (promptKey) {
        // --- Logic for promptKey based execution ---
        const promptsCollection = collection(db, 'prompts');
        const q = query(promptsCollection, where("promptKey", "==", promptKey));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error(`Prompt with key "${promptKey}" not found.`);
        }
        const promptDoc = querySnapshot.docs[0].data();
        
        systemPromptContent = promptDoc.content;
        
        const effectiveModelId = promptDoc.modelId || modelId; // Use prompt's model, fallback to direct modelId if provided

        if (!effectiveModelId) {
             throw new Error(`No modelId was associated with promptKey "${promptKey}" and no default was provided.`);
        }
        
        const llmConnectionRef = doc(db, 'llm_connections', effectiveModelId);
        const llmConnectionSnap = await getDoc(llmConnectionRef);

        if (!llmConnectionSnap.exists()) {
             throw new Error(`LLM Connection with ID "${effectiveModelId}" (from prompt) not found.`);
        }
        connection = llmConnectionSnap.data() as LlmConnection;

    } else if (modelId) {
        // --- Logic for direct modelId based execution ---
        const llmConnectionRef = doc(db, 'llm_connections', modelId);
        const llmConnectionSnap = await getDoc(llmConnectionRef);

        if (!llmConnectionSnap.exists()) {
            throw new Error(`LLM Connection with ID "${modelId}" not found.`);
        }
        connection = llmConnectionSnap.data() as LlmConnection;
    } else {
        throw new Error("Either 'modelId' or 'promptKey' must be provided.");
    }


    if (connection.status !== '活跃') {
        throw new Error(`LLM Connection "${connection.modelName}" is currently disabled.`);
    }

    // Fetch the provider details (like apiBaseUrl)
    const assets = await getPlatformAssets();
    const providerInfo = assets.providers.find(p => p.providerName === connection.provider);
    if (!providerInfo || !providerInfo.apiBaseUrl) {
        throw new Error(`Configuration for provider "${connection.provider}" is missing or incomplete.`);
    }

    const { provider, modelName, apiKey } = connection;
    const { apiBaseUrl } = providerInfo;

    // 2. Isolate system prompt and conversation messages
    let systemPromptMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    // If a promptKey was used, its content overrides any system message in the 'messages' array
    if (systemPromptContent) {
        systemPromptMessage = { role: 'system', content: systemPromptContent };
    }
    
    let requestUrl: string;
    let requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    let requestBody: any;

    // 3. Adapt request based on provider
    switch (provider.toLowerCase()) {
      case 'google':
        requestUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
        requestBody = {
          contents: conversationMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role, // Google uses 'model' for assistant role
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            temperature: temperature,
          },
        };
        if (systemPromptMessage) {
            requestBody.systemInstruction = {
                role: 'system',
                parts: [{ text: systemPromptMessage.content }],
            };
        }
        break;

      case 'openai':
      case 'deepseek':
      default: // OpenAI-compatible APIs
        requestUrl = `${apiBaseUrl}/chat/completions`;
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
        
        const finalMessages = systemPromptMessage 
            ? [systemPromptMessage, ...conversationMessages] 
            : conversationMessages;

        requestBody = {
          model: modelName,
          messages: finalMessages,
          temperature: temperature,
        };
        break;
    }

    // 4. Send native fetch request
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("LLM API Error:", errorBody);
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const responseData = await response.json();

    // 5. Parse response and return standardized output
    let outputText = '';
    switch (provider.toLowerCase()) {
        case 'google':
            outputText = responseData.candidates[0]?.content?.parts[0]?.text || '';
            break;
        
        case 'openai':
        case 'deepseek':
        default:
            outputText = responseData.choices[0]?.message?.content || '';
            break;
    }
    
    if (!outputText) {
        console.warn("LLM response was empty or in an unexpected format:", responseData);
    }
    
    return { text: outputText };
  }
);
