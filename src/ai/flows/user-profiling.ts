'use server';
/**
 * @fileOverview A Genkit flow for generating a user profile from text and/or an image.
 *
 * - generateUserProfile - A function that takes user input and returns a structured user profile.
 * - GenerateUserProfileInput - The input type for the generateUserProfile function.
 * - UserProfile - The return type for the generateUserProfile function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { UserProfile } from '@/lib/types';

const GenerateUserProfileInputSchema = z.object({
  description: z.string().describe('The text description provided by the user.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type GenerateUserProfileInput = z.infer<
  typeof GenerateUserProfileInputSchema
>;

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

export async function generateUserProfile(
  input: GenerateUserProfileInput
): Promise<UserProfile> {
  return generateUserProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateUserProfilePrompt',
  input: { schema: GenerateUserProfileInputSchema },
  output: { schema: UserProfileSchema },
  prompt: `You are an expert at analyzing user descriptions and images to create a concise user profile.
Based on the following information, generate a user profile summary and a list of relevant tags.

User Description: {{{description}}}
{{#if photoDataUri}}
User Photo: {{media url=photoDataUri}}
{{/if}}

Your response must be a JSON object that conforms to the output schema.
The summary should be a single, insightful sentence.
The tags should be a list of 3-5 keywords that capture the essence of the user's request and style.
`,
});

const generateUserProfileFlow = ai.defineFlow(
  {
    name: 'generateUserProfileFlow',
    inputSchema: GenerateUserProfileInputSchema,
    outputSchema: UserProfileSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
