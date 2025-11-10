/**
 * @file src/ai/flows/admin-management-flows.ts
 * @description Admin management AI flows.
 */

import { ai } from '@/lib/services/ai';

export interface GetPromptsResult {
  prompts: Array<{
    promptKey: string;
    name: string;
    ownerType: string;
  }>;
}

/**
 * Get available prompts for admin.
 */
export async function getPrompts(): Promise<GetPromptsResult> {
  try {
    console.log('[Admin Management] Getting prompts');

    // Return mock prompts
    return {
      prompts: [
        {
          promptKey: 'default_reply',
          name: 'Default Greeting Prompt',
          ownerType: 'platform'
        },
        {
          promptKey: 'product_intro',
          name: 'Product Introduction Prompt',
          ownerType: 'platform'
        },
        {
          promptKey: 'customer_support',
          name: 'Customer Support Prompt',
          ownerType: 'platform'
        }
      ]
    };

  } catch (error: any) {
    console.error('[Admin Management] Error:', error);
    return {
      prompts: []
    };
  }
}