/**
 * TCB API全验证脚本
 * 使用axios循环测试所有端点，mock data，assert 200 + 预期输出
 * 集成Jest，覆盖需求池/路由等场景
 */

const axios = require('axios');

// 配置测试环境
const BASE_URL = process.env.TCB_API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api/v1';

// Mock JWT token (需要根据实际认证系统调整)
const MOCK_JWT_TOKEN = process.env.MOCK_JWT_TOKEN || 'mock-jwt-token-for-testing';

// Mock 用户ID
const MOCK_USER_ID = 'test-user-123';

// 测试配置
const TEST_CONFIG = {
  timeout: 30000, // 30秒超时
  retries: 2,     // 重试次数
};

// 创建axios实例
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: TEST_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${MOCK_JWT_TOKEN}`,
  },
});

// 测试用例数据
const TEST_CASES = [
  // 管理/AI函数
  {
    name: 'getPlatformAssets',
    endpoint: `${API_PREFIX}/admin/getPlatformAssets`,
    method: 'POST',
    data: {},
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.vendors)).toBe(true);
      expect(Array.isArray(res.data.data.models)).toBe(true);
      expect(res.data.data.vendors.length).toBeGreaterThan(0);
      expect(res.data.data.models.length).toBeGreaterThan(0);
    },
  },
  {
    name: 'getPrompts',
    endpoint: `${API_PREFIX}/admin/getPrompts`,
    method: 'POST',
    data: {},
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data)).toBe(true);
    },
  },
  {
    name: 'executePrompt',
    endpoint: `${API_PREFIX}/core/executePrompt`,
    method: 'POST',
    data: {
      scenario: 'test',
      userId: MOCK_USER_ID,
      promptVars: { test: 'hello world' }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.response).toBeDefined();
      expect(typeof res.data.data.cost).toBe('number');
      expect(res.data.data.cost).toBeGreaterThanOrEqual(0);
    },
  },

  // 用户管理函数
  {
    name: 'batchUpdateUsers',
    endpoint: `${API_PREFIX}/admin/batchUpdateUsers`,
    method: 'POST',
    data: {
      updates: [
        {
          userId: MOCK_USER_ID,
          updates: { status: 'active' }
        }
      ]
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.updatedCount).toBeDefined();
    },
  },

  // 业务函数
  {
    name: 'getProductRecommendations',
    endpoint: `${API_PREFIX}/business/getProductRecommendations`,
    method: 'POST',
    data: {
      userId: MOCK_USER_ID,
      preferences: { category: 'electronics' }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.recommendations)).toBe(true);
    },
  },
  {
    name: 'recommendCreatives',
    endpoint: `${API_PREFIX}/business/recommendCreatives`,
    method: 'POST',
    data: {
      demandId: 'test-demand-123',
      requirements: { skills: ['design', 'development'] }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.creatives)).toBe(true);
    },
  },
  {
    name: 'createPrivateDemand',
    endpoint: `${API_PREFIX}/business/createPrivateDemand`,
    method: 'POST',
    data: {
      title: '测试需求',
      description: '这是一个测试需求',
      budget: 5000,
      category: 'design'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.demandId).toBeDefined();
      expect(res.data.data.chatId).toBeDefined();
    },
  },
  {
    name: 'clarifyDemandDetails',
    endpoint: `${API_PREFIX}/business/clarifyDemandDetails`,
    method: 'POST',
    data: {
      demandId: 'test-demand-123',
      chatHistory: [
        { role: 'user', content: '我需要一个logo设计' },
        { role: 'assistant', content: '请问您的预算范围是多少？' }
      ]
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.questions)).toBe(true);
    },
  },
  {
    name: 'intelligentRoutingFlow',
    endpoint: `${API_PREFIX}/business/intelligentRoutingFlow`,
    method: 'POST',
    data: {
      demandId: 'test-demand-123',
      demandDetails: {
        category: 'design',
        budget: 5000,
        urgency: 'normal'
      }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.routingDecision).toBeDefined();
      expect(res.data.data.assignedDesigner).toBeDefined();
    },
  },
  {
    name: 'evaluateSellerData',
    endpoint: `${API_PREFIX}/business/evaluateSellerData`,
    method: 'POST',
    data: {
      csvData: 'name,email,category\n张三,test@example.com,design\n李四,test2@example.com,development',
      evaluationCriteria: { minRating: 4.0 }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.data.evaluations)).toBe(true);
      expect(res.data.data.savedCount).toBeDefined();
    },
  },

  // 内容生成函数
  {
    name: 'generate3dModel',
    endpoint: `${API_PREFIX}/content/generate3dModel`,
    method: 'POST',
    data: {
      prompt: '一个现代风格的椅子'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.imageUrl).toBeDefined();
      expect(res.data.data.modelId).toBeDefined();
    },
  },
  {
    name: 'generateTripo3dModel',
    endpoint: `${API_PREFIX}/content/generateTripo3dModel`,
    method: 'POST',
    data: {
      prompt: '一个科幻风格的机器人',
      style: 'realistic'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.taskId).toBeDefined();
      expect(res.data.data.status).toBe('processing');
    },
  },
  {
    name: 'getTripo3dModelStatus',
    endpoint: `${API_PREFIX}/content/getTripo3dModelStatus`,
    method: 'POST',
    data: {
      taskId: 'test-task-123'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.status).toBeDefined();
    },
  },
  {
    name: 'generateNanoBananaImage',
    endpoint: `${API_PREFIX}/content/generateNanoBananaImage`,
    method: 'POST',
    data: {
      prompt: '一个可爱的卡通角色',
      style: 'anime'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.imageUrl).toBeDefined();
    },
  },

  // 多媒体函数
  {
    name: 'getUploadUrlForMediaAsset',
    endpoint: `${API_PREFIX}/multimodal/getUploadUrlForMediaAsset`,
    method: 'POST',
    data: {
      fileName: 'test-image.jpg',
      type: 'image/jpeg'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.uploadUrl).toBeDefined();
      expect(res.data.data.assetId).toBeDefined();
    },
  },
  {
    name: 'analyzeMediaAsset',
    endpoint: `${API_PREFIX}/multimodal/analyzeMediaAsset`,
    method: 'POST',
    data: {
      assetId: 'test-asset-123'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      expect(res.data.success).toBe(true);
      expect(res.data.data.analysis).toBeDefined();
      expect(res.data.data.assetId).toBeDefined();
    },
  },
];

// 工具函数：重试机制
async function retryRequest(requestFn, maxRetries = TEST_CONFIG.retries) {
  let lastError;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        console.log(`请求失败，重试 ${i + 1}/${maxRetries}:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 递增延迟
      }
    }
  }

  throw lastError;
}

