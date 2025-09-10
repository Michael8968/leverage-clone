'use server';

/**
 * @fileOverview An AI shopping assistant that recommends products based on user input.
 *
 * - getProductRecommendations - A function that handles the product recommendation process.
 * - GetProductRecommendationsInput - The input type for the getProductRecommendations function.
 * - GetProductRecommendationsOutput - The return type for the getProductRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetProductRecommendationsInputSchema = z.object({
  description: z.string().describe('The description of the desired product.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo related to the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userProfile: z.string().describe('User profile information'),
});
export type GetProductRecommendationsInput = z.infer<
  typeof GetProductRecommendationsInputSchema
>;

const GetProductRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('An array of product recommendations.'),
});
export type GetProductRecommendationsOutput = z.infer<
  typeof GetProductRecommendationsOutputSchema
>;

export async function getProductRecommendations(
  input: GetProductRecommendationsInput
): Promise<GetProductRecommendationsOutput> {
  return getProductRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getProductRecommendationsPrompt',
  input: {schema: GetProductRecommendationsInputSchema},
  output: {schema: GetProductRecommendationsOutputSchema},
  prompt: `You are a shopping assistant that recommends products to users based on their description and/or a photo.

  Here is the user's description: {{{description}}}
  {{#if photoDataUri}}
  Here is a photo the user provided: {{media url=photoDataUri}}
  {{/if}}

  Here is user profile information: {{{userProfile}}}

  Based on the above information, recommend some products available in the store. Return the recommendations as a list of product names.
  `,
});

const getProductRecommendationsFlow = ai.defineFlow(
  {
    name: 'getProductRecommendationsFlow',
    inputSchema: GetProductRecommendationsInputSchema,
    outputSchema: GetProductRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
