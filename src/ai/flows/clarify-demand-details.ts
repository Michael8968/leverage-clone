
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
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';


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
    // This flow now acts as a simple wrapper.
    // It constructs the necessary messages and passes them to the central executePrompt gateway.
    // The gateway will handle all the logic of scenario lookup, prompt fetching, and execution.
    const userContent = `
        The client's original request:
        - Title: ${input.demandTitle}
        - Description: ${input.demandDescription}

        The conversation history so far:
        ${input.chatHistory.map(m => `- ${m.isAIMessage ? 'AI Assistant' : 'Client'}: ${m.text}`).join('\n')}
    `;

    // The system prompt is now managed within the 'prompts' collection in Firestore.
    // We just need to pass the business context and let the gateway handle the rest.
    try {
        const result = await executePrompt({
            scenario: 'chat-assistant', // This is the key to trigger the scenario-based logic
            userId: input.userId,
            messages: [
                { role: 'user', content: userContent }
            ],
        });

        // Check for special "handoff" keyword from AI
        if (result.text.includes("[HANDOFF_TO_HUMAN]")) {
             throw new Error("AI requests handoff.");
        }

        if (!result.text) {
          throw new Error("AI failed to generate a clarification question.");
        }
        
        return { clarification: result.text };
    } catch (error) {
        console.warn("AI Assistant failed or requested handoff. Initiating handoff to human agent.", error);

        // Handoff to human agent logic
        const latestUserMessage = input.chatHistory.filter(m => !m.isAIMessage).pop()?.text || input.demandDescription;
        const routingResult = await intelligentRoutingFlow({
            requesterId: input.userId,
            requestDescription: `用户在与AI助理对话时遇到问题，请求人工介入。用户最后的问题是：“${latestUserMessage}”`,
        });

        if (routingResult.decision === 'route_to_designer' && routingResult.designerId) {
            const demandRef = doc(db, 'demands', input.demandId);
            await updateDoc(demandRef, {
                creatorId: routingResult.designerId,
            });
            // This message will be sent by the AI to inform the user of the handoff
            return { clarification: `已为您转接至平台专家【${routingResult.reason}】，他将很快加入对话。` };
        } else {
             // If no agent is available even after routing
            return { clarification: "抱歉，目前所有设计师都在忙，请您稍后再试。" };
        }
    }
  }
);
