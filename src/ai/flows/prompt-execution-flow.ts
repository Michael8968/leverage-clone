/**
 * @file src/ai/flows/prompt-execution-flow.ts
 * @description AI Prompt Execution Flow using the abstracted AI service.
 */

import { ai } from '@/lib/services/ai';

export interface ExecutePromptParams {
  prompt: string;
  userId?: string;
  scenario?: string;
}

export interface ExecutePromptResult {
  output: string;
  status: 'succeeded' | 'failed';
  invokedFunction: string;
}

/**
 * Execute a prompt using the abstracted AI service.
 */
export async function executePrompt(params: ExecutePromptParams): Promise<ExecutePromptResult> {
  const { prompt, userId = 'anonymous', scenario = 'general' } = params;

  try {
    console.log(`[Prompt Execution] Executing prompt for user ${userId}, scenario: ${scenario}`);

    // Use the abstracted AI service
    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Default model, can be made configurable
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant for scenario: ${scenario}. Provide helpful and accurate responses.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const output = completion.choices[0]?.message?.content || 'No response generated';

    return {
      output,
      status: 'succeeded',
      invokedFunction: 'executePrompt'
    };

  } catch (error: any) {
    console.error('[Prompt Execution] Error:', error);
    return {
      output: `Error: ${error.message}`,
      status: 'failed',
      invokedFunction: 'executePrompt'
    };
  }
}