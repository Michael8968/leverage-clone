
'use server';
/**
 * @fileOverview A Genkit flow for proxying a request to the Tripo3D API to get task status.
 *
 * - getTripo3dModelStatus - Fetches the status of a 3D model generation task from Tripo3D.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetTripo3dModelStatusInputSchema = z.object({
  taskId: z.string().describe('The ID of the generation task.'),
  apiKey: z.string().describe('The Tripo3D API key.'),
});

const GetTripo3dModelStatusOutputSchema = z.any();

export async function getTripo3dModelStatus(
  input: z.infer<typeof GetTripo3dModelStatusInputSchema>
): Promise<any> {
  return getTripo3dModelStatusFlow(input);
}

const getTripo3dModelStatusFlow = ai.defineFlow(
  {
    name: 'getTripo3dModelStatusFlow',
    inputSchema: GetTripo3dModelStatusInputSchema,
    outputSchema: GetTripo3dModelStatusOutputSchema,
  },
  async ({ taskId, apiKey }) => {
    const response = await fetch(`https://api.tripo3d.ai/v2/tripod/${taskId}`, {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${apiKey}` 
        },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Tripo3D task status.');
    }

    return await response.json();
  }
);
