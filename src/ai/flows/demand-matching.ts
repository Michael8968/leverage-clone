
'use server';

/**
 * @fileOverview AI flow for matching user demands with suitable products or creatives.
 *
 * - recommendCreatives - A function that takes a user demand and a list of creatives, and returns a list of recommended creatives.
 * - RecommendCreativesInput - The input type for the recommendCreatives function.
 * - RecommendCreativesOutput - The return type for the recommendCreatives function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DemandSchema = z.object({
  id: z.string().describe('The unique identifier of the demand.'),
  description: z.string().describe('The description of the demand.'),
  budget: z.number().describe('The budget for the demand.'),
  category: z.string().describe('The category of the demand.'),
});

export type Demand = z.infer<typeof DemandSchema>;

const CreativeSchema = z.object({
  id: z.string().describe('The unique identifier of the creative source (e.g., product, supplier).'),
  name: z.string().describe('The name of the creative source.'),
  description: z.string().describe('The description of the creative source.'),
  category: z.string().optional().describe('The category of the creative source.'),
});

export type Creative = z.infer<typeof CreativeSchema>;

const RecommendCreativesInputSchema = z.object({
  demand: DemandSchema.describe('The user demand.'),
  creatives: z.array(CreativeSchema).describe('The list of creatives (products, suppliers, etc.) to be considered.'),
});

export type RecommendCreativesInput = z.infer<typeof RecommendCreativesInputSchema>;

const RecommendationSchema = z.object({
  creativeId: z.string().describe('The ID of the recommended creative.'),
  reason: z.string().describe('The reason for recommending this creative.'),
});

const RecommendCreativesOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema).describe('The list of recommended creatives with reasons.'),
});

export type RecommendCreativesOutput = z.infer<typeof RecommendCreativesOutputSchema>;

export async function recommendCreatives(
  input: RecommendCreativesInput
): Promise<RecommendCreativesOutput> {
  return recommendCreativesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendCreativesPrompt',
  input: {schema: RecommendCreativesInputSchema},
  output: {schema: RecommendCreativesOutputSchema},
  prompt: `You are an expert in matching user demands with suitable creatives (products, services, or suppliers).

  Given a user demand and a list of available creatives, you will select the creatives that best match the demand and provide a concise reason for each recommendation.

  Demand:
  Description: {{{demand.description}}}
  Budget: {{{demand.budget}}}
  Category: {{{demand.category}}}

  Available Creatives (JSON):
  {{{json creatives}}}

  Please analyze the demand against the list of creatives. Pay attention to the description, category, and potential capabilities of each creative. 
  
  Return a list of the top recommendations with a clear, brief reason for why each is a good match.
  `,
});

const recommendCreativesFlow = ai.defineFlow(
  {
    name: 'recommendCreativesFlow',
    inputSchema: RecommendCreativesInputSchema,
    outputSchema: RecommendCreativesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
