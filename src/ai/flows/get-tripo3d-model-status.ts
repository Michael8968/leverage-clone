'use server';
/**
 * @fileOverview A flow for proxying a request to the Tripo3D API to get task status.
 *
 * - getTripo3dModelStatus - Fetches the status of a 3D model generation task from Tripo3D.
 */

import { z } from 'zod';

const GetTripo3dModelStatusInputSchema = z.object({
  taskId: z.string().describe('The ID of the generation task.'),
  apiKey: z.string().describe('The Tripo3D API key.'),
});

const GetTripo3dModelStatusOutputSchema = z.any();

export type GetTripo3dModelStatusInput = z.infer<typeof GetTripo3dModelStatusInputSchema>;
export type GetTripo3dModelStatusOutput = z.infer<typeof GetTripo3dModelStatusOutputSchema>;

export async function getTripo3dModelStatus(
  input: GetTripo3dModelStatusInput
): Promise<GetTripo3dModelStatusOutput> {
  try {
    const { taskId, apiKey } = input;

    // Corrected the polling endpoint based on the create task endpoint structure
    const response = await fetch('https://api.tripo3d.ai/v2/openapi/task/' + taskId, {
        method: 'GET', // Explicitly set method to GET for clarity
        headers: { 
            'Authorization': 'Bearer ' + apiKey
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
         try {
            // Try to parse the structured error from Tripo3D
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.suggestion || 'Failed to fetch Tripo3D task status.');
        } catch (e) {
            // If parsing fails, return the raw server response
            throw new Error('Failed to fetch Tripo3D task status. Server response: ' + errorText);
        }
    }

    const responseData = (await response.json()) as {
      data?: Record<string, unknown>;
      [key: string]: unknown;
    };

    // The status API returns the task object directly in the 'data' field
    if (responseData.data) {
        return responseData.data;
    }

    throw new Error('Tripo3D status API did not return the expected data structure.');
  } catch (error) {
    console.error('Error in getTripo3dModelStatus:', error);
    throw error;
  }
}
