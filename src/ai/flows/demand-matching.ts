/**
 * @file src/ai/flows/demand-matching.ts
 * @description Demand matching AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface MatchDemandParams {
  demandId: string;
  suppliers: any[];
}

export interface MatchDemandResult {
  matches: Array<{
    supplierId: string;
    score: number;
    reason: string;
  }>;
}

/**
 * Match demands with suppliers using AI.
 */
export async function matchDemand(params: MatchDemandParams): Promise<MatchDemandResult> {
  const { demandId, suppliers } = params;

  try {
    console.log('[Demand Matching] Matching demand:', demandId, 'with', suppliers.length, 'suppliers');

    // Use AI to analyze and match
    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a demand matching assistant. Analyze suppliers and provide matching scores.'
        },
        {
          role: 'user',
          content: `Match demand ${demandId} with suppliers: ${JSON.stringify(suppliers)}`
        }
      ],
      max_tokens: 500,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    // Mock matches based on analysis
    const matches = suppliers.slice(0, 3).map((supplier, index) => ({
      supplierId: supplier.id || `supplier_${index}`,
      score: Math.random() * 100,
      reason: `AI analysis: ${analysis.substring(0, 100)}...`
    }));

    return {
      matches
    };

  } catch (error: any) {
    console.error('[Demand Matching] Error:', error);
    return {
      matches: []
    };
  }
}

export interface CreatePrivateDemandParams {
  demandData: any;
  userId: string;
}

export interface CreatePrivateDemandResult {
  demandId: string;
  success: boolean;
}

/**
 * Create a private demand.
 */
export async function createPrivateDemand(params: CreatePrivateDemandParams): Promise<CreatePrivateDemandResult> {
  const { demandData, userId } = params;

  try {
    console.log('[Demand Matching] Creating private demand for user:', userId);

    // Mock demand creation
    const demandId = `demand_${Date.now()}`;

    return {
      demandId,
      success: true
    };

  } catch (error: any) {
    console.error('[Demand Matching] Error:', error);
    return {
      demandId: '',
      success: false
    };
  }
}

export interface RecommendCreativesParams {
  demandId: string;
  criteria?: any;
}

export interface RecommendCreativesResult {
  creatives: Array<{
    creativeId: string;
    name: string;
    score: number;
    reason: string;
  }>;
}

/**
 * Recommend creatives for a demand.
 */
export async function recommendCreatives(params: RecommendCreativesParams): Promise<RecommendCreativesResult> {
  const { demandId, criteria } = params;

  try {
    console.log('[Demand Matching] Recommending creatives for demand:', demandId);

    // Mock creative recommendations
    const creatives = [
      {
        creativeId: 'creative_1',
        name: 'Creative Designer One',
        score: 9.2,
        reason: 'High match based on portfolio and skills'
      },
      {
        creativeId: 'creative_2',
        name: 'Creative Designer Two',
        score: 8.7,
        reason: 'Good experience in similar projects'
      }
    ];

    return {
      creatives
    };

  } catch (error: any) {
    console.error('[Demand Matching] Error:', error);
    return {
      creatives: []
    };
  }
}