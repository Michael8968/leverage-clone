
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, Prompt } from '@/lib/types';
import { getDefaultLlmConnection } from './admin-management-flows';
import { googleAI } from '@genkit-ai/googleai';

// Define providers that should use the NATIVE Genkit path.
// Other providers will fall back to the HTTP proxy.
// We are now more restrictive to ensure stability. Only 'google' is native.
const NATIVE_GENKIT_PROVIDERS = ['google'];

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
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.array(z.object({
    text: z.string().optional(),
    media: z.object({
        url: z.string(),
        contentType: z.string().optional(),
    }).optional(),
  })),
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
                return rules.daysOfWeek?.includes(dayMap[now.getDay()]!);
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

// =================================================================
// Core Flow: executePrompt (Handles dual-path execution)
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
    let llmConnection: LlmConnection | null = null;

    // 1. SCENARIO LOOKUP
    if (scenario) {
        const scenarioSnap = await getDoc(doc(db, 'ai_scenarios', scenario));
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data() as AIScenario;
            if (await isRuleSetValid(scenarioData, userId)) {
                finalPromptKey = scenarioData.configuredPromptKey;
                finalModelId = undefined;
            }
        }
    }
    
    // 2. DETERMINE PROMPT DOCUMENT
    if (finalPromptKey) {
        const snapshot = await getDocs(query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey)));
        if (!snapshot.empty) {
            promptDocument = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Prompt;
            systemPromptContent = promptDocument.content;
            if (promptDocument.modelId) {
                finalModelId = promptDocument.modelId;
            }
        }
    }

    // 3. GET LLM CONNECTION
    if (finalModelId) {
        const modelDoc = await getDoc(doc(db, 'llm_connections', finalModelId));
        if (modelDoc.exists() && modelDoc.data()?.status === '活跃') {
            llmConnection = { id: modelDoc.id, ...modelDoc.data() } as LlmConnection;
        }
    }
    if (!llmConnection) {
        llmConnection = (await getDefaultLlmConnection(null)) || null;
    }
    if (!llmConnection) {
        throw new Error("No active LLM connection could be found or determined.");
    }
    
    // 4. DYNAMIC CONTEXT INJECTION
    let dynamicContext = "";
    if (promptDocument?.querySources) {
        const contextParts: string[] = [];
        if (promptDocument.querySources.knowledgeBase) contextParts.push("## Knowledge Base (products):\n" + await getCollectionAsContext('products'));
        if (promptDocument.querySources.suppliers) contextParts.push("## Suppliers:\n" + await getCollectionAsContext('suppliers'));
        if (promptDocument.querySources.publicResources) contextParts.push("## Public Resources:\n" + await getCollectionAsContext('resources'));
        dynamicContext = contextParts.join("\n\n");
    }

    // 5. PREPARE MESSAGES
    const finalMessages = [...messages];
    if (systemPromptContent) {
        let finalSystemContent = systemPromptContent;
        // Check for '{{{context}}}' and replace it. This is a simple template replacement.
        if (systemPromptContent.includes('{{{context}}}')) {
            finalSystemContent = systemPromptContent.replace('{{{context}}}', dynamicContext);
        } else if (dynamicContext) {
            // If context exists but the template variable doesn't, prepend the context.
            finalSystemContent = `${dynamicContext}\n\n${systemPromptContent}`;
        }
        
        const systemMessageIndex = finalMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) {
             // It's better to combine system messages if one already exists.
            const existingContent = finalMessages[systemMessageIndex]!.content[0]?.text || '';
            finalMessages[systemMessageIndex]!.content[0]!.text = `${finalSystemContent}\n\n${existingContent}`;
        } else {
            finalMessages.unshift({ role: 'system', content: [{ text: finalSystemContent }] });
        }
    }

    // 6. EXECUTE: DUAL PATH (NATIVE GENKIT OR HTTP PROXY)
    const provider = llmConnection.provider.toLowerCase();
    
    if (NATIVE_GENKIT_PROVIDERS.includes(provider)) {
        // PATH A: Native Genkit Execution
        console.log(`[Flow] Using Native Genkit path for provider: ${provider}`);
        const modelIdentifier = googleAI(llmConnection.modelName);

        try {
            const llmResponse = await ai.generate({
                model: modelIdentifier,
                prompt: finalMessages.map(m => ({ role: m.role, content: m.content.map(c => c.text).join('') })),
                config: { temperature },
            });

            const textResponse = llmResponse.text();
            if (textResponse === undefined) throw new Error('Model returned an empty response.');
            return { text: textResponse };
        } catch (error: any) {
            console.error(`[Flow] Native Genkit call failed for ${modelIdentifier}: ${error.message}`);
            throw error;
        }

    } else {
        // PATH B: HTTP Proxy Fallback (e.g., for LiteLLM)
        console.log(`[Flow] Using HTTP Proxy path for provider: ${llmConnection.provider}`);
        
        // The /api/generate route is now the designated proxy
        const proxyUrl = "/api/generate";

        const simplifiedMessages = finalMessages.map(m => ({
            role: m.role,
            content: m.content.map(c => c.text).filter(Boolean).join('\n'),
        }));
        
        const body = JSON.stringify({
            model: llmConnection.modelName,
            messages: simplifiedMessages,
            temperature,
            // Pass the API key in the body for the proxy to use
            apiKey: llmConnection.apiKey,
        });

        try {
            // NOTE: This fetch call happens on the server-side if executePrompt is called from a server component.
            // If running on localhost, this needs to be an absolute URL. 
            // In a managed environment, internal routing might handle this.
            // For robustness, let's assume we need a full URL during local dev.
            const baseUrl = process.env.NODE_ENV === 'development'
                ? `http://localhost:${process.env.PORT || 9002}`
                : process.env.NEXT_PUBLIC_APP_URL || '';
                
            const response = await fetch(`${baseUrl}${proxyUrl}`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body 
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Proxy request failed with status ${response.status}: ${errorBody}`);
            }
            const result = await response.json();
            
            // LiteLLM response structure
            const textResponse = result.choices?.[0]?.message?.content;
            
            if (!textResponse) {
                // OpenAI raw response structure
                if(result.text) return { text: result.text };
                throw new Error('Proxy returned an invalid or empty response structure.');
            }
            return { text: textResponse };
        } catch (error: any) {
            console.error(`[Flow] HTTP Proxy call failed for ${llmConnection.modelName}: ${error.message}`);
            throw error; 
        }
    }
  }
);

    