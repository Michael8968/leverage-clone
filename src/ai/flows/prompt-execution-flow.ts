
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, Prompt, PointsTransaction, TokenConversionConfig } from '@/lib/types';
import { getPlatformAssets } from './admin-management-flows';
import { differenceInMonths } from 'date-fns';

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
        const startsAt = rules.startsAt?.toDate ? rules.startsAt.toDate() : null;
        const expiresAt = rules.expiresAt?.toDate ? rules.expiresAt.toDate() : null;
        if (startsAt && now < startsAt) timeIsValid = false;
        if (expiresAt && now > expiresAt) timeIsValid = false;
    } else {
        const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
        if (rules.repetition === 'weekly' && !rules.daysOfWeek?.includes(currentDay as any)) {
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
    } else if (targetRoles && Object.keys(targetRoles).length > 0 && !userId) {
        // If roles are specified but no user is provided, the rule is invalid.
        userIsValid = false;
    }

    // Combine rules
    if (rules.ruleLogic === 'or') {
        // if no user/time rules, it should not be valid
        const hasTimeRules = rules.repetition || rules.startsAt || rules.expiresAt;
        const hasUserRules = targetRoles && Object.keys(targetRoles).length > 0;
        if (!hasTimeRules && !hasUserRules) return false;
        if (!hasTimeRules) return userIsValid;
        if (!hasUserRules) return timeIsValid;
        return timeIsValid || userIsValid;
    }
    return timeIsValid && userIsValid;
}

async function findModelsToTry(promptDoc?: Prompt, allConnections?: LlmConnection[], specificModelId?: string): Promise<LlmConnection[]> {
  const activeConnections = allConnections || [];
  
  // Highest priority: a specific modelId was passed in the request
  if (specificModelId) {
      const specificModel = activeConnections.find(c => c.id === specificModelId);
      if (specificModel) return [specificModel];
  }
  
  // Next priority: the modelId defined in the prompt document
  if (promptDoc?.modelId) {
    const specificModel = activeConnections.find(c => c.id === promptDoc.modelId);
    if (specificModel) return [specificModel];
  }

  // Fallback: all active connections, sorted by priority
  return activeConnections.sort((a, b) => (a.priority || 100) - (b.priority || 100));
}

