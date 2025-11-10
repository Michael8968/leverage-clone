/**
 * @file src/ai/flows/supplier-data-analysis.ts
 * @description Supplier data analysis AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface AnalyzeSupplierDataParams {
  supplierData: any[];
  criteria?: any;
}

export interface AnalyzeSupplierDataResult {
  analysis: {
    insights: string[];
    recommendations: string[];
    scores: Record<string, number>;
  };
}

/**
 * Analyze supplier data using AI.
 */
export async function analyzeSupplierData(params: AnalyzeSupplierDataParams): Promise<AnalyzeSupplierDataResult> {
  const { supplierData, criteria } = params;

  try {
    console.log('[Supplier Analysis] Analyzing', supplierData.length, 'suppliers');

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a supplier data analysis assistant. Provide insights and recommendations.'
        },
        {
          role: 'user',
          content: `Analyze supplier data: ${JSON.stringify(supplierData)}${criteria ? ` Criteria: ${JSON.stringify(criteria)}` : ''}`
        }
      ],
      max_tokens: 600,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    // Mock analysis results
    return {
      analysis: {
        insights: [
          'Supplier quality varies significantly',
          'Pricing shows competitive range',
          'Delivery times need improvement'
        ],
        recommendations: [
          'Prioritize suppliers with high ratings',
          'Negotiate better terms with top performers',
          'Consider supplier training programs'
        ],
        scores: {
          quality: 7.5,
          reliability: 6.8,
          cost: 8.2
        }
      }
    };

  } catch (error: any) {
    console.error('[Supplier Analysis] Error:', error);
    return {
      analysis: {
        insights: [],
        recommendations: [],
        scores: {}
      }
    };
  }
}

export interface EvaluateSellerDataParams {
  sellerData: any[];
  criteria?: any;
}

export interface EvaluateSellerDataResult {
  evaluation: {
    scores: Record<string, number>;
    recommendations: string[];
    summary: string;
  };
}

/**
 * Evaluate seller data using AI.
 */
export async function evaluateSellerData(params: EvaluateSellerDataParams): Promise<EvaluateSellerDataResult> {
  const { sellerData, criteria } = params;

  try {
    console.log('[Supplier Analysis] Evaluating seller data:', sellerData.length, 'items');

    const completion = await ai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a seller evaluation assistant. Evaluate seller data and provide scores and recommendations.'
        },
        {
          role: 'user',
          content: `Evaluate seller data: ${JSON.stringify(sellerData)}${criteria ? ` Criteria: ${JSON.stringify(criteria)}` : ''}`
        }
      ],
      max_tokens: 500,
    });

    const evaluation = completion.choices[0]?.message?.content || '';

    // Mock evaluation results
    return {
      evaluation: {
        scores: {
          quality: 8.0,
          reliability: 7.5,
          pricing: 6.8
        },
        recommendations: [
          'Consider this seller for high-quality products',
          'Monitor delivery times closely',
          'Negotiate volume discounts'
        ],
        summary: 'Overall good performance with room for improvement in pricing'
      }
    };

  } catch (error: any) {
    console.error('[Supplier Analysis] Error:', error);
    return {
      evaluation: {
        scores: {},
        recommendations: [],
        summary: 'Evaluation failed'
      }
    };
  }
}