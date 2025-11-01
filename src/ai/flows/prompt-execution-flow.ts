

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LlmConnection, AIScenario, User, Prompt, PointsTransaction, TokenConversionConfig, PricingRule, Role, PointsConfig } from '@/lib/types';
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
  updatedUser: z.any().optional(), // UPDATED: Add optional field to return the latest user object
});

// Helper to check if a rule's conditions are met
async function isRuleValid(rule: PricingRule, userId?: string): Promise<boolean> {
    const now = new Date();
    let timeIsValid: boolean | null = null;
    let userIsValid: boolean | null = null;
    const { conditions } = rule;

    // Time-based rule validation
    const hasTimeRules = (conditions.repetition && conditions.repetition !== 'none') || conditions.startsAt || conditions.expiresAt;
    if (hasTimeRules) {
        timeIsValid = true; // Assume true until a condition fails
        if (conditions.repetition === 'none') {
            const startsAt = conditions.startsAt?.toDate ? conditions.startsAt.toDate() : null;
            const expiresAt = conditions.expiresAt?.toDate ? conditions.expiresAt.toDate() : null;
            if ((startsAt && now < startsAt) || (expiresAt && now > expiresAt)) {
                timeIsValid = false;
            }
        } else if (conditions.repetition) {
            const currentDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][now.getDay()];
            if (conditions.repetition === 'weekly' && !conditions.daysOfWeek?.includes(currentDay as any)) {
                timeIsValid = false;
            }
            if (timeIsValid && (conditions.startTime || conditions.endTime)) {
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const [startH, startM] = (conditions.startTime || "00:00").split(':').map(Number);
                const [endH, endM] = (conditions.endTime || "23:59").split(':').map(Number);
                const startTimeInMinutes = startH * 60 + startM;
                const endTimeInMinutes = endH * 60 + endM;
                if (currentTime < startTimeInMinutes || currentTime > endTimeInMinutes) {
                    timeIsValid = false;
                }
            }
        }
    }


    // User-based rule validation
    const targetRoles = conditions.targetUserRoles;
    const hasUserRules = targetRoles && Object.keys(targetRoles).length > 0;
    if (userId && hasUserRules) {
        userIsValid = false; // Assume false until a condition passes
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            const user = userDocSnap.data() as User;
            const userRole = user.role;
            const userRating = user.rating;

            if (userRole && targetRoles[userRole]) {
                const requiredRatings = targetRoles[userRole];
                if (!requiredRatings || requiredRatings.length === 0) {
                    userIsValid = true; // Role matches and no specific rating is required
                } else if (userRating && requiredRatings.includes(userRating)) {
                    userIsValid = true; // Role and rating match
                }
            }
        }
    } else if (hasUserRules && !userId) {
        userIsValid = false;
    }
    
    // Combine rules
    if (conditions.ruleLogic === 'or') {
        if (!hasTimeRules && !hasUserRules) return false; // If no rules are set, it's not valid for OR logic
        return (timeIsValid === true) || (userIsValid === true);
    }
    
    // Default to AND logic
    if (timeIsValid === null && userIsValid === null) return false; // No rules set at all, rule is not considered a match
    return (timeIsValid !== false) && (userIsValid !== false);
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
    let updatedUser: User | null = null;
    
    // =================================================================
    // Points Deduction & User Level Check Logic (UPGRADED)
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
                    
                    // Fetch all pricing configurations
                    const pointsConfigDoc = await getDoc(doc(db, 'configs', 'points'));
                    const pointsConfig = pointsConfigDoc.exists() ? pointsConfigDoc.data() as PointsConfig : { defaultPricing: {}, rules: {} };

                    let cost = pointsConfig.defaultPricing[actionKey] || 1; // Start with default cost
                    
                    const rulesForAction = (pointsConfig.rules[actionKey] || []).sort((a,b) => a.priority - b.priority);

                    // Find the first valid rule
                    for (const rule of rulesForAction) {
                        if (await isRuleValid(rule, userId)) {
                            // Apply the action of the first matched rule
                            if (rule.action.type === 'per_call') {
                                cost = rule.action.value;
                            } else if (rule.action.type === 'free') {
                                cost = 0;
                            }
                            // Future actions like 'per_minute' would be handled here
                            break; // Stop after applying the highest-priority rule
                        }
                    }

                    if ((user.points_balance || 0) < cost) {
                        throw new Error("积分余额不足，请充值后再试。");
                    }

                    // Use a transaction to deduct points and log the transaction atomically.
                    updatedUser = await runTransaction(db, async (transaction) => {
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
                        
                        // Return the latest user data from within the transaction
                        return { ...freshUser, points_balance: newBalance, total_llm_calls: newTotalCalls };
                    });
                }

                // After successful deduction, check for level up
                const userForLevelCheck = updatedUser || user;
                const currentLevel = userForLevelCheck.level || 'New';
                const registrationDate = userForLevelCheck.signup_date?.toDate ? userForLevelCheck.signup_date.toDate() : new Date();
                const monthsSinceSignup = differenceInMonths(new Date(), registrationDate);
                const totalCalls = userForLevelCheck.total_llm_calls || 0;
                let newLevel = currentLevel;

                if (currentLevel === 'New' && monthsSinceSignup >= 1 && totalCalls >= 100) {
                    newLevel = 'Regular';
                }
                if (currentLevel !== 'Pro' && monthsSinceSignup >= 6 && totalCalls >= 500) {
                    newLevel = 'Pro';
                }

                if (newLevel !== currentLevel) {
                    await updateDoc(userRef, { level: newLevel, last_level_check: serverTimestamp() });
                    if (updatedUser) updatedUser.level = newLevel;
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
        const scenarioDocRef = doc(db, 'ai_scenarios', scenario);
        const scenarioDocSnap = await getDoc(scenarioDocRef);
        
        if (scenarioDocSnap.exists()) {
            const scenarioDoc = { id: scenarioDocSnap.id, ...scenarioDocSnap.data() } as AIScenario;
            // The isRuleSetValid logic is now part of the points deduction, so we just get the key
            finalPromptKey = scenarioDoc.configuredPromptKey;
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

    // 3. Always use the custom fetch-based gateway.
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
                    return { text: outputText, updatedUser };
                }
                throw new Error('API returned a valid response, but no text content was found.');

            } catch (error) {
                console.error(`Attempt with model ${connection.modelName} failed:`, error);
                errors.push(error);
            }
        }
    }

    // 4. If all attempts fail, throw a definitive error. No fallback.
    throw new Error("未能找到可用的LLM连接来执行此请求，请在后台配置或检查您的模型连接。");
  }
);
