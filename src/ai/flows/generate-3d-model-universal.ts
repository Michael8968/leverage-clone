'use server';
/**
 * @fileOverview 通用 3D 模型生成流程 - 支持多个 3D 服务提供商
 * 
 * 通过智能场景配置动态调用不同的 3D 模型生成服务
 * 支持的提供商：Tripo3D、Meshy、Stability AI 3D 等
 * 
 * @module generate-3d-model-universal
 */

import { z } from 'zod';
import { collection, getDocs, query, where, orderBy } from '@/lib/cloudbase-compat';
import type { LlmConnection } from '@/lib/types';

// =================================================================
// 类型定义
// =================================================================

const Generate3DModelUniversalInputSchema = z.object({
  prompt: z.string().describe('3D 模型描述文本'),
  providerId: z.string().optional().describe('指定的服务提供商 ID（可选，不指定则自动选择）'),
  apiKey: z.string().optional().describe('用户自定义 API Key（可选，优先使用）'),
});

const Generate3DModelUniversalOutputSchema = z.object({
  taskId: z.string().describe('异步任务 ID'),
  provider: z.string().describe('实际使用的服务提供商'),
  estimatedTime: z.number().optional().describe('预计完成时间（秒）'),
});

export type Generate3DModelUniversalInput = z.infer<typeof Generate3DModelUniversalInputSchema>;
export type Generate3DModelUniversalOutput = z.infer<typeof Generate3DModelUniversalOutputSchema>;

// =================================================================
// 服务适配器接口
// =================================================================

interface Provider3DAdapter {
  name: string;
  generateModel: (prompt: string, apiKey: string, config?: Record<string, any>) => Promise<{ taskId: string; estimatedTime?: number }>;
  getStatus: (taskId: string, apiKey: string, config?: Record<string, any>) => Promise<{ status: string; output_image_url?: string; progress?: number }>;
}

// =================================================================
// Tripo3D 适配器
// =================================================================

const Tripo3DAdapter: Provider3DAdapter = {
  name: 'Tripo3D',
  
  async generateModel(prompt: string, apiKey: string, config?: Record<string, any>) {
    const baseUrl = config?.baseUrl || 'https://api.tripo3d.ai/v2/openapi';
    
    const response = await fetch(`${baseUrl}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Tripo3D API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      taskId: data.data.task_id,
      estimatedTime: 120, // 大约 2 分钟
    };
  },
  
  async getStatus(taskId: string, apiKey: string, config?: Record<string, any>) {
    const baseUrl = config?.baseUrl || 'https://api.tripo3d.ai/v2/openapi';
    
    const response = await fetch(`${baseUrl}/task/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Tripo3D status check error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      status: data.data.status,
      output_image_url: data.data.output?.rendered_image,
      progress: data.data.progress,
    };
  },
};

// =================================================================
// Meshy 适配器（示例）
// =================================================================

