
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, AIScenarioRules, Prompt } from '@/lib/types';
import { getPlatformAssets, getDefaultLlmConnection } from './admin-management-flows';

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
// Core Flow: executePrompt (Upgraded with Advanced Rule Validation)
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

    // 1. SCENARIO LOOKUP (HIGHEST PRIORITY)
    if (scenario) {
        const scenarioRef = doc(db, 'ai_scenarios', scenario);
        const scenarioSnap = await getDoc(scenarioRef);
        
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data() as AIScenario;
            // Validate rules before applying
            if (await isRuleSetValid(scenarioData, userId)) {
                console.log(`[Flow] Scenario "${scenario}" triggered and rules met. Using prompt key: ${scenarioData.configuredPromptKey}`);
                finalPromptKey = scenarioData.configuredPromptKey;
                finalModelId = undefined; // Scenario's prompt key takes precedence over any passed modelId
            }
        }
    }
    
    // 2. DETERMINE EXECUTION TARGET (PROMPT OR MODEL)
    const allConnectionsSnapshot = await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃'), orderBy('priority')));
    const allConnections = allConnectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LlmConnection));
    let modelsToTry: LlmConnection[] = [];

    if (finalPromptKey) { // A prompt key was provided (either by scenario or direct input)
        const q = query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error(`Prompt with key "${finalPromptKey}" not found.`);
        const promptDocument = snapshot.docs[0].data() as Prompt;
        systemPromptContent = promptDocument.content;
        modelsToTry = await findAvailableModels(promptDocument, allConnections);

    } else if (finalModelId) { // A specific modelId was provided
        const specificModel = allConnections.find(c => c.id === finalModelId);
        if (!specificModel) throw new Error(`Target LLM Connection with ID "${finalModelId}" not found or is not active.`);
        modelsToTry = [specificModel];

    } else { // No target specified, use system default
        const defaultConnection = await getDefaultLlmConnection(null);
        if (!defaultConnection) throw new Error("No execution target specified and no default LLM connection is available.");
        modelsToTry = [defaultConnection];
    }
    
    if (modelsToTry.length === 0) throw new Error("No active and suitable LLM connections available for the target.");

    // Prepare messages: Inject system prompt if one was found
    const finalMessages = [...messages];
    if (systemPromptContent) {
        const systemMessageIndex = finalMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) {
            finalMessages[systemMessageIndex] = { role: 'system', content: systemPromptContent };
        } else {
            finalMessages.unshift({ role: 'system', content: systemPromptContent });
        }
    }

    // 3. LOOP & EXECUTE WITH FAILOVER
    for (const model of modelsToTry) {
        try {
            console.log(`[Flow] Attempting to call model: ${model.provider} - ${model.modelName}`);

            // This is a simplified fetch call. A real implementation would need an adapter
            // to format the request body according to the provider's API specification.
            // For now, we assume a standard format.
            const response = await fetch('https://some-unified-api-gateway.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${model.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model.modelName,
                    messages: finalMessages,
                    temperature: temperature
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Model API request failed with status ${response.status}: ${errorBody}`);
            }

            const result = await response.json();
            const textResponse = result.choices?.[0]?.message?.content || '';

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