// =================================================================
// Core Flow: executePrompt (Refactored with Manual-First, Genkit-Fallback Logic)
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
    
    // =================================================================
    // Points Deduction & User Level Check Logic
    // =================================================================
    if (userId) {
        const systemConfigDoc = await getDoc(doc(db, 'configs', 'system'));
        if (systemConfigDoc.exists() && systemConfigDoc.data().enable_points === false) {
             // Points system is disabled, skip deduction.
        } else {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                let user = userSnap.data() as User;

                // Admins are exempt from point deductions
                if (user.role !== 'admin') {
                    const actionKey = scenario || promptKey || 'generic';
                    const tokenConfigDoc = await getDoc(doc(db, 'configs', 'token_conversion'));
                    const tokenConfig = tokenConfigDoc.exists() ? tokenConfigDoc.data() as TokenConversionConfig : { actions: {} };
                    const cost = tokenConfig.actions[actionKey] || 1; // Default cost is 1 if not specified

                    if ((user.points_balance || 0) < cost) {
                        throw new Error("积分余额不足，请充值后再试。");
                    }

                    // Use a transaction to deduct points and log the transaction atomically.
                    await runTransaction(db, async (transaction) => {
                        const freshUserSnap = await transaction.get(userRef);
                        if (!freshUserSnap.exists()) throw new Error("User not found.");
                        const freshUser = freshUserSnap.data() as User;

                        const newBalance = (freshUser.points_balance || 0) - cost;
                        if (newBalance < 0) throw new Error("积分余额不足。");
                        
                        const newTotalCalls = (freshUser.total_llm_calls || 0) + 1;

                        transaction.update(userRef, { 
                            points_balance: newBalance,
                            total_llm_calls: newTotalCalls,
                        });

                        const transactionRef = doc(collection(db, 'points_transactions'));
                        const newTransaction: PointsTransaction = {
                            id: transactionRef.id,
                            uid: userId,
                            type: 'deduct',
                            amount: -cost,
                            reason: `AI Call: ${actionKey}`,
                            timestamp: serverTimestamp(),
                            llm_action: actionKey
                        }
                        transaction.set(transactionRef, newTransaction);
                        
                        // Update user object for level check after transaction
                        user.points_balance = newBalance;
                        user.total_llm_calls = newTotalCalls;
                    });
                }

                // After successful deduction, check for level up
                const currentLevel = user.level || 'New';
                const registrationDate = user.signup_date?.toDate ? user.signup_date.toDate() : new Date();
                const monthsSinceSignup = differenceInMonths(new Date(), registrationDate);
                const totalCalls = user.total_llm_calls || 0;
                let newLevel = currentLevel;

                if (currentLevel === 'New' && monthsSinceSignup >= 1 && totalCalls >= 100) {
                    newLevel = 'Regular';
                }
                if (currentLevel !== 'Pro' && monthsSinceSignup >= 6 && totalCalls >= 500) {
                    newLevel = 'Pro';
                }

                if (newLevel !== currentLevel) {
                    await updateDoc(userRef, { level: newLevel, last_level_check: serverTimestamp() });
                    console.log(`User ${userId} promoted from ${currentLevel} to ${newLevel}.`);
                }
            }
        }
    }
    // =================================================================


    let finalPromptKey = promptKey;
    let finalSystemPrompt = messages.find(m => m.role === 'system')?.content || '';
    let finalModelId = modelId;

    // 1. Scenario-based configuration override (Highest Priority)
    if (scenario) {
        // Scenario ID is now the document ID
        const scenarioDocRef = doc(db, 'ai_scenarios', scenario);
        const scenarioDocSnap = await getDoc(scenarioDocRef);
        
        if (scenarioDocSnap.exists()) {
            const scenarioDoc = { id: scenarioDocSnap.id, ...scenarioDocSnap.data() } as AIScenario;
            if (await isRuleSetValid(scenarioDoc, userId)) {
                finalPromptKey = scenarioDoc.configuredPromptKey;
            }
        }
    }
    
    // 2. Fetch prompt document if a key is determined
    let promptDoc: Prompt | undefined;
    if (typeof finalPromptKey === 'string' && finalPromptKey.trim() !== '') {
        const q = query(collection(db, 'prompts'), where('promptKey', '==', finalPromptKey), limit(1));
        const promptSnapshot = await getDocs(q);

        if (!promptSnapshot.empty) {
            promptDoc = { id: promptSnapshot.docs[0].id, ...promptSnapshot.docs[0].data() } as Prompt;
            finalSystemPrompt = promptDoc.content; 
            if (promptDoc.modelId && !finalModelId) { 
                finalModelId = promptDoc.modelId;
            }
        }
    }

    // 3. If any manual configuration is found, use the custom fetch-based gateway
    if (finalModelId || promptDoc) {
        const allConnectionsSnapshot = await getDocs(query(collection(db, 'llm_connections'), where('status', '==', '活跃')));
        const allConnections = allConnectionsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as LlmConnection));
        const modelsToTry = await findModelsToTry(promptDoc, allConnections, finalModelId);

        if (modelsToTry.length > 0) {
            const assets = await getPlatformAssets(null);
            const errors: any[] = [];
            
            const conversationMessages = messages.filter(m => m.role !== 'system');
            const finalMessages = finalSystemPrompt ? [{ role: 'system', content: finalSystemPrompt }, ...conversationMessages] : conversationMessages;

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
                        
                        default: // OpenAI-compatible providers (includes DeepSeek, LiteLLM proxy, etc.)
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
                    
                    if (outputText) {
                        return { text: outputText };
                    }
                    throw new Error('API returned a valid response, but no text content was found.');

                } catch (error) {
                    console.error(`Attempt with model ${connection.modelName} failed:`, error);
                    errors.push(error);
                }
            }
            // If all manual attempts fail, fall through to Genkit.
            console.warn(`All manual LLM connections failed. Errors: ${errors.map(e => e.message).join(', ')}. Falling back to Genkit.`);
        }
    }

    // 4. Genkit Fallback: If no manual configuration leads to a successful call, use Genkit.
    console.log("No valid manual configuration found or all attempts failed. Using Genkit fallback.");
    const llmResponse = await ai.generate({
        prompt: messages.map(m => m.content).join('\n'), // Simple concatenation for fallback
        config: { temperature },
    });
    
    return { text: llmResponse.text() };
  }
);
