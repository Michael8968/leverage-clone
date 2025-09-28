
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


const ChatMessageSchema = z.object({
    id: z.string(),
    text: z.string(),
    senderId: z.string(),
    isAIMessage: z.boolean().optional(),
});

const ClarifyDemandDetailsInputSchema = z.object({
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

        if (!result.text) {
          throw new Error("AI failed to generate a clarification question.");
        }
        
        return { clarification: result.text };
    } catch (error) {
        console.warn("AI Assistant failed to respond, returning handoff message.", error);
        return { clarification: "这个问题我暂时无法回答，可能需要设计师亲自为您解答。" };
    }
  }
);
