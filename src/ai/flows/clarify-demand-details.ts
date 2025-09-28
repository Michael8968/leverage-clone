
'use server';
/**
 * @fileOverview An AI assistant flow to help clarify user demand details in a chat.
 *
 * - clarifyDemandDetails - A function that analyzes a chat and suggests the next question.
 * - ClarifyDemandDetailsInput - The input type for the clarifyDemandDetails function.
 * - ClarifyDemandDetailsOutput - The return type for the clarifyDemandDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePrompt } from './prompt-execution-flow';
import { intelligentRoutingFlow } from './intelligent-routing-flow';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';


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
});
export type ClarifyDemandDetailsInput = z.infer<typeof ClarifyDemandDetailsInputSchema>;

const ClarifyDemandDetailsOutputSchema = z.object({
  clarification: z.string().describe('The next question the AI assistant should ask to further clarify the user\'s needs.'),
});
export type ClarifyDemandDetailsOutput = z.infer<typeof ClarifyDemandDetailsOutputSchema>;


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
        const result = await executePrompt({
            scenario: 'chat-assistant',
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
