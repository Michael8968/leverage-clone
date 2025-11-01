'use server';
/**
 * @fileOverview A Genkit flow for generating 3D models from text prompts.
 *
 * - generate3dModel - A function that takes a text prompt and returns an image data URI of the generated model.
 * - Generate3dModelOutput - The return type for the generate3dModel function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePrompt } from './prompt-execution-flow';

const Generate3dModelOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type Generate3dModelOutput = z.infer<
  typeof Generate3dModelOutputSchema
>;

export async function generate3dModel(
  promptText: string
): Promise<Generate3dModelOutput> {
  // REFACTORED: Use the centralized executePrompt flow
  const fullPrompt = `Generate a photorealistic image of a 3D model based on the following description. The model should be on a clean, light gray background. The lighting should be soft and even, highlighting the model's form and texture. Prompt: ${promptText}`;
  
  const result = await executePrompt({
    scenario: 'ai-image-creation', // Use a scenario to allow for admin configuration
    messages: [{ role: 'user', content: fullPrompt }],
    // The specific model (like imagen) should be configured in the LLM connections or via the scenario.
  });

  if (!result.text) { // Assuming the image URI is returned in the text field for simplicity
    throw new Error('Image generation failed to return a data URI.');
  }

  // The output from executePrompt might not be a data URI directly.
  // This part assumes the configured model returns a base64 string or a data URI.
  // A more robust solution might involve another step to handle different response formats.
  const imageDataUri = result.text.startsWith('data:') ? result.text : `data:image/png;base64,${result.text}`;

  return { imageDataUri };
}
