'use server';
/**
 * @fileOverview A Genkit flow for generating a user profile from text and/or an image.
 *
 * - generateUserProfile - A function that takes user input and returns a structured user profile.
 * - GenerateUserProfileInput - The input type for the generateUserProfile function.
 * - UserProfile - The return type for the generateUserProfile function.
 */

import { z } from 'genkit';
import type { UserProfile } from '@/lib/types';
import { executePrompt } from './prompt-execution-flow';

const GenerateUserProfileInputSchema = z.object({
  description: z.string().describe('The text description provided by the user.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  userId: z.string().optional(),
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
  // Construct a prompt that asks for a JSON output matching the UserProfile schema.
  const systemPrompt = `You are an expert at analyzing user descriptions and images to create a concise user profile.
Based on the following information, generate a user profile summary and a list of relevant tags.

Your response must be a JSON object with two keys: "summary" (string) and "tags" (array of strings).
The summary should be a single, insightful sentence.
The tags should be a list of 3-5 keywords that capture the essence of the user's request and style.
`;

  let userContent = `User Description: ${input.description}`;
  if (input.photoDataUri) {
    // Note: The underlying `executePrompt` doesn't handle image data directly. 
    // This is a textual hint to the model.
    userContent += `\n[An image was provided. Analyze its contents as part of the profile.]`;
  }
  
  const result = await executePrompt({
    scenario: 'user-profiling',
    userId: input.userId,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  try {
    const parsedOutput = JSON.parse(result.text);
    // Validate the parsed output against the Zod schema.
    const validatedProfile = UserProfileSchema.parse(parsedOutput);
    return validatedProfile;
  } catch (error) {
    console.error("Failed to parse or validate user profile from LLM:", error);
    // Fallback in case of parsing/validation error
    return {
      summary: '无法自动生成用户画像概要。',
      tags: ['分析失败'],
    };
  }
}
