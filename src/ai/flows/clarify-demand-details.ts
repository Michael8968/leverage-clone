/**
 * @file src/ai/flows/clarify-demand-details.ts
 * @description Clarify demand details AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface ClarifyDemandParams {
  demand: any;
  userId?: string;
}

export interface ClarifyDemandResult {
  clarifiedDemand: any;
  questions: string[];
  suggestions: string[];
}

/**
 * Clarify demand details using AI.
 */
export async function clarifyDemandDetails(params: ClarifyDemandParams): Promise<ClarifyDemandResult> {
  const { demand, userId } = params;

  try {
    console.log('[Clarify Demand] Clarifying demand for user:', userId);

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a demand clarification assistant. Help clarify and improve demand descriptions.'
        },
        {
          role: 'user',
          content: `Clarify this demand: ${JSON.stringify(demand)}`
        }
      ],
      max_tokens: 400,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    // Mock clarified demand
    const clarifiedDemand = {
      ...demand,
      description: analysis,
      clarified: true
    };

    return {
      clarifiedDemand,
      questions: [
        'What is your budget range?',
        'When do you need this completed?',
        'Are there any specific requirements?'
      ],
      suggestions: [
        'Consider adding more details about the scope',
        'Specify the technology stack if known'
      ]
    };

  } catch (error: any) {
    console.error('[Clarify Demand] Error:', error);
    return {
      clarifiedDemand: demand,
      questions: [],
      suggestions: []
    };
  }
}

export interface IntelligentRoutingFlowParams {
  demand: any;
  designers: any[];
}

export interface IntelligentRoutingFlowResult {
  routing: {
    designerId: string;
    confidence: number;
    reason: string;
  };
}

/**
 * Intelligent routing flow for demands.
 */
export async function intelligentRoutingFlow(params: IntelligentRoutingFlowParams): Promise<IntelligentRoutingFlowResult> {
  const { demand, designers } = params;

  try {
    console.log('[Intelligent Routing] Routing demand to designers:', designers.length);

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent routing assistant. Route demands to the most suitable designers.'
        },
        {
          role: 'user',
          content: `Route this demand: ${JSON.stringify(demand)} to one of these designers: ${JSON.stringify(designers)}`
        }
      ],
      max_tokens: 300,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    // Mock routing result
    const routing = {
      designerId: designers[0]?.id || 'designer_1',
      confidence: 0.85,
      reason: `AI analysis: ${analysis.substring(0, 100)}...`
    };

    return {
      routing
    };

  } catch (error: any) {
    console.error('[Intelligent Routing] Error:', error);
    return {
      routing: {
        designerId: 'fallback_designer',
        confidence: 0.5,
        reason: 'Fallback routing due to error'
      }
    };
  }
}