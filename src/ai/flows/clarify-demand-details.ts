
'use server';
/**
 * @fileOverview An AI assistant flow to help clarify user demand details in a chat.
 *
 * - clarifyDemandDetails - A function that analyzes a chat and suggests the next question.
 * - ClarifyDemandDetailsInput - The input type for the clarifyDemandDetails function.
 * - ClarifyDemandDetailsOutput - The return type for the clarifyDemandDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { executePrompt } from './prompt-execution-flow';
import { intelligentRoutingFlow } from './intelligent-routing-flow';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, AssistantRule, Role } from '@/lib/types';


const ChatMessageSchema = z.object({
    id: z.string(),
    text: z.string(),
    senderId: z.string(),
    isAIMessage: z.boolean().optional(),
});

const ClarifyDemandDetailsInputSchema = z.object({
  demandId: z.string().describe("The ID of the private demand/chat."),
  demandTitle: z.string().describe('The title of the original user demand.'),
  demandDescription: z.string().describe('The detailed description of the original user demand.'),
  chatHistory: z.array(ChatMessageSchema).describe('The history of the conversation so far.'),
  userId: z.string().describe("The UID of the user initiating the request."),
  creatorId: z.string().describe("The UID of the creator whose assistant is being invoked."),
});
export type ClarifyDemandDetailsInput = z.infer<typeof ClarifyDemandDetailsInputSchema>;

const ClarifyDemandDetailsOutputSchema = z.object({
  clarification: z.string().describe('The next question the AI assistant should ask to further clarify the user\'s needs.'),
});
export type ClarifyDemandDetailsOutput = z.infer<typeof ClarifyDemandDetailsOutputSchema>;


// Helper to check if a rule is currently valid based on time and user.
async function isRuleValid(rule: AssistantRule, requester: User): Promise<boolean> {
    const now = new Date();
    let timeIsValid = true;
    let userIsValid = true;
    const { conditions } = rule;

    // Time-based rule validation
    if (conditions.repetition === 'none') {
        const startsAt = conditions.startsAt?.toDate ? conditions.startsAt.toDate() : null;
        const expiresAt = conditions.expiresAt?.toDate ? conditions.expiresAt.toDate() : null;
        if (startsAt && now < startsAt) timeIsValid = false;
        if (expiresAt && now > expiresAt) timeIsValid = false;
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

    // User-based rule validation
    const targetRoles = conditions.targetUserRoles;
    if (targetRoles && Object.keys(targetRoles).length > 0) {
        const userRole = requester.role;
        const userRating = requester.rating;

        if (!userRole || !targetRoles[userRole]) {
            userIsValid = false; // User's role is not in the target list
        } else {
            const requiredRatings = targetRoles[userRole];
            if (requiredRatings && requiredRatings.length > 0) {
                if (!userRating || !requiredRatings.includes(userRating)) {
                    userIsValid = false; // User's rating doesn't match
                }
            }
        }
    }

    // Combine rules
    if (conditions.ruleLogic === 'or') {
        const hasTimeRules = conditions.repetition && conditions.repetition !== 'none';
        const hasUserRules = targetRoles && Object.keys(targetRoles).length > 0;
        if (!hasTimeRules && !hasUserRules) return false;
        if (!hasTimeRules) return userIsValid;
        if (!hasUserRules) return timeIsValid;
        return timeIsValid || userIsValid;
    }
    
    // Default to AND logic
    return timeIsValid && userIsValid;
}


export async function clarifyDemandDetails(input: ClarifyDemandDetailsInput): Promise<ClarifyDemandDetailsOutput> {
  return clarifyDemandDetailsFlow(input);
}

const clarifyDemandDetailsFlow = ai.defineFlow(
  {
    name: 'clarifyDemandDetailsFlow',
    inputSchema: ClarifyDemandDetailsInputSchema,
    outputSchema: ClarifyDemandDetailsOutputSchema,
  },
  async (input) => {
    const userContent = `
        The client's original request:
        - Title: ${input.demandTitle}
        - Description: ${input.demandDescription}

        The conversation history so far:
        ${input.chatHistory.map(m => `- ${m.isAIMessage ? 'AI Assistant' : 'Client'}: ${m.text}`).join('\n')}
    `;

    try {
        let promptKeyToUse: string | undefined;

        // Fetch creator and requester data
        const [creatorSnap, requesterSnap] = await Promise.all([
            getDoc(doc(db, 'users', input.creatorId)),
            getDoc(doc(db, 'users', input.userId))
        ]);

        if (!creatorSnap.exists()) throw new Error("Creator not found.");
        if (!requesterSnap.exists()) throw new Error("Requester not found.");
        
        const creator = creatorSnap.data() as User;
        const requester = requesterSnap.data() as User;

        // Check creator's custom rules
        if (creator.assistantRules && creator.assistantRules.length > 0) {
            const sortedRules = [...creator.assistantRules].sort((a, b) => a.priority - b.priority);
            for (const rule of sortedRules) {
                if (await isRuleValid(rule, requester)) {
                    promptKeyToUse = rule.action.promptKey;
                    break; // Use the first valid rule
                }
            }
        }

        // If no custom rule matched, use creator's default or platform's default
        if (!promptKeyToUse) {
            promptKeyToUse = creator.defaultAssistantPromptKey || undefined;
        }

        const result = await executePrompt({
            // If a creator-specific prompt is found, use it. Otherwise, fall back to the platform scenario.
            promptKey: promptKeyToUse,
            scenario: promptKeyToUse ? undefined : 'chat-assistant',
            userId: input.userId,
            messages: [{ role: 'user', content: userContent }],
        });

        if (result.text.includes("[HANDOFF_TO_HUMAN]")) {
             throw new Error("AI requests handoff.");
        }

        if (!result.text) {
          throw new Error("AI failed to generate a clarification question.");
        }
        
        return { clarification: result.text };
    } catch (error) {
        console.warn("AI Assistant failed or requested handoff. Initiating intelligent routing.", error);

        const latestUserMessage = input.chatHistory.filter(m => !m.isAIMessage).pop()?.text || input.demandDescription;
        const routingResult = await intelligentRoutingFlow({
            requesterId: input.userId,
            requestDescription: `用户在与AI助理对话时遇到问题，请求人工介入。用户最后的问题是：“${latestUserMessage}”`,
        });

        const demandRef = doc(db, 'demands', input.demandId);
        const chatDocRef = doc(db, 'chats', input.demandId);

        if (routingResult.decision === 'route_to_designer' && routingResult.designerId) {
            const designerDoc = await getDoc(doc(db, 'users', routingResult.designerId));
            const designerName = designerDoc.exists() ? (designerDoc.data() as User).name : "平台专家";

            await updateDoc(demandRef, { creatorId: routingResult.designerId });
            
            const handoffMessage = {
                id: `handoff_${Date.now()}`,
                text: `已为您转接至平台专家【${designerName}】，他将很快加入对话。`,
                senderId: 'system',
                senderName: '系统消息',
                senderAvatar: '/bot.png',
                isAIMessage: true,
                timestamp: new Date(),
            };
            await updateDoc(chatDocRef, { messages: arrayUnion(handoffMessage) });

            return { clarification: "" }; // Return empty as the system message is now in the chat
        } else {
             const fallbackMessage = {
                id: `fallback_${Date.now()}`,
                text: "抱歉，目前所有设计师都在忙，请您稍后再试或在需求池发布公开需求。",
                senderId: 'system',
                senderName: '系统消息',
                senderAvatar: '/bot.png',
                isAIMessage: true,
                timestamp: new Date(),
            };
            await updateDoc(chatDocRef, { messages: arrayUnion(fallbackMessage) });
            
            return { clarification: "" }; // Return empty
        }
    }
  }
);
