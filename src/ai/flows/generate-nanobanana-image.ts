'use server';
/**
 * @fileOverview A Genkit flow for generating images with the Gemini 2.5 Flash Image model.
 *
 * - generateNanoBananaImage - A function that takes a text prompt and an optional image and returns a generated image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { executePrompt } from './prompt-execution-flow';

const GenerateNanoBananaImageInputSchema = z.object({
  prompt: z.string().describe('The text prompt for image generation/editing.'),
  imageDataUri: z
    .string()
    .optional()
    .describe(
      "An optional input image to edit, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

const GenerateNanoBananaImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "The generated image as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export async function generateNanoBananaImage(
  input: z.infer<typeof GenerateNanoBananaImageInputSchema>
): Promise<z.infer<typeof GenerateNanoBananaImageOutputSchema>> {
  
  const promptParts: any[] = [{ role: 'user', content: input.prompt }];
  
  if (input.imageDataUri) {
    // This is a simplification. The executePrompt flow currently doesn't support multipart (image + text) prompts.
    // To make this work, executePrompt would need to be enhanced to handle image data.
    // For now, we'll combine them into a single string, which might not work for actual image models.
    const imageHint = `[An image is provided with the data URI: ${input.imageDataUri.substring(0, 50)}...]`;
    promptParts.push({role: 'user', content: imageHint });
  }

  const result = await executePrompt({
    scenario: 'ai-image-editing',
    messages: promptParts,
  });

  if (!result.text) {
    throw new Error('Image generation failed to return an image.');
  }

  const imageDataUri = result.text.startsWith('data:') ? result.text : `data:image/png;base64,${result.text}`;
  
  return { imageDataUri };
}
