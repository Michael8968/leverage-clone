
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
});
export type ClarifyDemandDetailsInput = z.infer<typeof ClarifyDemandDetailsInputSchema>;

const ClarifyDemandDetailsOutputSchema = z.object({
  clarification: z.string().describe('The next question the AI assistant should ask to further clarify the user\'s needs.'),
});
export type ClarifyDemandDetailsOutput = z.infer<typeof ClarifyDemandDetailsOutputSchema>;


export async function clarifyDemandDetails(input: ClarifyDemandDetailsInput): Promise<ClarifyDemandDetailsOutput> {
  return clarifyDemandDetailsFlow(input);
}

// The original prompt content, now used as a fallback or within a prompt document.
const defaultClarifyPrompt = `You are an intelligent and friendly assistant for a creative designer. 
Your goal is to help the designer understand a client's needs by asking clarifying questions. The designer is busy and has asked you to take over the initial conversation.

Here is the client's original request:
- Title: {{{demandTitle}}}
- Description: {{{demandDescription}}}

Here is the conversation history so far:
{{#each chatHistory}}
- {{#if isAIMessage}}AI Assistant{{else}}Client{{/if}}: {{{text}}}
{{/each}}

Analyze the original request and the chat history. Identify what information is still missing to fully understand the client's requirements.
Formulate a single, concise, and friendly question to ask the client next. 
Focus on one key aspect at a time (e.g., budget, timeline, style references, materials, dimensions, target audience).
Do not be conversational. Do not greet the user. Just ask the next most important question.

Example questions:
- "关于材质您有特定的偏好或要求吗？"
- "您期望的交付日期大概是什么时候呢？"
- "为了更好地把握风格，请问您有参考图片、链接或者更具体的风格案例吗？"
- "这个模型的具体尺寸大概需要多大呢？"

Based on the provided information, what is the best next question to ask?
`;


const clarifyDemandDetailsFlow = ai.defineFlow(
  {
    name: 'clarifyDemandDetailsFlow',
    inputSchema: ClarifyDemandDetailsInputSchema,
    outputSchema: ClarifyDemandDetailsOutputSchema,
  },
  async (input) => {
    // This flow now acts as a simple wrapper around the unified executePrompt gateway.
    // It passes a 'scenario' key, allowing its behavior to be configured remotely
    // from the 'ai_scenarios' collection in Firestore.

    const chatHistoryText = input.chatHistory
        .map(m => `${m.isAIMessage ? 'AI Assistant' : 'Client'}: ${m.text}`)
        .join('\n');
    
    const userContent = `
        Demand Title: ${input.demandTitle}
        Demand Description: ${input.demandDescription}
        Chat History:
        ${chatHistoryText}
    `;

    const result = await executePrompt({
        scenario: 'chat-assistant', // This is the key for scenario-based config
        messages: [
            // If no scenario or prompt is configured, this system message acts as a fallback.
            { role: 'system', content: defaultClarifyPrompt }, 
            { role: 'user', content: userContent }
        ],
    });

    if (!result.text) {
      throw new Error("AI failed to generate a clarification question.");
    }
    
    return { clarification: result.text };
  }
);
