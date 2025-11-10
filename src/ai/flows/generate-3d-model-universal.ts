/**
 * @file src/ai/flows/generate-3d-model-universal.ts
 * @description Universal 3D Model generation flow.
 */

import { ai } from '@/lib/services/ai';

export interface Generate3DUniversalParams {
  prompt: string;
  providerId?: string;
  apiKey?: string;
}

export interface Generate3DUniversalResult {
  taskId: string;
  provider: string;
  estimatedTime: number;
}

/**
 * Generate a 3D model using universal provider interface.
 */
export async function generate3DModelUniversal(params: Generate3DUniversalParams): Promise<Generate3DUniversalResult> {
  const { prompt, providerId = 'tripo', apiKey } = params;

  try {
    console.log('[3D Universal] Generating model with provider:', providerId, 'prompt:', prompt);

    // Route to appropriate provider
    if (providerId === 'tripo') {
      const { generateTripo3dModel } = await import('./generate-tripo3d-model');
      const result = await generateTripo3dModel({ prompt, apiKey });
      return {
        taskId: result.task_id,
        provider: providerId,
        estimatedTime: 60
      };
    }

    // Default fallback
    const taskId = `universal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      taskId,
      provider: providerId || 'unknown',
      estimatedTime: 60
    };

  } catch (error: any) {
    console.error('[3D Universal] Error:', error);
    throw new Error(`Failed to generate 3D model: ${error.message}`);
  }
}

export interface Get3DModelTaskStatusParams {
  taskId: string;
  providerId?: string;
}

export interface Get3DModelTaskStatusResult {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
}

/**
 * Get the status of a 3D model generation task.
 */
export async function get3DModelTaskStatus(params: Get3DModelTaskStatusParams): Promise<Get3DModelTaskStatusResult> {
  const { taskId, providerId = 'tripo' } = params;

  try {
    console.log('[3D Universal] Getting status for task:', taskId, 'provider:', providerId);

    if (providerId === 'tripo') {
      const { getTripo3dModelStatus } = await import('./get-tripo3d-model-status');
      const result = await getTripo3dModelStatus({ taskId });
      return {
        status: result.status === 'success' ? 'completed' : result.status === 'failed' ? 'failed' : 'processing',
        progress: result.progress || 0,
        result: result.output ? { output: result.output } : undefined
      };
    }

    // Mock status for unknown providers
    return {
      status: 'processing',
      progress: 50
    };

  } catch (error: any) {
    console.error('[3D Universal] Error getting status:', error);
    return {
      status: 'failed',
      error: error.message
    };
  }
}