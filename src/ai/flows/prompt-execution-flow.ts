

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, AIScenarioRules, Prompt, ProductService, Supplier, Resource } from '@/lib/types';
import { getDefaultLlmConnection } from './admin-management-flows';

// Helper function to convert a Firestore collection to a string format for the prompt
async function getCollectionAsContext(collectionName: string, maxItems = 10): Promise<string> {
    try {
        const snapshot = await getDocs(query(collection(db, collectionName), limit(maxItems)));
        if (snapshot.empty) {
            return `[]`; // Return empty array string if no documents
        }
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return JSON.stringify(data, null, 2); // Pretty-print JSON
    } catch (error) {
        console.error(`Failed to fetch collection ${collectionName}:`, error);
        return `[]`; // Return empty array on error
    }
}


const PromptMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

const PromptExecutionInputSchema = z.object({
  modelId: z.string().optional(),
  promptKey: z.string().optional(),
  messages: z.array(PromptMessageSchema),
  temperature: z.number().optional().default(0.7),
  scenario: z.string().optional(),
  userId: z.string().optional(),
});

const PromptExecutionOutputSchema = z.object({
  text: z.string(),
});

async function isRuleSetValid(rules: AIScenario, userId?: string): Promise<boolean> {
    if (!rules) return true; // No rules means always valid

    let isTimeValid = false;
    let isUserValid = false;

    const now = new Date();
    
    // Time validation
    if (rules.repetition && rules.repetition !== 'none') {
        const checkDay = () => {
            if (rules.repetition === 'weekly') {
                const dayMap: { [key: number]: (typeof rules.daysOfWeek)[number] } = { 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 0: 'sun' };
                return rules.daysOfWeek?.includes(dayMap[now.getDay()]);
            }
            return true; // daily
        };

        const checkTime = () => {
            if (rules.startTime && rules.endTime) {
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = rules.startTime.split(':').map(Number);
                const [endH, endM] = rules.endTime.split(':').map(Number);
                const startMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;
                return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
            }
            return true; // No time window specified
        };

        isTimeValid = checkDay() && checkTime();
    } else if (rules.startsAt || rules.expiresAt) {
        const startTime = rules.startsAt ? (rules.startsAt as Timestamp).toDate() : null;
        const endTime = rules.expiresAt ? (rules.expiresAt as Timestamp).toDate() : null;
        isTimeValid = (!startTime || now >= startTime) && (!endTime || now <= endTime);
    } else {
        isTimeValid = true; // No time rules
    }
    
    // User validation
    if (userId && rules.targetUserRoles && Object.keys(rules.targetUserRoles).length > 0) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const user = userDoc.data() as User;
            const userRole = user.role;
            const userRating = user.rating || 0;

            if (rules.targetUserRoles[userRole]) {
                const requiredRatings = rules.targetUserRoles[userRole];
                if (requiredRatings!.length === 0 || requiredRatings!.includes(userRating)) {
                    isUserValid = true;
                }
            }
        }
    } else {
        isUserValid = true; // No user rules
    }

    // Combine rules
    if (rules.ruleLogic === 'or') {
        return isTimeValid || isUserValid;
    }
    return isTimeValid && isUserValid; // Default is 'and'
}


