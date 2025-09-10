
'use server';
/**
 * @fileOverview A Genkit flow for generating 3D models from text prompts.
 *
 * - generate3dModel - A function that takes a text prompt and returns an image data URI of the generated model.
 * - Generate3dModelOutput - The return type for the generate3dModel function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  return generate3dModelFlow(promptText);
}

const generate3dModelFlow = ai.defineFlow(
  {
    name: 'generate3dModelFlow',
    inputSchema: z.string(),
    outputSchema: Generate3dModelOutputSchema,
  },
  async (prompt) => {
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: `Generate a photorealistic image of a 3D model based on the following description. The model should be on a clean, light gray background. The lighting should be soft and even, highlighting the model's form and texture. Prompt: ${prompt}`,
      config: {
        aspectRatio: '1:1',
      }
    });
    
    if (!media.url) {
      throw new Error('Image generation failed to return a data URI.');
    }

    return { imageDataUri: media.url };
  }
);

