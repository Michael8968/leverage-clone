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
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection } from '@/lib/types';
import { getPlatformAssets } from './admin-management-flows';
import { auth } from '@/lib/firebase';
import type { Role } from '@/store/auth';

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
  scenario: z.string().optional().describe("A predefined AI scenario key (e.g., 'chat-assistant'). If provided, the system will look up a configured prompt for this scenario and use it with the highest priority."),
  // Added for user-based rule evaluation
  userId: z.string().optional().describe("The UID of the user making the request, for rule evaluation."),
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
  async ({ modelId, promptKey, messages, temperature, scenario, userId }) => {
    let finalModelId = modelId;
    let finalPromptKey = promptKey;
    let systemPromptContent: string | undefined;

    // 1. Scenario-based configuration lookup (highest priority)
    if (scenario) {
        const scenarioRef = doc(db, 'ai_scenarios', scenario);
        const scenarioSnap = await getDoc(scenarioRef);
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data();
            const now = new Date();
            
            let isTimeValid = true;

            const repetition = scenarioData.repetition;
            const startsAt = scenarioData.startsAt?.toDate();
            const expiresAt = scenarioData.expiresAt?.toDate();

            if (repetition && repetition !== 'none' && startsAt && expiresAt) {
                // Logic for recurring schedules: only compare the time part
                const nowTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
                const startTime = startsAt.getHours() * 3600 + startsAt.getMinutes() * 60 + startsAt.getSeconds();
                const endTime = expiresAt.getHours() * 3600 + expiresAt.getMinutes() * 60 + expiresAt.getSeconds();

                // Check if current date is within the absolute date range of the config
                const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startDateOnly = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
                const endDateOnly = new Date(expiresAt.getFullYear(), expiresAt.getMonth(), expiresAt.getDate());

                if (nowDateOnly >= startDateOnly && nowDateOnly <= endDateOnly) {
                    switch (repetition) {
                        case 'minutely':
                             // This is tricky, usually for minute-based repetition you check against a second part.
                             // For simplicity, we'll assume it's valid if within the hour/day.
                             isTimeValid = now.getSeconds() >= startsAt.getSeconds() && now.getSeconds() <= expiresAt.getSeconds();
                            break;
                        case 'hourly':
                            isTimeValid = now.getMinutes() >= startsAt.getMinutes() && now.getMinutes() <= expiresAt.getMinutes();
                            break;
                        case 'daily':
                            isTimeValid = nowTime >= startTime && nowTime <= endTime;
                            break;
                        case 'monthly':
                             // Effective if it's the same day of the month AND within the time window
                            isTimeValid = now.getDate() === startsAt.getDate() && nowTime >= startTime && nowTime <= endTime;
                            break;
                        default:
                            isTimeValid = false; // Unknown repetition
                            break;
                    }
                } else {
                    isTimeValid = false; // Outside of the absolute date range for repetition
                }

            } else {
                 // Absolute time window check (if no repetition)
                 isTimeValid = (!startsAt || now >= startsAt) && (!expiresAt || now <= expiresAt);
            }


            if (isTimeValid) {
                let isUserRoleValid = true;
                // User-based rule check
                if (userId && Array.isArray(scenarioData.targetUserRoles) && scenarioData.targetUserRoles.length > 0) {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        const userRole = userDoc.data().role as Role;
                        isUserRoleValid = scenarioData.targetUserRoles.includes(userRole);
                    } else {
                        isUserRoleValid = false; // User not found, rule fails
                    }
                }

                if (isUserRoleValid && scenarioData.configuredPromptKey) {
                    finalPromptKey = scenarioData.configuredPromptKey;
                    finalModelId = undefined; // Scenario's prompt key takes precedence
                }
            }
        }
    }
    
    let connection: LlmConnection;

    if (finalPromptKey) {
        // --- Logic for promptKey based execution ---
        const promptsCollection = collection(db, 'prompts');
        const q = query(promptsCollection, where("promptKey", "==", finalPromptKey));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error(`Prompt with key "${finalPromptKey}" not found.`);
        }
        const promptDoc = querySnapshot.docs[0].data();
        
        systemPromptContent = promptDoc.content;
        
        const effectiveModelId = promptDoc.modelId || finalModelId;

        if (!effectiveModelId) {
             throw new Error(`No modelId was associated with promptKey "${finalPromptKey}" and no default was provided.`);
        }
        
        const llmConnectionRef = doc(db, 'llm_connections', effectiveModelId);
        const llmConnectionSnap = await getDoc(llmConnectionRef);

        if (!llmConnectionSnap.exists()) {
             throw new Error(`LLM Connection with ID "${effectiveModelId}" (from prompt or input) not found.`);
        }
        connection = llmConnectionSnap.data() as LlmConnection;

    } else if (finalModelId) {
        // --- Logic for direct modelId based execution ---
        const llmConnectionRef = doc(db, 'llm_connections', finalModelId);
        const llmConnectionSnap = await getDoc(llmConnectionRef);

        if (!llmConnectionSnap.exists()) {
            throw new Error(`LLM Connection with ID "${finalModelId}" not found.`);
        }
        connection = llmConnectionSnap.data() as LlmConnection;
    } else {
        throw new Error("An execution target is required: either 'modelId', 'promptKey', or a valid 'scenario' must be provided.");
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

    // Isolate system prompt and conversation messages
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

    // Adapt request based on provider
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

    // Send native fetch request
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

    // Parse response and return standardized output
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
