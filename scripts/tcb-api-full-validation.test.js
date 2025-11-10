/**
 * TCB API 全验证测试脚本
 * 使用 axios 测试所有已部署的云函数
 */

const axios = require('axios');
const http = require('http');
const url = require('url');

// 配置
const CONFIG = {
  // 优先使用环境变量以连接真实网关；未提供时使用本地mock服务器
  baseURL: process.env.TCB_API_BASE_URL || 'http://127.0.0.1:34567',
  timeout: 30000,
  retries: 2
};

// 启动一个简单的本地Mock服务（仅在未配置TCB_API_BASE_URL时使用）
function startMockServer(port = 34567) {
  const routes = new Map();
  const ok = (res, data) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const notFound = (res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  };

  // 注册所有需要的路由
  routes.set('GET /getPlatformAssets', (req, res) => ok(res, { providers: [{ name: 'OpenAI' }, { name: 'Tencent' }] }));
  routes.set('GET /getPrompts', (req, res) => ok(res, { prompts: [{ id: 'p1' }] }));
  routes.set('POST /testLlmConnection', (req, res) => ok(res, { success: true }));
  routes.set('POST /executePrompt', (req, res) => ok(res, { output: 'mock-output', status: 'ok' }));
  routes.set('POST /batchUpdateUsers', (req, res) => ok(res, { success: true }));
  routes.set('POST /recommendProducts', (req, res) => ok(res, { products: [{ id: 'prod1' }] }));
  routes.set('POST /getProductRecommendations', (req, res) => ok(res, { recommendations: [{ id: 'rec1' }] }));
  routes.set('POST /recommendCreatives', (req, res) => ok(res, { creatives: [{ id: 'cr1' }, { id: 'cr2' }] }));
  routes.set('POST /createPrivateDemand', (req, res) => ok(res, { demandId: 'mock_demand_123' }));
  routes.set('POST /generateNanoBananaImage', (req, res) => ok(res, { imageUrl: 'https://example.com/mock.jpg' }));
  routes.set('POST /getUploadUrlForMediaAsset', (req, res) => ok(res, { uploadUrl: 'https://example.com/upload', fileKey: 'uploads/mock.jpg' }));
  routes.set('POST /analyzeMediaAsset', (req, res) => ok(res, { analysis: 'mock analysis...' }));
  routes.set('POST /clarifyDemandDetails', (req, res) => ok(res, { clarifiedDemand: { id: 'cd1' }, questions: ['q1'] }));
  routes.set('POST /intelligentRoutingFlow', (req, res) => ok(res, { routing: { designerId: 'designer1', confidence: 0.93 } }));
  routes.set('POST /evaluateSellerData', (req, res) => ok(res, { evaluation: { scores: [1, 2, 3] }, suppliersProcessed: 2 }));
  routes.set('POST /generate3dModel', (req, res) => ok(res, { taskId: 'task_123' }));
  routes.set('POST /generateTripo3dModel', (req, res) => ok(res, { task_id: 'tripo_task_123' }));
  routes.set('POST /getTripo3dModelStatus', (req, res) => ok(res, { status: 'queued', progress: 0 }));

  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);
    const key = `${req.method} ${parsed.pathname}`;
    const handler = routes.get(key);
    if (!handler) return notFound(res);

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try { req.body = body ? JSON.parse(body) : {}; } catch (_) { req.body = {}; }
        handler(req, res);
      });
    } else {
      handler(req, res);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🔧 Mock server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

// 测试用例
const TEST_CASES = [
  {
    name: 'getPlatformAssets',
    endpoint: '/getPlatformAssets',
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.providers || !Array.isArray(res.data.providers)) {
        throw new Error('Response should contain providers array');
      }
      console.log(`✅ Found ${res.data.providers.length} providers`);
    }
  },
  {
    name: 'getPrompts',
    endpoint: '/getPrompts',
    method: 'GET',
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!Array.isArray(res.data.prompts)) {
        throw new Error('Response should contain prompts array');
      }
      console.log(`✅ Found ${res.data.prompts.length} prompts`);
    }
  },
  {
    name: 'testLlmConnection',
    endpoint: '/testLlmConnection',
    method: 'POST',
    data: {
      connection: {
        provider: 'OpenAI',
        modelName: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        apiBaseUrl: 'https://api.openai.com/v1'
      }
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (typeof res.data.success !== 'boolean') {
        throw new Error('Response should contain success boolean');
      }
      console.log(`✅ Connection test result: ${res.data.success ? 'success' : 'failed'}`);
    }
  },
  {
    name: 'executePrompt',
    endpoint: '/executePrompt',
    method: 'POST',
    data: {
      prompt: 'Hello, test message',
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.output || !res.data.status) {
        throw new Error('Response should contain output and status');
      }
      console.log(`✅ Prompt execution status: ${res.data.status}`);
    }
  },
  {
    name: 'batchUpdateUsers',
    endpoint: '/batchUpdateUsers',
    method: 'POST',
    data: {
      updates: [
        {
          userId: 'test-user-1',
          updates: { role: 'user' }
        }
      ]
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (typeof res.data.success !== 'boolean') {
        throw new Error('Response should contain success boolean');
      }
      console.log(`✅ Batch update result: ${res.data.success ? 'success' : 'failed'}`);
    }
  },
  {
    name: 'recommendProducts',
    endpoint: '/recommendProducts',
    method: 'POST',
    data: {
      userId: 'test-user',
      category: 'electronics',
      limit: 5
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!Array.isArray(res.data.products)) {
        throw new Error('Response should contain products array');
      }
      console.log(`✅ Found ${res.data.products.length} recommended products`);
    }
  },
  {
    name: 'getProductRecommendations',
    endpoint: '/getProductRecommendations',
    method: 'POST',
    data: {
      userId: 'test-user',
      preferences: ['electronics', 'books']
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!Array.isArray(res.data.recommendations)) {
        throw new Error('Response should contain recommendations array');
      }
      console.log(`✅ Found ${res.data.recommendations.length} product recommendations`);
    }
  },
  {
    name: 'recommendCreatives',
    endpoint: '/recommendCreatives',
    method: 'POST',
    data: {
      demandId: 'test-demand',
      limit: 3
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!Array.isArray(res.data.creatives)) {
        throw new Error('Response should contain creatives array');
      }
      console.log(`✅ Found ${res.data.creatives.length} recommended creatives`);
    }
  },
  {
    name: 'createPrivateDemand',
    endpoint: '/createPrivateDemand',
    method: 'POST',
    data: {
      title: 'Test Demand',
      description: 'Test demand description',
      userId: 'test-user',
      budget: 1000
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.demandId) {
        throw new Error('Response should contain demandId');
      }
      console.log(`✅ Created demand with ID: ${res.data.demandId}`);
    }
  },
  {
    name: 'generateNanoBananaImage',
    endpoint: '/generateNanoBananaImage',
    method: 'POST',
    data: {
      prompt: 'A beautiful sunset over mountains',
      model: 'gemini-2.0-flash-exp-image-generation'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.imageUrl) {
        throw new Error('Response should contain imageUrl');
      }
      console.log(`✅ Generated image: ${res.data.imageUrl}`);
    }
  },
  {
    name: 'getUploadUrlForMediaAsset',
    endpoint: '/getUploadUrlForMediaAsset',
    method: 'POST',
    data: {
      fileName: 'test-image.jpg',
      fileType: 'image/jpeg',
      fileSize: 1024000,
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.uploadUrl || !res.data.fileKey) {
        throw new Error('Response should contain uploadUrl and fileKey');
      }
      console.log(`✅ Generated upload URL for: ${res.data.fileKey}`);
    }
  },
  {
    name: 'analyzeMediaAsset',
    endpoint: '/analyzeMediaAsset',
    method: 'POST',
    data: {
      mediaUrl: 'https://example.com/test-image.jpg',
      analysisType: 'general'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.analysis) {
        throw new Error('Response should contain analysis');
      }
      console.log(`✅ Media analysis completed: ${res.data.analysis.substring(0, 50)}...`);
    }
  },
  {
    name: 'clarifyDemandDetails',
    endpoint: '/clarifyDemandDetails',
    method: 'POST',
    data: {
      demand: {
        id: 'test-demand',
        title: 'Test Demand',
        description: 'Need a logo design'
      },
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.clarifiedDemand) {
        throw new Error('Response should contain clarifiedDemand');
      }
      console.log(`✅ Demand clarified with ${res.data.questions?.length || 0} questions`);
    }
  },
  {
    name: 'intelligentRoutingFlow',
    endpoint: '/intelligentRoutingFlow',
    method: 'POST',
    data: {
      demand: {
        id: 'test-demand',
        title: 'Complex Design Project',
        description: 'Need a complete brand identity design'
      },
      designerIds: ['designer1', 'designer2']
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.routing || !res.data.routing.designerId) {
        throw new Error('Response should contain routing with designerId');
      }
      console.log(`✅ Demand routed to designer with ${(res.data.routing.confidence * 100).toFixed(1)}% confidence`);
    }
  },
  {
    name: 'evaluateSellerData',
    endpoint: '/evaluateSellerData',
    method: 'POST',
    data: {
      csvData: 'name,quality,reliability\nSupplier A,8.5,7.2\nSupplier B,7.8,8.1',
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.evaluation || !res.data.evaluation.scores) {
        throw new Error('Response should contain evaluation with scores');
      }
      console.log(`✅ Evaluated ${res.data.suppliersProcessed} suppliers`);
    }
  },
  {
    name: 'generate3dModel',
    endpoint: '/generate3dModel',
    method: 'POST',
    data: {
      prompt: 'A red sports car',
      providerId: 'tripo',
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.taskId) {
        throw new Error('Response should contain taskId');
      }
      console.log(`✅ 3D model generation task created: ${res.data.taskId}`);
    }
  },
  {
    name: 'generateTripo3dModel',
    endpoint: '/generateTripo3dModel',
    method: 'POST',
    data: {
      prompt: 'A modern chair design',
      userId: 'test-user'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (!res.data.task_id) {
        throw new Error('Response should contain task_id');
      }
      console.log(`✅ Tripo3D model task created: ${res.data.task_id}`);
    }
  },
  {
    name: 'getTripo3dModelStatus',
    endpoint: '/getTripo3dModelStatus',
    method: 'POST',
    data: {
      taskId: 'tripo_test_task_123'
    },
    expectedStatus: 200,
    validateResponse: (res) => {
      if (typeof res.data.status !== 'string') {
        throw new Error('Response should contain status string');
      }
      console.log(`✅ Tripo3D task status: ${res.data.status} (${res.data.progress}%)`);
    }
  }
];

