
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, AIScenarioRules, Prompt } from '@/lib/types';
import { getPlatformAssets, getDefaultLlmConnection } from './admin-management-flows';

// ... (existing schemas and isRuleSetValid function)
const PromptMessageSchema = z.object({ role: z.enum(['system', 'user', 'assistant']), content: z.string() });
const PromptExecutionInputSchema = z.object({ modelId: z.string().optional(), promptKey: z.string().optional(), messages: z.array(PromptMessageSchema), temperature: z.number().optional().default(0.7), scenario: z.string().optional(), userId: z.string().optional() });
const PromptExecutionOutputSchema = z.object({ text: z.string() });
async function isRuleSetValid(rules: AIScenarioRules, userId?: string): Promise<boolean> { /* ... */ return true; }
async function findAvailableModels(promptDoc?: Prompt, allConnections?: LlmConnection[]): Promise<LlmConnection[]> { /* ... */ return []; }


// =================================================================
// Core Flow: executePrompt (Upgraded with Default Fallback Logic)
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
    let promptDocument: Prompt | undefined;
    let scenarioResolved = false;

    // 1. SCENARIO LOOKUP (with Fallback)
    if (scenario) {
        const scenarioRef = doc(db, 'ai_scenarios', scenario);
        const scenarioSnap = await getDoc(scenarioRef);
        if (scenarioSnap.exists()) {
            const scenarioData = scenarioSnap.data() as AIScenario;
            if (await isRuleSetValid(scenarioData.rules, userId)) {
                finalPromptKey = scenarioData.promptKey;
                finalModelId = undefined; // Scenario's prompt key takes precedence
                scenarioResolved = true;
            }
        }
        
        // FALLBACK LOGIC
        if (!scenarioResolved) {
            console.log(`Scenario "${scenario}" not configured or rules not met. Falling back to default LLM.`);
            const defaultConnection = await getDefaultLlmConnection(null);
            if (defaultConnection) {
                finalModelId = defaultConnection.id;
                finalPromptKey = undefined; // Ensure no prompt is used
            } else {
                throw new Error("Scenario conditions not met and no active default LLM connection is available.");
            }
        }
    }
    
    // 2. Determine execution target (and the rest of the flow)
    // ... (The existing logic for finding models and executing the request remains largely the same)
    // ... it will naturally handle the case where finalModelId is now set by the fallback.
    const allConnectionsSnapshot = await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃'), orderBy('priority')));
    const allConnections = allConnectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LlmConnection));
    let modelsToTry: LlmConnection[];

    if (finalModelId) { // This branch is now triggered by the fallback
        const specificModel = allConnections.find(c => c.id === finalModelId);
        if (!specificModel) throw new Error(`Target LLM Connection with ID "${finalModelId}" not found or is not active.`);
        modelsToTry = [specificModel];
    } else if (finalPromptKey) {
        const q = query(collection(db, 'prompts'), where("promptKey", "==", finalPromptKey));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error(`Prompt with key "${finalPromptKey}" not found.`);
        promptDocument = snapshot.docs[0].data() as Prompt;
        systemPromptContent = promptDocument.content;
        modelsToTry = await findAvailableModels(promptDocument, allConnections);
    } else {
        throw new Error("An execution target is required.");
    }

    if (modelsToTry.length === 0) throw new Error("No active LLM connections available for the target.");

    // 3. Loop with Failover
    // ... (The rest of the execution loop remains unchanged)
    
    throw new Error(`All available LLM models failed to respond.`);
  }
);
