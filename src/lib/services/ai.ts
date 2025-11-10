/**
 * @file src/lib/services/ai.ts
 * @description AI Service Abstraction Layer.
 *
 * This service abstracts AI functionalities:
 * - Development: Uses OpenAI SDK
 * - Production: Uses Tencent Hunyuan (OpenAI-compatible)
 */

import OpenAI from 'openai';
import { getOpenAIForHunyuan } from '@/utils/openai-hunyuan';

// --- Service Initialization ---
let aiService: any;
let aiServiceType: 'openai' | 'hunyuan' | 'mock' | null = null;
let initializationError: Error | null = null;

try {
  console.log(`[AI Service] Initializing for environment: '${process.env.NEXT_PUBLIC_ENV}'`);

  if (process.env.NEXT_PUBLIC_ENV === 'production') {
    // =================================================================
    // PRODUCTION: Tencent Hunyuan (OpenAI-compatible)
    // =================================================================
    console.log('[AI Service] Using Tencent Hunyuan.');
    aiService = getOpenAIForHunyuan();
    aiServiceType = 'hunyuan';

  } else {
    // =================================================================
    // DEVELOPMENT: OpenAI
    // =================================================================
    console.log('[AI Service] Using OpenAI.');
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('[AI Service] OPENAI_API_KEY not set, using mock service.');
      aiService = createMockService();
      aiServiceType = 'mock';
    } else {
      aiService = new OpenAI({ apiKey });
      aiServiceType = 'openai';
    }
  }

} catch (error) {
  console.error('[AI Service] CRITICAL: AI service initialization failed.', error);
  initializationError = error as Error;
  aiService = createMockService();
  aiServiceType = 'mock';
}

// Mock service for fallback
function createMockService() {
  return {
    chat: {
      completions: {
        create: async (params: any) => ({
          choices: [{
            message: {
              content: `Mock AI response for: ${params.messages?.[0]?.content || 'test'}`
            }
          }]
        })
      }
    }
  };
}

/**
 * The singleton AI service instance.
 */
export const ai = aiService;

/**
 * The type of the initialized AI service.
 */
export { aiServiceType, initializationError };
