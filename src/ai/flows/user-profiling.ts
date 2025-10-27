
'use server';
/**
 * @fileOverview A flow for generating a user profile from text and/or an image.
 *
 * - generateUserProfile - A function that takes user input and returns a structured user profile.
 * - GenerateUserProfileInput - The input type for the generateUserProfile function.
 * - UserProfile - The return type for the generateUserProfile function.
 */

import { z } from 'zod';
import { generateWithHunyuan } from '@/ai/hunyuan-client';
import type { UserProfile } from '@/lib/types';

const GenerateUserProfileInputSchema = z.object({
  description: z.string().describe('The text description provided by the user.'),
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "An optional photo provided by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  userId: z.string().optional().describe('The user ID for tracking and cost calculation'),
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
  try {
    const systemPrompt = `You are an expert at analyzing user descriptions and images to create a concise user profile.
Based on the provided information, generate a user profile summary and a list of relevant tags.

Your response must be a valid JSON object that conforms to this schema:
{
  "summary": "A concise, one-sentence summary of the user profile",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

The summary should be a single, insightful sentence.
The tags should be a list of 3-5 keywords that capture the essence of the user's request and style.`;

    const userPrompt = `User Description: ${input.description}
${input.photoDataUri ? '\nNote: The user also provided a photo for context.' : ''}

Please generate a user profile based on this information.`;

    const result = await generateWithHunyuan({
      model: 'hunyuan-lite',
      messages: [
        { Role: 'system', Content: systemPrompt },
        { Role: 'user', Content: userPrompt },
      ],
      temperature: 0.7,
      userId: input.userId || 'anonymous-user', // 使用传入的 userId 或默认值
      actionType: 'user_profiling',
    });

    // Parse AI response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]) as UserProfile;
      
      if (!parsed.summary || !parsed.tags || !Array.isArray(parsed.tags)) {
        throw new Error('Invalid user profile format');
      }

      // Ensure tags are between 3-5 items
      if (parsed.tags.length < 3) {
        parsed.tags.push('general', 'user', 'profile');
      }
      if (parsed.tags.length > 5) {
        parsed.tags = parsed.tags.slice(0, 5);
      }

      return parsed;
    } catch (parseError) {
      console.error('Failed to parse AI user profile:', parseError);
      console.error('AI response was:', result.text);
      
      // Fallback: Generate basic profile
      return {
        summary: input.description.slice(0, 100) + (input.description.length > 100 ? '...' : ''),
        tags: ['general', 'user', 'request'],
      };
    }
  } catch (error) {
    console.error('Error in generateUserProfile:', error);
    throw error;
  }
}
