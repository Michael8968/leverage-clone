/**
 * @file src/lib/services/functions.ts
 * @description Cloud Functions Service - TCB 云函数调用封装
 *
 * 提供统一的云函数调用接口，支持通过 TCB SDK 直接调用云函数
 * 在 HTTP 触发器配置之前，使用此服务调用云函数
 */

let tcbApp: any = null;
let initializationError: Error | null = null;

/**
 * 初始化 TCB 实例（懒加载）
 */
function initializeTCB() {
  if (tcbApp) return tcbApp;
  
  try {
    const { init } = require('@cloudbase/js-sdk');
    
    if (!process.env.NEXT_PUBLIC_TCB_ENV_ID) {
      throw new Error('NEXT_PUBLIC_TCB_ENV_ID is not defined');
    }

    tcbApp = init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
    });

    // 匿名登录（如果需要）
    tcbApp.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
    
    console.log('[Functions Service] TCB initialized successfully');
    return tcbApp;
  } catch (error) {
    initializationError = error as Error;
    console.error('[Functions Service] Initialization failed:', error);
    throw error;
  }
}

/**
 * 调用云函数的通用方法
 * @param functionName 云函数名称
 * @param data 传递给云函数的数据
 * @returns 云函数返回结果
 */
export async function callCloudFunction<T = any>(
  functionName: string,
  data: any = {}
): Promise<T> {
  try {
    const app = initializeTCB();
    
    console.log(`[Functions Service] Calling function: ${functionName}`, data);
    
    const result = await app.callFunction({
      name: functionName,
      data: data,
    });

    if (result.code) {
      throw new Error(`Cloud function error: ${result.code} - ${result.message}`);
    }

    console.log(`[Functions Service] Function ${functionName} executed successfully`);
    return result.result as T;
  } catch (error) {
    console.error(`[Functions Service] Error calling ${functionName}:`, error);
    throw error;
  }
}

/**
 * AI 相关云函数调用
 */
export const AIFunctions = {
  /**
   * 执行 AI 提示
   */
  executePrompt: async (params: {
    prompt: string;
    userId?: string;
    scenario?: string;
  }) => {
    return callCloudFunction('executePrompt', params);
  },

  /**
   * 产品推荐
   */
  recommendProducts: async (params: {
    userId: string;
    preferences?: any;
  }) => {
    return callCloudFunction('recommendProducts', params);
  },

  /**
   * 获取产品推荐
   */
  getProductRecommendations: async (params: {
    userId: string;
    category?: string;
  }) => {
    return callCloudFunction('getProductRecommendations', params);
  },

  /**
   * 推荐创意者
   */
  recommendCreatives: async (params: {
    demandId: string;
    requirements?: any;
  }) => {
    return callCloudFunction('recommendCreatives', params);
  },
};

/**
 * 需求管理相关云函数
 */
export const DemandFunctions = {
  /**
   * 创建私有需求
   */
  createPrivateDemand: async (params: {
    userId: string;
    title: string;
    description: string;
    budget?: number;
  }) => {
    return callCloudFunction('createPrivateDemand', params);
  },

  /**
   * 需求澄清
   */
  clarifyDemandDetails: async (params: {
    demandId: string;
    chatId: string;
    userMessage: string;
  }) => {
    return callCloudFunction('clarifyDemandDetails', params);
  },

  /**
   * 智能路由分配
   */
  intelligentRoutingFlow: async (params: {
    demandId: string;
    userId: string;
  }) => {
    return callCloudFunction('intelligentRoutingFlow', params);
  },
};

/**
 * 3D 生成相关云函数
 */
export const Generate3DFunctions = {
  /**
   * 生成 3D 模型图像
   */
  generate3dModel: async (params: {
    prompt: string;
    aspectRatio?: string;
  }) => {
    return callCloudFunction('generate3dModel', params);
  },

  /**
   * 创建 Tripo3D 任务
   */
  generateTripo3dModel: async (params: {
    prompt: string;
    modelType?: string;
  }) => {
    return callCloudFunction('generateTripo3dModel', params);
  },

  /**
   * 查询 Tripo3D 状态
   */
  getTripo3dModelStatus: async (params: {
    taskId: string;
  }) => {
    return callCloudFunction('getTripo3dModelStatus', params);
  },

  /**
   * 生成 Nano Banana 图像
   */
  generateNanoBananaImage: async (params: {
    prompt: string;
  }) => {
    return callCloudFunction('generateNanoBananaImage', params);
  },
};

/**
 * 平台管理相关云函数
 */
export const PlatformFunctions = {
  /**
   * 获取平台资产列表
   */
  getPlatformAssets: async () => {
    return callCloudFunction('getPlatformAssets', {});
  },

  /**
   * 获取提示模板
   */
  getPrompts: async (params?: {
    scope?: string;
    status?: string;
  }) => {
    return callCloudFunction('getPrompts', params || {});
  },

  /**
   * 测试 LLM 连接
   */
  testLlmConnection: async (params: {
    connectionId: string;
  }) => {
    return callCloudFunction('testLlmConnection', params);
  },

  /**
   * 从 LiteLLM 更新模型
   */
  updateModelsFromLiteLLM: async () => {
    return callCloudFunction('updateModelsFromLiteLLM', {});
  },

  /**
   * 批量更新用户
   */
  batchUpdateUsers: async (params: {
    userIds: string[];
    updates: any;
  }) => {
    return callCloudFunction('batchUpdateUsers', params);
  },
};

/**
 * 媒体处理相关云函数
 */
export const MediaFunctions = {
  /**
   * 获取上传 URL
   */
  getUploadUrlForMediaAsset: async (params: {
    fileName: string;
    fileType: string;
  }) => {
    return callCloudFunction('getUploadUrlForMediaAsset', params);
  },

  /**
   * 分析媒体资源
   */
  analyzeMediaAsset: async (params: {
    assetId: string;
    assetUrl: string;
  }) => {
    return callCloudFunction('analyzeMediaAsset', params);
  },
};

/**
 * 供应商相关云函数
 */
export const SupplierFunctions = {
  /**
   * 评估供应商数据
   */
  evaluateSellerData: async (params: {
    csvData: string;
  }) => {
    return callCloudFunction('evaluateSellerData', params);
  },
};

/**
 * 导出所有云函数服务
 */
export const CloudFunctions = {
  AI: AIFunctions,
  Demand: DemandFunctions,
  Generate3D: Generate3DFunctions,
  Platform: PlatformFunctions,
  Media: MediaFunctions,
  Supplier: SupplierFunctions,
  
  // 通用调用方法
  call: callCloudFunction,
};

export default CloudFunctions;
