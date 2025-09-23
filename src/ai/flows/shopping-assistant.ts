
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
import { generateUserProfile, type GenerateUserProfileInput } from './user-profiling';
import type { UserProfile } from '@/lib/types';


const ProductSchema = z.object({
  id: z.string().describe('The unique identifier of the product.'),
  name: z.string().describe('The name of the product.'),
  description: z.string().describe('The description of the product.'),
  category: z.string().describe('The category of the product.'),
  price: z.number().describe('The price of the product.'),
  supplierId: z.string().optional().describe('The ID of the supplier for this product.'),
});

const SupplierSchema = z.object({
  id: z.string().describe('The unique identifier of the supplier.'),
  name: z.string().describe('The name of the supplier.'),
  category: z.string().describe('The business category of the supplier.'),
  matchScore: z.number().optional().describe('An AI-generated score indicating supplier quality or match.'),
});

const UserProfileSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise, one-sentence summary of the user profile based on their input.'
    ),
  tags: z
    .array(z.string())
    .describe(
      'A list of 3-5 relevant keyword tags that describe the user profile, interests, or style.'
    ),
});


const GetProductRecommendationsInputSchema = z.object({
  description: z.string().describe('The user\'s request description.'),
  products: z.array(ProductSchema).describe('The list of available products in the store.'),
  suppliers: z.array(SupplierSchema).describe('The list of available suppliers.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo related to the product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GetProductRecommendationsInput = z.infer<
  typeof GetProductRecommendationsInputSchema
>;

const GetProductRecommendationsOutputSchema = z.object({
  userProfile: UserProfileSchema.describe("The generated user profile."),
  recommendations: z
    .array(z.string())
    .describe('An array of recommended product IDs. Should be between 3 to 5 products.'),
});
export type GetProductRecommendationsOutput = z.infer<
  typeof GetProductRecommendationsOutputSchema
>;

export async function getProductRecommendations(
  input: GetProductRecommendationsInput
): Promise<GetProductRecommendationsOutput> {
  return getProductRecommendationsFlow(input);
}

const RecommendationPromptInputSchema = GetProductRecommendationsInputSchema.extend({
    userProfile: UserProfileSchema
});


const recommendationPrompt = ai.definePrompt({
  name: 'recommendationPrompt',
  input: {schema: RecommendationPromptInputSchema },
  output: {schema: z.object({ recommendations: z.array(z.string()) })},
  prompt: `You are an expert shopping assistant. Your goal is to recommend the best products from a provided list based on the user's profile, also considering the quality and reputation of the supplier.

  User Profile:
  - Summary: {{{userProfile.summary}}}
  - Tags: {{#each userProfile.tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  Available Products (JSON format):
  {{{json products}}}
  
  Available Suppliers (JSON format):
  {{{json suppliers}}}

  {{#if photoDataUri}}
  The user also provided this photo for context: {{media url=photoDataUri}}
  {{/if}}

  Based on all the information, analyze the product list and select the 3 to 5 products that best match the user's profile and query. 
  When making recommendations, consider the product's attributes and its supplier's category and reputation (indicated by matchScore). Prefer products from more reputable suppliers.
  Return only the IDs of the recommended products.
  `,
});

const getProductRecommendationsFlow = ai.defineFlow(
  {
    name: 'getProductRecommendationsFlow',
    inputSchema: GetProductRecommendationsInputSchema,
    outputSchema: GetProductRecommendationsOutputSchema,
  },
  async (input) => {
    // Step 1: Generate user profile
    const userProfileInput: GenerateUserProfileInput = {
        description: input.description,
        photoDataUri: input.photoDataUri,
    };
    const userProfile = await generateUserProfile(userProfileInput);

    // Step 2: Get product recommendations based on the generated profile
    const recommendationInput = { ...input, userProfile };
    const { output } = await recommendationPrompt(recommendationInput);
    
    if (!output) {
      throw new Error("AI failed to generate product recommendations.");
    }

    // Step 3: Return the combined result
    return {
        userProfile: userProfile,
        recommendations: output.recommendations,
    };
  }
);