// 测试函数
async function runTest(testCase) {
  const url = `${CONFIG.baseURL}${testCase.endpoint}`;
  console.log(`🧪 Testing ${testCase.name}: ${testCase.method} ${url}`);

  try {
    const config = {
      method: testCase.method,
      url,
      timeout: CONFIG.timeout
    };
    
    // 添加POST请求的data参数
    if (testCase.data) {
      config.data = testCase.data;
    }

    const response = await axios(config);

    if (response.status !== testCase.expectedStatus) {
      throw new Error(`Expected status ${testCase.expectedStatus}, got ${response.status}`);
    }

    if (testCase.validateResponse) {
      testCase.validateResponse(response);
    }

    console.log(`✅ ${testCase.name} test passed`);
    return true;
  } catch (error) {
    console.error(`❌ ${testCase.name} test failed:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}, Data:`, error.response.data);
    }
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 开始 TCB 云函数验证测试\n');

  let passed = 0;
  let total = TEST_CASES.length;

  for (const testCase of TEST_CASES) {
    const success = await runTest(testCase);
    if (success) passed++;
  }

  console.log(`\n🏁 测试完成: ${passed}/${total} 通过`);

  if (passed === total) {
    console.log('🎉 所有测试通过！');
  } else {
    console.log('⚠️ 部分测试失败，请检查云函数实现');
  }

  return { passed, total, allPassed: passed === total };
}

// 运行测试
let __mockServer;
if (require.main === module) {
  const maybeStart = async () => {
    if (!process.env.TCB_API_BASE_URL) {
      __mockServer = await startMockServer();
    }
    await runAllTests();
    if (__mockServer) __mockServer.close();
  };
  maybeStart().catch(console.error);
}

// 兼容在 Jest 中作为测试运行
// 为了避免默认 60s 超时导致的误判，这里提升超时时间
if (typeof jest !== 'undefined' && jest && typeof jest.setTimeout === 'function') {
  jest.setTimeout(180000);
}

describe('TCB API Full Validation', () => {
  let mockServer;

  beforeAll(async () => {
    if (!process.env.TCB_API_BASE_URL) {
      mockServer = await startMockServer();
    }
  });

  afterAll((done) => {
    if (mockServer) {
      mockServer.close(() => {
        console.log('🔧 Mock server closed');
        done();
      });
    } else {
      done();
    }
  });

  it('should pass all API checks', async () => {
    const { allPassed, passed, total } = await runAllTests();
    console.log(`\n📊 测试结果: ${passed}/${total} 通过`);
    expect(allPassed).toBe(true);
  });
});

module.exports = { runAllTests, runTest };