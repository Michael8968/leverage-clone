
'use server';
/**
 * @fileOverview A Genkit flow for generating images with the Gemini 2.5 Flash Image model.
 *
 * - generateNanoBananaImage - A function that takes a text prompt and an optional image and returns a generated image.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  return generateNanoBananaImageFlow(input);
}

const generateNanoBananaImageFlow = ai.defineFlow(
  {
    name: 'generateNanoBananaImageFlow',
    inputSchema: GenerateNanoBananaImageInputSchema,
    outputSchema: GenerateNanoBananaImageOutputSchema,
  },
  async ({ prompt, imageDataUri }) => {
    const promptParts: any[] = [{ text: prompt }];

    if (imageDataUri) {
      promptParts.unshift({ media: { url: imageDataUri } });
    }

    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: promptParts,
      config: {
        // IMPORTANT: The model currently requires both TEXT and IMAGE modalities.
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed to return an image.');
    }

    return { imageDataUri: media.url };
  }
);