async function findAvailableModels(promptDoc?: Prompt, allConnections?: LlmConnection[]): Promise<LlmConnection[]> {
    if (!promptDoc && !allConnections) {
        throw new Error("Must provide either a prompt document or a list of all connections.");
    }
    
    const activeConnections = allConnections || (await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃'), orderBy('priority')))).docs.map(doc => ({ id: doc.id, ...doc.data() } as LlmConnection));

    if (!promptDoc || !promptDoc.modelId) {
        // Return all active connections sorted by priority
        return activeConnections;
    }

    // If a specific model is pinned to the prompt, try that first.
    const pinnedModel = activeConnections.find(c => c.id === promptDoc.modelId);
    if (pinnedModel) {
        return [pinnedModel];
    }
    
    // Fallback: If pinned model is not active/found, return all active models.
    return activeConnections;
}

// =================================================================
// Core Flow: executePrompt (Upgraded with LiteLLM Integration)
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
    
    let finalModelId = modelId;
    let finalPromptKey = promptKey;
    let systemPromptContent: string | undefined;
    let promptDocument: Prompt | null = null;
    let targetModelIdentifier: string | undefined; // This will hold the LiteLLM-compatible model string

    // 1. SCENARIO LOOKUP (HIGHEST PRIORITY)
    if (scenario) {
        const scenarioRef = doc(db, 'ai_scenarios', scenario);
        const scenarioSnap = await getDoc(scenarioRef);
        
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data() as AIScenario;
            if (await isRuleSetValid(scenarioData, userId)) {
                console.log(`[Flow] Scenario "${scenario}" triggered. Using prompt key: ${scenarioData.configuredPromptKey}`);
                finalPromptKey = scenarioData.configuredPromptKey;
                finalModelId = undefined; // Scenario's prompt key takes absolute precedence.
            }
        }
    }
    
    // 2. DETERMINE EXECUTION TARGET (PROMPT OR MODEL)
    if (finalPromptKey) {
        const q = query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error(`Prompt with key "${finalPromptKey}" not found.`);
        
        promptDocument = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Prompt;
        systemPromptContent = promptDocument.content;
        
        // If prompt has a model bound, use that.
        if (promptDocument.modelId) {
            finalModelId = promptDocument.modelId;
        }
    }

    // 3. GET THE LITELLM MODEL IDENTIFIER
    let targetLlmConnection: LlmConnection | undefined;
    if (finalModelId) {
        const modelDoc = await getDoc(doc(db, 'llm_connections', finalModelId));
        if (!modelDoc.exists() || modelDoc.data()?.status !== '活跃') {
            throw new Error(`Target LLM Connection with ID "${finalModelId}" not found or is not active.`);
        }
        targetLlmConnection = { id: modelDoc.id, ...modelDoc.data() } as LlmConnection;
    } else {
        // Fallback to default if no model was determined
        targetLlmConnection = await getDefaultLlmConnection(null);
        if (!targetLlmConnection) {
            throw new Error("No execution target specified and no default LLM connection is available.");
        }
    }
    
    // The key change: construct the model string for LiteLLM
    // Example: "gemini/gemini-1.5-pro-latest" or "openai/gpt-4o"
    targetModelIdentifier = `${targetLlmConnection.provider.toLowerCase()}/${targetLlmConnection.modelName}`;
    console.log(`[Flow] Routing to LiteLLM with model identifier: ${targetModelIdentifier}`);

    // 4. DYNAMIC CONTEXT INJECTION (No changes here)
    let dynamicContext = "";
    if (promptDocument?.querySources) {
        const contextParts: string[] = [];
        if (promptDocument.querySources.knowledgeBase) {
            contextParts.push("## Knowledge Base (products):\n" + await getCollectionAsContext('products'));
        }
        if (promptDocument.querySources.suppliers) {
            contextParts.push("## Suppliers:\n" + await getCollectionAsContext('suppliers'));
        }
        if (promptDocument.querySources.publicResources) {
            contextParts.push("## Public Resources:\n" + await getCollectionAsContext('resources'));
        }
        dynamicContext = contextParts.join("\n\n");
    }

    // Prepare messages: Inject system prompt and dynamic context
    const finalMessages = [...messages];
    if (systemPromptContent) {
        if (systemPromptContent.includes('{{{context}}}')) {
            systemPromptContent = systemPromptContent.replace('{{{context}}}', dynamicContext);
        } else {
            systemPromptContent = dynamicContext + "\n\n" + systemPromptContent;
        }

        const systemMessageIndex = finalMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) {
            finalMessages[systemMessageIndex] = { role: 'system', content: systemPromptContent };
        } else {
            finalMessages.unshift({ role: 'system', content: systemPromptContent });
        }
    }

    // 5. EXECUTE CALL TO LITELLM PROXY
    const liteLLMProxyUrl = process.env.LITELLM_PROXY_URL;
    if (!liteLLMProxyUrl) {
        throw new Error("LITELLM_PROXY_URL environment variable is not set.");
    }
    
    // Construct the request body in OpenAI format, which LiteLLM understands
    const requestBody = {
        model: targetModelIdentifier,
        messages: finalMessages,
        temperature: temperature,
    };
    
    try {
        console.log(`[Flow] Calling LiteLLM proxy at ${liteLLMProxyUrl}`);
        
        const response = await fetch(liteLLMProxyUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LITELLM_API_KEY}`
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`LiteLLM proxy request failed with status ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        const textResponse = result.choices?.[0]?.message?.content || '';

        if (!textResponse) {
             console.error("[Flow] LiteLLM returned a valid but empty or unparsable response:", result);
             throw new Error('Model returned an empty response.');
        }

        return { text: textResponse };

    } catch (error: any) {
        console.error(`[Flow] Failed to call LiteLLM. Error: ${error.message}`);
        throw error; // Re-throw the error to be caught by the caller
    }
  }
);