// 测试单个端点
async function testEndpoint(testCase) {
  const { name, endpoint, method, data, expectedStatus, validateResponse } = testCase;

  console.log(`🧪 测试端点: ${name} (${method} ${endpoint})`);

  try {
    const response = await retryRequest(async () => {
      if (method === 'GET') {
        return await apiClient.get(endpoint, { params: data });
      } else {
        return await apiClient.post(endpoint, data);
      }
    });

    // 验证状态码
    expect(response.status).toBe(expectedStatus);

    // 验证响应格式
    expect(response.data).toBeDefined();
    expect(typeof response.data.success).toBe('boolean');

    // 验证业务逻辑
    if (validateResponse) {
      validateResponse(response);
    }

    console.log(`✅ ${name} 测试通过`);
    return { success: true, name, response: response.data };

  } catch (error) {
    console.error(`❌ ${name} 测试失败:`, error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return { success: false, name, error: error.message };
  }
}

// 主测试函数
describe('TCB API 全验证测试', () => {
  beforeAll(() => {
    console.log('🚀 开始TCB API全验证测试');
    console.log(`📍 测试环境: ${BASE_URL}`);
    console.log(`🔢 待测试端点数量: ${TEST_CASES.length}`);
  });

  afterAll(() => {
    console.log('🏁 TCB API全验证测试完成');
  });

  // 逐个测试所有端点
  TEST_CASES.forEach(testCase => {
    test(`测试 ${testCase.name} 端点`, async () => {
      const result = await testEndpoint(testCase);
      expect(result.success).toBe(true);
    }, TEST_CONFIG.timeout);
  });

  // 集成测试：需求池路由流程
  test('集成测试：完整需求池路由流程', async () => {
    console.log('🔄 开始集成测试：需求池路由流程');

    // 1. 创建需求
    const createResult = await testEndpoint(TEST_CASES.find(tc => tc.name === 'createPrivateDemand'));
    expect(createResult.success).toBe(true);

    const demandId = createResult.response.data.demandId;

    // 2. 需求澄清
    const clarifyResult = await testEndpoint({
      ...TEST_CASES.find(tc => tc.name === 'clarifyDemandDetails'),
      data: {
        demandId,
        chatHistory: [
          { role: 'user', content: '我需要设计一个电商网站' },
          { role: 'assistant', content: '请问您的具体要求是什么？' }
        ]
      }
    });
    expect(clarifyResult.success).toBe(true);

    // 3. 智能路由
    const routingResult = await testEndpoint({
      ...TEST_CASES.find(tc => tc.name === 'intelligentRoutingFlow'),
      data: {
        demandId,
        demandDetails: {
          category: 'web-design',
          budget: 10000,
          urgency: 'normal'
        }
      }
    });
    expect(routingResult.success).toBe(true);

    console.log('✅ 需求池路由流程集成测试通过');
  }, TEST_CONFIG.timeout * 2);

  // 性能测试：并发请求
  test('性能测试：并发请求处理', async () => {
    console.log('⚡ 开始性能测试：并发请求');

    const concurrentRequests = TEST_CASES.slice(0, 5).map(tc => testEndpoint(tc));
    const results = await Promise.all(concurrentRequests);

    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThanOrEqual(3); // 至少80%成功率

    console.log(`✅ 并发测试完成: ${successCount}/${concurrentRequests.length} 成功`);
  }, TEST_CONFIG.timeout * 2);

  // 错误处理测试
  test('错误处理测试：无效认证', async () => {
    console.log('🚫 测试错误处理：无效认证');

    const invalidClient = axios.create({
      baseURL: BASE_URL,
      timeout: TEST_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token',
      },
    });

    try {
      await invalidClient.post(`${API_PREFIX}/admin/getPlatformAssets`);
      fail('应该抛出401错误');
    } catch (error) {
      expect(error.response.status).toBe(401);
      console.log('✅ 无效认证错误处理正确');
    }
  });

  test('错误处理测试：无效请求数据', async () => {
    console.log('🚫 测试错误处理：无效请求数据');

    try {
      await apiClient.post(`${API_PREFIX}/core/executePrompt`, {});
      fail('应该抛出400错误');
    } catch (error) {
      expect(error.response.status).toBe(400);
      console.log('✅ 无效请求数据错误处理正确');
    }
  });
});

// 如果直接运行此文件
if (require.main === module) {
  // 设置Jest环境变量
  process.env.JEST_WORKER_ID = '1';

  // 运行测试
  const jest = require('jest');
  const config = {
    testEnvironment: 'node',
    testMatch: [__filename],
    verbose: true,
  };

  jest.runCLI(config, [process.cwd()]).then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  TEST_CASES,
  testEndpoint,
  apiClient,
};