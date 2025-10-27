
'use server';
/**
 * @fileOverview An AI assistant flow to help clarify user demand details in a chat.
 *
 * - clarifyDemandDetails - A function that analyzes a chat and suggests the next question.
 * - ClarifyDemandDetailsInput - The input type for the clarifyDemandDetails function.
 * - ClarifyDemandDetailsOutput - The return type for the clarifyDemandDetails function.
 */

import { z } from 'zod';
import { getOpenAIForHunyuan } from '@/utils/openai-hunyuan';
import type { AssistantRule, User } from '@/lib/types';


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
    let timeIsValid: boolean | null = null; // null means no time rule is set
    let userIsValid: boolean | null = null; // null means no user rule is set
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
    if (hasUserRules) {
        userIsValid = false; // Assume false until a condition passes
        const userRole = requester.role;
        const userRating = requester.rating;

        if (userRole && targetRoles[userRole]) {
            const requiredRatings = targetRoles[userRole];
            if (!requiredRatings || requiredRatings.length === 0) {
                userIsValid = true; // Role matches and no specific rating is required
            } else if (userRating && requiredRatings.includes(userRating)) {
                userIsValid = true; // Role and rating match
            }
        }
    }
    
    // Combine rules
    if (conditions.ruleLogic === 'or') {
        if (!hasTimeRules && !hasUserRules) return false; // If no rules are set, it's not valid for OR logic
        return (timeIsValid === true) || (userIsValid === true);
    }
    
    // Default to AND logic
    if (timeIsValid === null && userIsValid === null) return false; // No rules set at all, not valid
    return (timeIsValid !== false) && (userIsValid !== false);
}


export async function clarifyDemandDetails(input: ClarifyDemandDetailsInput): Promise<ClarifyDemandDetailsOutput> {
    const context = `标题: ${input.demandTitle}\n描述: ${input.demandDescription}\n历史: ${input.chatHistory.map(m => `${m.isAIMessage ? 'AI' : '用户'}: ${m.text}`).join(' | ')}`;
    const openai = getOpenAIForHunyuan();
    try {
        const completion = await openai.chat.completions.create({
            model: process.env.HUNYUAN_MODEL || 'hunyuan-turbos-latest',
            messages: [
                { role: 'system', content: '你是一个产品需求澄清助手，请基于上下文给出 3-5 个进一步澄清问题。' },
                { role: 'user', content: `上下文: ${context}` },
            ],
            temperature: 0.7,
        });
        const content = completion.choices?.[0]?.message?.content?.trim() || '';
        return { clarification: content };
    } catch (error: any) {
        throw new Error(`AI澄清失败，请稍后重试。${error?.message || ''}`);
    }
}