const MeshyAdapter: Provider3DAdapter = {
  name: 'Meshy',
  
  async generateModel(prompt: string, apiKey: string, config?: Record<string, any>) {
    const baseUrl = config?.baseUrl || 'https://api.meshy.ai/v2';
    
    const response = await fetch(`${baseUrl}/text-to-3d`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt: prompt,
        art_style: 'realistic',
        negative_prompt: 'low quality, low resolution, low poly, ugly',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Meshy API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      taskId: data.result,
      estimatedTime: 180, // 大约 3 分钟
    };
  },
  
  async getStatus(taskId: string, apiKey: string, config?: Record<string, any>) {
    const baseUrl = config?.baseUrl || 'https://api.meshy.ai/v2';
    
    const response = await fetch(`${baseUrl}/text-to-3d/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Meshy status check error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      status: data.status,
      output_image_url: data.thumbnail_url,
      progress: data.progress,
    };
  },
};

// =================================================================
// 适配器注册表
// =================================================================

const ADAPTERS: Record<string, Provider3DAdapter> = {
  'Tripo3D': Tripo3DAdapter,
  'Meshy': MeshyAdapter,
};

// =================================================================
// 获取可用的 3D 服务配置
// =================================================================

async function getAvailable3DServices(): Promise<LlmConnection[]> {
  try {
    const q = query(
      collection('llm_connections'),
      where('category', '==', '3D模型'),
      where('status', '==', '活跃')
    );
    
    const snapshot = await getDocs(q as any);
    const services = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as LlmConnection[];
    
    // 按优先级排序
    services.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    return services;
  } catch (error) {
    console.error('获取 3D 服务配置失败:', error);
    return [];
  }
}

// =================================================================
// 主函数：通用 3D 模型生成
// =================================================================

export async function generate3DModelUniversal(
  input: Generate3DModelUniversalInput
): Promise<Generate3DModelUniversalOutput> {
  const { prompt, providerId, apiKey: userApiKey } = input;
  
  // 1. 获取服务配置
  let serviceConfig: LlmConnection | undefined;
  
  if (providerId) {
    // 使用指定的服务
    const services = await getAvailable3DServices();
    serviceConfig = services.find(s => s.id === providerId);
    
    if (!serviceConfig) {
      throw new Error(`指定的 3D 服务未找到或未启用: ${providerId}`);
    }
  } else {
    // 自动选择优先级最高的服务
    const services = await getAvailable3DServices();
    serviceConfig = services[0];
    
    if (!serviceConfig) {
      throw new Error('未配置可用的 3D 模型生成服务，请在"智能场景配置"中添加');
    }
  }
  
  // 2. 获取适配器
  const adapter = ADAPTERS[serviceConfig.provider];
  
  if (!adapter) {
    throw new Error(`不支持的 3D 服务提供商: ${serviceConfig.provider}`);
  }
  
  // 3. 确定使用的 API Key（用户自定义 > 系统配置）
  const apiKey = userApiKey || serviceConfig.apiKey;
  
  if (!apiKey) {
    throw new Error(`${serviceConfig.provider} 需要 API Key，请配置或提供自定义 Key`);
  }
  
  // 4. 调用适配器生成模型
  try {
    const result = await adapter.generateModel(prompt, apiKey, serviceConfig.config);
    
    return {
      taskId: result.taskId,
      provider: serviceConfig.provider,
      estimatedTime: result.estimatedTime,
    };
  } catch (error: any) {
    console.error(`${serviceConfig.provider} 生成失败:`, error);
    throw new Error(`3D 模型生成失败: ${error.message}`);
  }
}

// =================================================================
// 查询任务状态
// =================================================================

export async function get3DModelTaskStatus(
  taskId: string,
  provider: string,
  apiKey?: string
): Promise<{ status: string; output_image_url?: string; progress?: number }> {
  // 1. 获取适配器
  const adapter = ADAPTERS[provider];
  
  if (!adapter) {
    throw new Error(`不支持的 3D 服务提供商: ${provider}`);
  }
  
  // 2. 如果没有提供 API Key，从配置中获取
  let finalApiKey = apiKey;
  
  if (!finalApiKey) {
    const services = await getAvailable3DServices();
    const serviceConfig = services.find(s => s.provider === provider);
    
    if (!serviceConfig) {
      throw new Error(`未找到 ${provider} 的配置`);
    }
    
    finalApiKey = serviceConfig.apiKey;
  }
  
  if (!finalApiKey) {
    throw new Error(`${provider} 需要 API Key`);
  }
  
  // 3. 查询状态
  try {
    return await adapter.getStatus(taskId, finalApiKey);
  } catch (error: any) {
    console.error(`${provider} 状态查询失败:`, error);
    throw new Error(`任务状态查询失败: ${error.message}`);
  }
}

// =================================================================
// 导出支持的提供商列表
// =================================================================

export async function getSupportedProviders(): Promise<string[]> {
  // 保持为 async，符合 Next.js Server Actions 的要求
  return Object.keys(ADAPTERS);
}
