
'use server';

/**
 * @fileOverview An AI shopping assistant that recommends products based on user input.
 *
 * - getProductRecommendations - A function that handles the product recommendation process.
 * - GetProductRecommendationsInput - The input type for the getProductRecommendations function.
 * - GetProductRecommendationsOutput - The return type for the getProductRecommendations function.
 */

import { z } from 'zod';
import { generateWithHunyuan, type HunyuanMessage } from '@/ai/hunyuan-client';
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
  userId: z.string().optional().describe('The user ID for tracking and cost calculation'),
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
  try {
    // Step 1: Generate user profile
    const userProfileInput: GenerateUserProfileInput = {
      description: input.description,
      photoDataUri: input.photoDataUri,
      userId: input.userId,
    };
    const userProfile = await generateUserProfile(userProfileInput);

    // Step 2: Get product recommendations based on the generated profile
    const systemPrompt = `You are an expert shopping assistant. Your goal is to recommend the best products from a provided list based on the user's profile, also considering the quality and reputation of the supplier.

Based on all the information, analyze the product list and select the 3 to 5 products that best match the user's profile and query. 
When making recommendations, consider the product's attributes and its supplier's category and reputation (indicated by matchScore). Prefer products from more reputable suppliers.

You MUST respond with a valid JSON object in this exact format:
{
  "recommendations": ["product_id_1", "product_id_2", "product_id_3"]
}

Return only the IDs of the recommended products in the JSON format above.`;

    const userPrompt = `User Profile:
- Summary: ${userProfile.summary}
- Tags: ${userProfile.tags.join(', ')}

Available Products:
${JSON.stringify(input.products, null, 2)}

Available Suppliers:
${JSON.stringify(input.suppliers, null, 2)}

${input.photoDataUri ? 'Note: The user also provided a photo for context.' : ''}

Please recommend 3-5 products that best match this user's profile and needs.`;

    const result = await generateWithHunyuan({
      model: 'hunyuan-lite',
      messages: [
        { Role: 'system', Content: systemPrompt },
        { Role: 'user', Content: userPrompt },
      ],
      temperature: 0.7,
      userId: input.userId || 'anonymous-user', // 使用传入的 userId 或默认值
      actionType: 'product_recommendation',
    });

    // Parse AI response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
        throw new Error('Invalid recommendations format');
      }

      // Validate that recommended IDs exist in the product list
      const validRecommendations = parsed.recommendations.filter((id: string) =>
        input.products.some(p => p.id === id)
      );

      if (validRecommendations.length === 0) {
        throw new Error('No valid product recommendations found');
      }

      return {
        userProfile,
        recommendations: validRecommendations.slice(0, 5), // Limit to max 5
      };
    } catch (parseError) {
      console.error('Failed to parse AI recommendations:', parseError);
      console.error('AI response was:', result.text);
      
      // Fallback: Return top 3 products from the list
      const fallbackRecommendations = input.products
        .slice(0, 3)
        .map(p => p.id);
      
      return {
        userProfile,
        recommendations: fallbackRecommendations,
      };
    }
  } catch (error) {
    console.error('Error in getProductRecommendations:', error);
    throw error;
  }
}
