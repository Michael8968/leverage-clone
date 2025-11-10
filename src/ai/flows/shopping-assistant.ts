/**
 * @file src/ai/flows/shopping-assistant.ts
 * @description Shopping assistant AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface AssistShoppingParams {
  query: string;
  userId?: string;
  context?: any;
}

export interface AssistShoppingResult {
  suggestions: Array<{
    productId: string;
    name: string;
    reason: string;
  }>;
  response: string;
}

/**
 * Provide shopping assistance using AI.
 */
export async function assistShopping(params: AssistShoppingParams): Promise<AssistShoppingResult> {
  const { query, userId, context } = params;

  try {
    console.log('[Shopping Assistant] Assisting with query:', query);

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful shopping assistant. Provide product suggestions and recommendations.'
        },
        {
          role: 'user',
          content: `Help with shopping query: ${query}${context ? ` Context: ${JSON.stringify(context)}` : ''}`
        }
      ],
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'No suggestions available';

    // Mock product suggestions
    const suggestions = [
      {
        productId: 'prod_1',
        name: 'AI Assistant Tool',
        reason: 'Based on your interest in AI technology'
      },
      {
        productId: 'prod_2',
        name: 'Development Kit',
        reason: 'Suitable for developers'
      }
    ];

    return {
      suggestions,
      response
    };

  } catch (error: any) {
    console.error('[Shopping Assistant] Error:', error);
    return {
      suggestions: [],
      response: `Error: ${error.message}`
    };
  }
}

export interface GetProductRecommendationsParams {
  userId: string;
  preferences?: string[];
  limit?: number;
}

export interface GetProductRecommendationsResult {
  recommendations: Array<{
    productId: string;
    name: string;
    score: number;
    reason: string;
  }>;
}

/**
 * Get product recommendations for a user.
 */
export async function getProductRecommendations(params: GetProductRecommendationsParams): Promise<GetProductRecommendationsResult> {
  const { userId, preferences = [], limit = 5 } = params;

  try {
    console.log('[Shopping Assistant] Getting recommendations for user:', userId);

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a product recommendation assistant. Suggest products based on user preferences.'
        },
        {
          role: 'user',
          content: `Recommend products for user ${userId} with preferences: ${preferences.join(', ')}`
        }
      ],
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || '';

    // Mock recommendations based on AI response
    const recommendations = [
      {
        productId: 'prod_1',
        name: 'AI Development Kit',
        score: 0.9,
        reason: 'Based on your interest in AI development'
      },
      {
        productId: 'prod_2',
        name: 'Cloud Computing Guide',
        score: 0.8,
        reason: 'Suitable for cloud-based projects'
      }
    ].slice(0, limit);

    return {
      recommendations
    };

  } catch (error: any) {
    console.error('[Shopping Assistant] Error:', error);
    return {
      recommendations: []
    };
  }
}