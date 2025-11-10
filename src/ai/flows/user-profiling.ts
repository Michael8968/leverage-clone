/**
 * @file src/ai/flows/user-profiling.ts
 * @description User profiling AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface ProfileUserParams {
  userId: string;
  interactions: any[];
}

export interface ProfileUserResult {
  profile: {
    preferences: string[];
    interests: string[];
    behavior: string;
  };
}

/**
 * Profile user based on interactions.
 */
export async function profileUser(params: ProfileUserParams): Promise<ProfileUserResult> {
  const { userId, interactions } = params;

  try {
    console.log('[User Profiling] Profiling user:', userId);

    // Use AI to analyze user interactions
    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a user profiling assistant. Analyze user interactions and create a profile.'
        },
        {
          role: 'user',
          content: `Profile user ${userId} based on interactions: ${JSON.stringify(interactions)}`
        }
      ],
      max_tokens: 300,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    // Mock profile based on analysis
    return {
      profile: {
        preferences: ['technology', 'innovation'],
        interests: ['AI', 'development'],
        behavior: analysis.substring(0, 200)
      }
    };

  } catch (error: any) {
    console.error('[User Profiling] Error:', error);
    return {
      profile: {
        preferences: [],
        interests: [],
        behavior: 'Unable to analyze'
      }
    };
  }
}

export interface GenerateUserProfileParams {
  userId: string;
  data: any;
}

export interface GenerateUserProfileResult {
  profile: Record<string, any>;
}

/**
 * Generate user profile using AI.
 */
export async function generateUserProfile(params: GenerateUserProfileParams): Promise<GenerateUserProfileResult> {
  const { userId, data } = params;

  try {
    console.log('[User Profiling] Generating profile for user:', userId);

    // Use AI to generate profile
    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a user profiling assistant. Generate a detailed user profile based on provided data.'
        },
        {
          role: 'user',
          content: `Generate profile for user ${userId} with data: ${JSON.stringify(data)}`
        }
      ],
      max_tokens: 500,
    });

    const profileText = completion.choices[0]?.message?.content || '{}';
    
    // Parse the AI response as JSON
    let profile;
    try {
      profile = JSON.parse(profileText);
    } catch {
      profile = { description: profileText };
    }

    return {
      profile
    };

  } catch (error: any) {
    console.error('[User Profiling] Error:', error);
    return {
      profile: { error: error.message }
    };
  }
}