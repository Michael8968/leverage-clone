
'use server';
/**
 * @fileOverview A Genkit flow for proxying a request to the Tripo3D API to generate a model.
 *
 * - generateTripo3dModel - Creates a 3D model generation task with Tripo3D.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTripo3dModelInputSchema = z.object({
  prompt: z.string().describe('The text prompt for model generation.'),
  apiKey: z.string().describe('The Tripo3D API key.'),
});

// The output schema can be broader to capture any valid JSON response from the API.
const GenerateTripo3dModelOutputSchema = z.any();

export async function generateTripo3dModel(
  input: z.infer<typeof GenerateTripo3dModelInputSchema>
): Promise<any> {
  return generateTripo3dModelFlow(input);
}

const generateTripo3dModelFlow = ai.defineFlow(
  {
    name: 'generateTripo3dModelFlow',
    inputSchema: GenerateTripo3dModelInputSchema,
    outputSchema: GenerateTripo3dModelOutputSchema,
  },
  async ({ prompt, apiKey }) => {
    // Corrected Endpoint from official documentation
    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ type: 'text_to_model', prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        // Try to parse the structured error from Tripo3D
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || 'Failed to create Tripo3D generation task.');
      } catch (e) {
        // If parsing fails, return the raw server response
        throw new Error(`Failed to create Tripo3D generation task. Server response: ${errorText}`);
      }
    }

    const responseData = await response.json();
    
    // Correctly parse the nested task_id from the 'data' object
    if (responseData.data && responseData.data.task_id) {
        return { task_id: responseData.data.task_id };
    }

    // Throw an error if the expected structure is not found
    throw new Error('Tripo3D API did not return the expected task_id structure.');
  }
);
