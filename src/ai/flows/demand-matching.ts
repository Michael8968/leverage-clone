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
  id: z.string().describe('The unique identifier of the creative.'),
  name: z.string().describe('The name of the creative.'),
  description: z.string().describe('The description of the creative.'),
  tags: z.array(z.string()).describe('The tags associated with the creative.'),
});

export type Creative = z.infer<typeof CreativeSchema>;

const RecommendCreativesInputSchema = z.object({
  demand: DemandSchema.describe('The user demand.'),
  creatives: z.array(CreativeSchema).describe('The list of creatives to be considered.'),
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
  prompt: `You are an expert in matching user demands with suitable creatives.

  Given a user demand and a list of creatives, you will select the creatives that best match the demand and provide a reason for each recommendation.

  Demand:
  Description: {{{demand.description}}}
  Budget: {{{demand.budget}}}
  Category: {{{demand.category}}}

  Creatives:
  {{#each creatives}}
  Name: {{{name}}}
  Description: {{{description}}}
  Tags: {{#each tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  ---
  {{/each}}

  Please provide a list of recommended creatives with reasons for each recommendation.
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
