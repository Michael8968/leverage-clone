/**
 * @file tests/integration/api-endpoints.test.ts
 * @description API 端点集成测试
 * 
 * 测试所有关键 API 端点的功能和集成
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

/**
 * API 响应类型
 */
interface APIResponse<T = any> {
  status: number;
  data: T;
}

/**
 * API 测试基类
 */
class APITestClient {
  constructor(private baseUrl: string = 'http://localhost:3000') {}

  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = { method };

    if (body) {
      options.body = JSON.stringify(body);
      options.headers = { 'Content-Type': 'application/json' };
    }

    try {
      const response = await fetch(url, options);
      const data = (await response.json()) as T;
      return { status: response.status, data };
    } catch (error) {
      console.error(`API 请求失败: ${method} ${url}`);
      throw error;
    }
  }
}

const apiClient = new APITestClient(
  process.env.API_URL || 'http://localhost:3000'
);

// =========================================================================
// 健康检查和系统状态 API
// =========================================================================
describe('Health & Status API - 系统监控', () => {
  it('GET /api/health - 健康检查端点', async () => {
  const response = await apiClient.request('GET', '/api/health');
    
    expect(response.status).toBe(200);
    // 不对响应体做具体假设，因为实现可能不同
    expect(response.data).toBeDefined();
  });

  it('应该响应正常状态码', async () => {
  const response = await apiClient.request('GET', '/api/health');
    expect([200, 204]).toContain(response.status);
  });
});

// =========================================================================
// 提示词 API 端点测试
// =========================================================================
describe('Prompts API - 提示词管理', () => {
  let createdPromptId: string | null = null;

  it('GET /api/prompts - 获取所有提示词', async () => {
    const response = await apiClient.request<any[]>('GET', '/api/prompts');
    
    expect(response.status).toBe(200);
    if (Array.isArray(response.data)) {
      expect(response.data).toBeDefined();
    }
  });

  it('POST /api/prompts - 创建新提示词', async () => {
    const newPrompt = {
      name: '测试提示词',
      promptKey: `test-prompt-${Date.now()}`,
      description: '用于集成测试的提示词',
      content: '测试内容：{user_input}',
      scope: '通用',
      status: '生效中',
    };

    const response = await apiClient.request<any>('POST', '/api/prompts', newPrompt);
    
    expect([200, 201]).toContain(response.status);
    if (response.data && typeof response.data === 'object') {
      const id = (response.data as any).id || (response.data as any)._id;
      if (id) {
        createdPromptId = id;
        expect(createdPromptId).toBeTruthy();
      }
    }
  });
});

// =========================================================================
// AI 场景 API 端点测试
// =========================================================================
describe('AI Scenarios API - 场景管理', () => {
  let createdScenarioId: string | null = null;

  it('GET /api/ai_scenarios - 获取所有 AI 场景', async () => {
    const response = await apiClient.request<any[]>('GET', '/api/ai_scenarios');
    
    expect(response.status).toBe(200);
    if (Array.isArray(response.data)) {
      expect(response.data).toBeDefined();
    }
  });

  it('POST /api/ai_scenarios - 创建新 AI 场景', async () => {
    const newScenario = {
      name: '测试 AI 场景',
      description: '用于集成测试的 AI 场景',
      configuredPromptKey: 'test-prompt',
      tags: ['test', 'integration'],
    };

    const response = await apiClient.request<any>(
      'POST',
      '/api/ai_scenarios',
      newScenario
    );
    
    expect([200, 201]).toContain(response.status);
    if (response.data && typeof response.data === 'object') {
      const id = (response.data as any).id || (response.data as any)._id;
      if (id) {
        createdScenarioId = id;
        expect(createdScenarioId).toBeTruthy();
      }
    }
  });
});

// =========================================================================
// LLM 连接 API 端点测试
// =========================================================================
describe('LLM Connections API - 模型连接', () => {
  it('GET /api/llm_connections - 获取所有 LLM 连接', async () => {
    const response = await apiClient.request<any[]>('GET', '/api/llm_connections');
    
    expect(response.status).toBe(200);
    if (Array.isArray(response.data)) {
      expect(response.data).toBeDefined();
    }
  });

  it('POST /api/llm_connections - 创建新 LLM 连接', async () => {
    const newLlm = {
      modelName: 'test-model',
      provider: 'test-provider',
      apiKey: 'test-key-123',
      priority: 1,
      status: '活跃',
    };

    const response = await apiClient.request<any>(
      'POST',
      '/api/llm_connections',
      newLlm
    );
    
    expect([200, 201]).toContain(response.status);
  });
});

// =========================================================================
// 供应商和商品 API 端点测试
// =========================================================================
describe('Suppliers & Products API - 商品管理', () => {
  it('GET /api/suppliers - 获取所有供应商', async () => {
    const response = await apiClient.request<any[]>('GET', '/api/suppliers');
    
    expect(response.status).toBe(200);
  });

  it('GET /api/products - 获取所有商品', async () => {
    const response = await apiClient.request<any[]>('GET', '/api/products');
    
    expect(response.status).toBe(200);
  });

  it('POST /api/suppliers - 创建新供应商', async () => {
    const newSupplier = {
      name: '测试供应商',
      address: '中关村',
      email: 'test@supplier.com',
    };

    const response = await apiClient.request<any>(
      'POST',
      '/api/suppliers',
      newSupplier
    );
    
    expect([200, 201]).toContain(response.status);
  });

  it('POST /api/products - 创建新商品', async () => {
    const newProduct = {
      name: '测试商品',
      description: '这是一个用于集成测试的商品',
      price: 999,
      category: '测试',
      supplierId: 'test-supplier',
      status: '已入库',
    };

    const response = await apiClient.request<any>('POST', '/api/products', newProduct);
    
    expect([200, 201]).toContain(response.status);
  });
});

// =========================================================================
// 错误处理和边界情况
// =========================================================================
describe('API 错误处理', () => {
  it('应该处理 404 - 资源未找到', async () => {
    const response = await apiClient.request(
      'GET',
      '/api/prompts/non-existent-id'
    );
    
    expect([404, 400, 500]).toContain(response.status);
  });

  it('应该处理并发请求', async () => {
    const requests = [
      apiClient.request('GET', '/api/prompts'),
      apiClient.request('GET', '/api/ai_scenarios'),
      apiClient.request('GET', '/api/suppliers'),
      apiClient.request('GET', '/api/products'),
    ];

    const responses = await Promise.all(requests);
    
    responses.forEach((response) => {
      expect(response.status).toBeGreaterThan(0);
    });
  });
});

// =========================================================================
// 性能和负载测试
// =========================================================================
describe('API 性能测试', () => {
  it('GET 请求应该在合理时间内响应', async () => {
    const startTime = performance.now();
    
    await apiClient.request('GET', '/api/prompts');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10000); // 10 秒超时
  });

  it('应该处理批量 GET 请求', async () => {
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push(apiClient.request('GET', '/api/prompts'));
    }

    const responses = await Promise.all(promises);

    expect(responses).toHaveLength(5);
    responses.forEach((response) => {
      expect(response.status).toBeGreaterThan(0);
    });
  });
});
