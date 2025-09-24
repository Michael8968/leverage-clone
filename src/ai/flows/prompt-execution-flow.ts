

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

async function isRuleSetValid(rules: AIScenarioRules, userId?: string): Promise<boolean> {
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
// (NEW) API Adapter Layer
// =================================================================
function getApiConfig(model: LlmConnection, messages: z.infer<typeof PromptMessageSchema>[], temperature?: number) {
    const provider = model.provider.toLowerCase();

    // Default to Google's format
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelName}:generateContent`;
    let headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-goog-api-key': model.apiKey };
    let body: Record<string, any> = {
        contents: messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
        })),
        generationConfig: { temperature }
    };
    
    // Switch for OpenAI and other potential providers
    if (provider.includes('openai')) {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${model.apiKey}` };
        body = {
            model: model.modelName,
            messages: messages,
            temperature,
        };
    }
    // Add other providers like Anthropic, etc. here in the future
    // else if (provider.includes('anthropic')) { ... }

    return { url, method: 'POST', headers, body };
}

function parseApiResponse(provider: string, response: any) {
    const lowerProvider = provider.toLowerCase();

    if (lowerProvider.includes('openai')) {
        return response.choices?.[0]?.message?.content || '';
    }
    
    // Default to Google's response format
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}


// =================================================================
// Core Flow: executePrompt (Upgraded with Advanced Rule Validation & Context Injection)
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

    // 1. SCENARIO LOOKUP (HIGHEST PRIORITY)
    if (scenario) {
        const scenarioRef = doc(db, 'ai_scenarios', scenario);
        const scenarioSnap = await getDoc(scenarioRef);
        
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data() as AIScenario;
            if (await isRuleSetValid(scenarioData, userId)) {
                console.log(`[Flow] Scenario "${scenario}" triggered and rules met. Using prompt key: ${scenarioData.configuredPromptKey}`);
                finalPromptKey = scenarioData.configuredPromptKey;
                finalModelId = undefined; // Scenario's prompt key takes precedence
            }
        }
    }
    
    // 2. DETERMINE EXECUTION TARGET (PROMPT OR MODEL)
    const allConnectionsSnapshot = await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃'), orderBy('priority')));
    const allConnections = allConnectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LlmConnection));
    let modelsToTry: LlmConnection[] = [];

    if (finalPromptKey) {
        const q = query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error(`Prompt with key "${finalPromptKey}" not found.`);
        promptDocument = snapshot.docs[0].data() as Prompt;
        systemPromptContent = promptDocument.content;
        modelsToTry = await findAvailableModels(promptDocument, allConnections);
    } else if (finalModelId) {
        const specificModel = allConnections.find(c => c.id === finalModelId);
        if (!specificModel) throw new Error(`Target LLM Connection with ID "${finalModelId}" not found or is not active.`);
        modelsToTry = [specificModel];
    } else {
        const defaultConnection = await getDefaultLlmConnection(null);
        if (!defaultConnection) throw new Error("No execution target specified and no default LLM connection is available.");
        modelsToTry = [defaultConnection];
    }
    
    if (modelsToTry.length === 0) throw new Error("No active and suitable LLM connections available for the target.");

    // 3. DYNAMIC CONTEXT INJECTION (NEW)
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
        // Replace a {{context}} placeholder in the prompt content, or prepend it.
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

    // 4. LOOP & EXECUTE WITH FAILOVER
    for (const model of modelsToTry) {
        try {
            console.log(`[Flow] Attempting to call model: ${model.provider} - ${model.modelName}`);
            
            const apiConfig = getApiConfig(model, finalMessages, temperature);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/generate`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(apiConfig)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Model API request failed with status ${response.status}: ${JSON.stringify(errorBody)}`);
            }

            const result = await response.json();
            const textResponse = parseApiResponse(model.provider, result);

            if (!textResponse) {
                throw new Error('Model returned an empty response.');
            }

            return { text: textResponse };

        } catch (error: any) {
            console.error(`[Flow] Failed to call model ${model.modelName}. Error: ${error.message}. Trying next model...`);
            continue; // Try the next model in the list
        }
    }
    
    // If all models failed
    throw new Error(`All available LLM models failed to respond.`);
  }
);
    
