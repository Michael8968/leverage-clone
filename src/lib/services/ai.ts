/**
 * @file src/lib/services/ai.ts
 * @description AI Service Abstraction Layer (Comprehensive Version).
 *
 * This service abstracts all AI-related functionalities, providing mock implementations
 * for development and a TCB cloud function interface for production.
 * This is the central fix for build errors related to the deleted 'src/ai' directory.
 */

// --- Mock Implementations for Development ---
// These functions mimic the expected signatures of the production TCB cloud functions
// or the previous Genkit flows. This allows the frontend to compile and run.

const mockSuccess = (data: any, functionName: string) => {
    console.log(`[Mock AI] Called ${functionName} with success.`);
    return Promise.resolve(data);
};

const mockFailure = (message: string, functionName: string) => {
    console.error(`[Mock AI] Called ${functionName} with failure: ${message}`);
    return Promise.reject(new Error(message));
};

const aiMocks = {
    // For Universal3DGenerator and Tripo3DGenerator
    generate3DModelUniversal: (params: { prompt: string, providerId?: string, apiKey?: string }) => {
        console.log('[Mock AI] generate3DModelUniversal called with:', params);
        return mockSuccess({
            taskId: `mock_task_${Date.now()}`,
            provider: params.providerId || 'mock-provider',
            estimatedTime: 60,
        }, 'generate3DModelUniversal');
    },
    get3DModelTaskStatus: (taskId: string, provider: string, apiKey?: string) => {
        console.log('[Mock AI] get3DModelTaskStatus called for task:', taskId);
        return mockSuccess({
            status: 'success',
            progress: 100,
            output_image_url: 'https://placehold.co/512x512/grey/white?text=Mock+3D+Result',
        }, 'get3DModelTaskStatus');
    },

    // Legacy Tripo3D functions
    generateTripo3dModel: (params: { prompt: string, apiKey: string }) => {
         console.log('[Mock AI] generateTripo3dModel called with:', params.prompt);
         return mockSuccess({
             data: { task_id: `mock_tripo_${Date.now()}` }
         }, 'generateTripo3dModel');
    },
    getTripo3dModelStatus: (params: { taskId: string, apiKey: string }) => {
        console.log('[Mock AI] getTripo3dModelStatus called for task:', params.taskId);
        return mockSuccess({
            status: 'success',
            progress: 100,
            output: {
                images: [{ url: 'https://placehold.co/512x512/blue/white?text=Mock+Tripo+Result' }]
            }
        }, 'getTripo3dModelStatus');
    },

    // For SubmissionForm
    getUploadUrlForMediaAsset: (params: { userId: string, fileName: string, contentType: string }) => {
        console.log('[Mock AI] getUploadUrlForMediaAsset called with:', params);
        const mediaAssetId = `mock_asset_${Date.now()}`;
        return mockSuccess({
            // This URL will not actually work for PUT, but it allows the code to proceed.
            uploadUrl: `https://mock.storage.com/${params.userId}/${mediaAssetId}`,
            mediaAssetId: mediaAssetId,
        }, 'getUploadUrlForMediaAsset');
    },

    // For ScheduleAndAssistantTab
    updateUserStatus: (params: any) => {
        console.log('[Mock AI] updateUserStatus called with:', params);
        return mockSuccess({ status: 'ok' }, 'updateUserStatus');
    },
    updateUserAssistantRules: (params: { userId: string, rules: any[] }) => {
        console.log('[Mock AI] updateUserAssistantRules called with:', params.rules.length, 'rules');
        return mockSuccess({ status: 'ok' }, 'updateUserAssistantRules');
    },

    // For admin/ai-scenario-config and creator-workbench
    getPrompts: () => {
        console.log('[Mock AI] getPrompts called.');
        return mockSuccess({
            prompts: [
                { promptKey: 'default_reply', name: 'Default Greeting Prompt', ownerType: 'platform' },
                { promptKey: 'product_intro', name: 'Product Introduction Prompt', ownerType: 'platform' },
            ]
        }, 'getPrompts');
    },
     // Fallback for any other functions that might be called
    executePrompt: async (prompt: string, scenario: string) => {
        console.log(`[Mock AI] Executing prompt for scenario '${scenario}': "${prompt.substring(0, 50)}..."`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        return {
            output: `This is a mock response for the prompt about '${scenario}'. The time is ${new Date().toLocaleTimeString()}`,
            status: 'succeeded',
            invokedFunction: 'mockExecutePrompt'
        };
    },
};


// --- Service Initialization ---
let aiService: any;
let aiServiceType: 'tcb' | 'mock' | null = null;
let initializationError: Error | null = null;

try {
  console.log(`[AI Service] Initializing for environment: '${process.env.NEXT_PUBLIC_ENV}'`);

  if (process.env.NEXT_PUBLIC_ENV === 'production') {
    // =================================================================
    // PRODUCTION: TCB Cloud Function Interface
    // =================================================================
    console.log('[AI Service] Using TCB Cloud Functions.');
    const { init } = require('@cloudbase/js-sdk');

    if (!process.env.NEXT_PUBLIC_TCB_ENV_ID) {
      throw new Error('NEXT_PUBLIC_TCB_ENV_ID is not defined for production environment.');
    }

    const tcbApp = init({ env: process.env.NEXT_PUBLIC_TCB_ENV_ID });

    // A generic function caller
    const callTcbFunction = async (functionName: string, params: object) => {
        console.log(`[AI Service] Calling TCB function '${functionName}' with params:`, params);
        try {
          const result = await tcbApp.callFunction({ name: functionName, data: params });
          // Assuming a standard response format from all TCB functions
          if (result.result && (result.result.status === 'succeeded' || result.result.code === 'SUCCESS')) {
            return result.result.data;
          } else {
            throw new Error(result.result.message || `TCB function '${functionName}' returned a failure status.`);
          }
        } catch (error) {
          console.error(`[AI Service] Error calling TCB function '${functionName}':`, error);
          throw error;
        }
      };

    // The actual service object that calls TCB cloud functions
    aiService = new Proxy({}, {
        get(target, prop, receiver) {
            // For any property accessed on `aiService`, return a function that calls the TCB
            // function with the same name (the property name).
            return (params: any) => callTcbFunction(String(prop), params);
        }
    });

    aiServiceType = 'tcb';
    console.log('[AI Service] TCB Cloud Function proxy initialized.');

  } else {
    // =================================================================
    // DEVELOPMENT: Mock Service Interface
    // =================================================================
    console.warn('[AI Service] WARNING: Using mock AI service for development. All AI calls will be simulated.');
    
    // Use a proxy to catch any calls to functions that aren't explicitly mocked
    aiService = new Proxy(aiMocks, {
        get(target, prop, receiver) {
            if (prop in target) {
                return (target as any)[prop];
            }
            // If a function is called that doesn't have a specific mock, return a generic one
            console.warn(`[Mock AI] WARNING: No specific mock found for '${String(prop)}'. Returning a generic success response.`);
            return (params: any) => mockSuccess({
                message: `Generic success for ${String(prop)}`,
                params,
            }, `generic:${String(prop)}`);
        }
    });
    aiServiceType = 'mock';
  }

} catch (error) {
  console.error('[AI Service] CRITICAL: AI service initialization failed.', error);
  initializationError = error as Error;
  aiService = new Proxy({}, {
    get(target, prop) {
      throw new Error(`AI service is not available due to initialization failure: ${initializationError!.message}`);
    }
  });
  aiServiceType = null;
}

/**
 * The singleton AI service instance.
 * Provides methods to call AI backend functions (either TCB cloud functions or mocks).
 * In development, any function can be called on `ai`, and a mock will be returned.
 * In production, any function call on `ai` will be proxied to a TCB cloud function of the same name.
 * e.g., `ai.generate3DModelUniversal({ prompt: '...' })`
 */
export const ai = aiService;

/**
 * The type of the initialized AI service.
 */
export { aiServiceType, initializationError };
