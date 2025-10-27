'use server';
/**
 * @fileOverview A flow for proxying a request to the Tripo3D API to generate a model.
 *
 * - generateTripo3dModel - Creates a 3D model generation task with Tripo3D.
 */

import { z } from 'zod';

const GenerateTripo3dModelInputSchema = z.object({
  prompt: z.string().describe('The text prompt for model generation.'),
  apiKey: z.string().describe('The Tripo3D API key.'),
});

const GenerateTripo3dModelOutputSchema = z.any();

export type GenerateTripo3dModelInput = z.infer<typeof GenerateTripo3dModelInputSchema>;
export type GenerateTripo3dModelOutput = z.infer<typeof GenerateTripo3dModelOutputSchema>;

export async function generateTripo3dModel(
  input: GenerateTripo3dModelInput
): Promise<GenerateTripo3dModelOutput> {
  try {
    const { prompt, apiKey } = input;

    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({ type: 'text_to_model', prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.suggestion || 'Failed to create Tripo3D generation task.');
      } catch (e) {
        throw new Error('Failed to create Tripo3D generation task. Server response: ' + errorText);
      }
    }

    const responseData = (await response.json()) as {
      data?: { task_id?: string };
      [key: string]: unknown;
    };

    if (responseData.data?.task_id) {
        return responseData;
    }

    throw new Error('Tripo3D API did not return the expected task_id structure in the data field.');
  } catch (error) {
    console.error('Error in generateTripo3dModel:', error);
    throw error;
  }
}
