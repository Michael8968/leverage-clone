
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, AIScenarioRules, Prompt } from '@/lib/types';
import { getPlatformAssets } from './admin-management-flows';

const PromptMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
});

const PromptExecutionInputSchema = z.object({
  modelId: z.string().optional(),
  promptKey: z.string().optional(),
  messages: z.array(PromptMessageSchema),
  temperature: z.number().optional(),
  scenario: z.string().optional(),
  userId: z.string().optional(),
});

const PromptExecutionOutputSchema = z.object({
  text: z.string(),
});

async function isRuleSetValid(rules: AIScenario, userId?: string): Promise<boolean> {
    const now = new Date();
    let timeIsValid = true;
    let userIsValid = true;

    // Time-based rule validation
    if (rules.repetition === 'none') {
        const startsAt = rules.startsAt?.toDate();
        const expiresAt = rules.expiresAt?.toDate();
        if (startsAt && now < startsAt) timeIsValid = false;
        if (expiresAt && now > expiresAt) timeIsValid = false;
    } else {
        const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
        if (rules.repetition === 'weekly' && !rules.daysOfWeek?.includes(currentDay)) {
            timeIsValid = false;
        }
        if (timeIsValid && (rules.startTime || rules.endTime)) {
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [startH, startM] = (rules.startTime || "00:00").split(':').map(Number);
            const [endH, endM] = (rules.endTime || "23:59").split(':').map(Number);
            const startTimeInMinutes = startH * 60 + startM;
            const endTimeInMinutes = endH * 60 + endM;
            if (currentTime < startTimeInMinutes || currentTime > endTimeInMinutes) {
                timeIsValid = false;
            }
        }
    }

    // User-based rule validation
    const targetRoles = rules.targetUserRoles;
    if (userId && targetRoles && Object.keys(targetRoles).length > 0) {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const user = userDocSnap.data() as User;
            if (!user.role || !targetRoles[user.role]) {
                userIsValid = false; // User's role is not in the target list
            } else {
                const requiredRatings = targetRoles[user.role];
                if (requiredRatings && requiredRatings.length > 0) {
                    if (!user.rating || !requiredRatings.includes(user.rating)) {
                        userIsValid = false; // User's rating doesn't match
                    }
                }
            }
        } else {
            userIsValid = false; // User not found
        }
    }

    // Combine rules
    if (rules.ruleLogic === 'or') {
        return timeIsValid || userIsValid;
    }
    return timeIsValid && userIsValid;
}

async function findAvailableModels(promptDoc?: Prompt, allConnections?: LlmConnection[]): Promise<LlmConnection[]> {
  const activeConnections = allConnections || [];
  if (promptDoc?.modelId) {
    const specificModel = activeConnections.find(c => c.id === promptDoc.modelId);
    if (specificModel) return [specificModel];
  }
  return activeConnections.sort((a, b) => a.priority - b.priority);
}

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
    let finalPromptKey = promptKey;
    let finalSystemPrompt = messages.find(m => m.role === 'system')?.content || '';

    // 1. Scenario-based configuration override (Highest Priority)
    if (scenario) {
        const q = query(collection(db, 'ai_scenarios'), where("id", "==", scenario));
        const scenarioSnapshot = await getDocs(q);
        if (!scenarioSnapshot.empty) {
            const scenarioDoc = scenarioSnapshot.docs[0].data() as AIScenario;
            if (await isRuleSetValid(scenarioDoc, userId)) {
                finalPromptKey = scenarioDoc.configuredPromptKey;
            }
        }
    }
    
    // 2. Fetch prompt document if a key is determined
    let promptDoc: Prompt | undefined;
    if (finalPromptKey) {
        const q = query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey), limit(1));
        const promptSnapshot = await getDocs(q);
        if (!promptSnapshot.empty) {
            promptDoc = promptSnapshot.docs[0].data() as Prompt;
            finalSystemPrompt = promptDoc.content; // Override system prompt with content from DB
        }
    }

    // 3. Determine models to try
    const allConnectionsSnapshot = await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃')));
    const allConnections = allConnectionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LlmConnection));
    const modelsToTry = await findAvailableModels(promptDoc, allConnections);
    if (modelsToTry.length === 0) throw new Error("No available or matching LLM connections found.");

    // 4. Construct final messages
    const conversationMessages = messages.filter(m => m.role !== 'system');
    const finalMessages = [{ role: 'system', content: finalSystemPrompt }, ...conversationMessages];
    
    // 5. Loop with Failover
    const assets = await getPlatformAssets(null);
    const errors: any[] = [];
    for (const connection of modelsToTry) {
        try {
            const providerInfo = assets.providers.find(p => p.providerName.toLowerCase() === connection.provider.toLowerCase());
            if (!providerInfo) throw new Error(`Provider "${connection.provider}" is not configured in PLATFORM_ASSETS.`);
            
            const { provider, modelName, apiKey } = connection;
            const { apiBaseUrl } = providerInfo;
            
            let requestUrl: string;
            let requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            let requestBody: any;

            switch (provider.toLowerCase()) {
                case 'google':
                    requestUrl = `${apiBaseUrl}/${modelName}:generateContent?key=${apiKey}`;
                    requestBody = {
                        contents: finalMessages.filter(m => m.role !== 'system').map(m => ({
                            role: m.role === 'user' ? 'user' : 'model',
                            parts: [{ text: m.content }]
                        })),
                        systemInstruction: finalSystemPrompt ? { parts: [{ text: finalSystemPrompt }] } : undefined,
                        generationConfig: { temperature },
                    };
                    break;
                
                default: // OpenAI-compatible providers
                    requestUrl = `${apiBaseUrl.replace(/\/$/, "")}/chat/completions`;
                    requestHeaders['Authorization'] = `Bearer ${apiKey}`;
                    requestBody = { model: modelName, messages: finalMessages, temperature };
                    break;
            }

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
             // If no text but response was OK, still an issue with this model, try next.
            throw new Error("Model returned a successful status but no text content.");

        } catch (error) {
            console.error(`Attempt with model ${connection.modelName} failed:`, error);
            errors.push({ modelName: connection.modelName, error: (error as Error).message });
        }
    }

    throw new Error(`All available models failed. Errors: ${JSON.stringify(errors, null, 2)}`);
  }
);
