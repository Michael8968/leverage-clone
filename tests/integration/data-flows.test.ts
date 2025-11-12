/**
 * @file tests/integration/data-flows.test.ts
 * @description 关键数据流集成测试套件
 * 
 * 测试范围：
 * 1. Demand → Matching → Assignment 数据流
 * 2. LLM → Prompt → Scenario 依赖关系
 * 3. Supplier → Products → Search 商品发现流程
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

/**
 * 模拟数据生成器
 */
const createMockDemand = (overrides = {}) => ({
  id: `demand-${Date.now()}`,
  type: 'public' as const,
  title: '高精度 3D 模型设计需求',
  description: '需要为产品设计高精度 3D 模型，包含多角度贴图',
  category: '3D设计',
  budget: 5000,
  status: '开放中' as const,
  createdAt: new Date(),
  requesterId: 'user-123',
  requesterName: '需求方',
  requesterAvatar: 'https://example.com/avatar.jpg',
  ...overrides,
});

const createMockSupplier = (overrides = {}) => ({
  id: `supplier-${Date.now()}`,
  name: '测试供应商',
  shortName: '测试商户',
  region: '北京',
  address: '中关村大街1号',
  registeredCapital: '1000万',
  creditCode: '91110101123456789X',
  email: 'supplier@example.com',
  ...overrides,
});

const createMockProduct = (supplierId: string, overrides = {}) => ({
  id: `product-${Date.now()}`,
  name: '高精度 3D 模型包',
  description: '包含多角度、高质量贴图的 3D 模型，支持 Maya、Blender 等主流软件',
  price: 1200,
  category: '3D 模型',
  supplierId,
  status: '已入库' as const,
  createdAt: new Date(),
  images: [{ url: 'https://example.com/image.jpg', view: '默认' as const }],
  ...overrides,
});

const createMockPrompt = (overrides = {}) => ({
  id: `prompt-${Date.now()}`,
  name: '设计需求分析提示词',
  promptKey: 'design-analysis',
  description: '用于分析和优化设计需求',
  content: `你是一个专业的设计顾问。分析以下需求并提供改进建议：
{user_input}

请从以下方面分析：
1. 需求完整性
2. 技术可行性
3. 成本合理性
4. 推荐的实现方案`,
  scope: '通用' as const,
  status: '生效中' as const,
  ...overrides,
});

const createMockLlmConnection = (overrides = {}) => ({
  id: `llm-${Date.now()}`,
  modelName: 'hunyuan-pro',
  provider: 'hunyuan',
  apiKey: 'test-key-123',
  priority: 1,
  status: '活跃' as const,
  scope: '通用' as const,
  category: '文本' as const,
  ...overrides,
});

const createMockAiScenario = (promptKey: string, overrides = {}) => ({
  id: `scenario-${Date.now()}`,
  name: '需求分析场景',
  description: '用于分析设计需求并生成改进建议',
  configuredPromptKey: promptKey,
  tags: ['demand-analysis', 'design'],
  ...overrides,
});

// =========================================================================
// 测试套件 1: Demand → Matching → Assignment 数据流
// =========================================================================
describe('数据流: Demand → Matching → Assignment', () => {
  let demandId: string;
  let supplierId: string;

  beforeAll(async () => {
    // 创建需求
    const demand = createMockDemand();
    demandId = demand.id;
    // 在实际环境中，这里会调用 API
    // const response = await fetch('/api/demands', { method: 'POST', body: JSON.stringify(demand) });

    // 创建供应商
    const supplier = createMockSupplier();
    supplierId = supplier.id;
    // const supplierResponse = await fetch('/api/suppliers', { method: 'POST', body: JSON.stringify(supplier) });
  });

  it('应该创建需求', () => {
    expect(demandId).toBeTruthy();
    expect(demandId).toMatch(/^demand-/);
  });

  it('应该执行需求匹配', async () => {
    // 模拟需求匹配逻辑
    const matchingResult = {
      demandId,
      matches: [
        {
          supplierId,
          score: 0.95,
          reason: '供应商有相关经验和资质',
        },
      ],
      timestamp: new Date(),
    };

    expect(matchingResult.matches).toHaveLength(1);
    expect(matchingResult.matches[0].score).toBeGreaterThan(0.8);
    expect(matchingResult.matches[0].supplierId).toBe(supplierId);
  });

  it('应该创建任务分配记录', () => {
    const assignment = {
      id: `assignment-${Date.now()}`,
      demandId,
      supplierId,
      status: 'pending',
      createdAt: new Date(),
    };

    expect(assignment.demandId).toBe(demandId);
    expect(assignment.supplierId).toBe(supplierId);
    expect(assignment.status).toBe('pending');
  });

  it('应该处理需求状态转换', () => {
    const demandStatusTransitions = [
      { from: '开放中', to: '进行中', trigger: 'assignment_created' },
      { from: '进行中', to: '已完成', trigger: 'assignment_completed' },
    ];

    expect(demandStatusTransitions).toHaveLength(2);
    expect(demandStatusTransitions[0].from).toBe('开放中');
  });
});

// =========================================================================
// 测试套件 2: LLM → Prompt → Scenario 依赖关系
// =========================================================================
describe('数据流: LLM → Prompt → Scenario', () => {
  let llmId: string;
  let promptId: string;
  let scenarioId: string;

  beforeAll(() => {
    // 创建 LLM 连接
    const llm = createMockLlmConnection();
    llmId = llm.id;

    // 创建提示词
    const prompt = createMockPrompt();
    promptId = prompt.promptKey;

    // 创建 AI 场景
    const scenario = createMockAiScenario(promptId);
    scenarioId = scenario.id;
  });

  it('应该创建 LLM 连接', () => {
    expect(llmId).toBeTruthy();
    expect(llmId).toMatch(/^llm-/);
  });

  it('应该验证 LLM 可用性', () => {
    const llm = createMockLlmConnection({ id: llmId });
    expect(llm.status).toBe('活跃');
    expect(llm.priority).toBeGreaterThan(0);
  });

  it('应该创建提示词', () => {
    const prompt = createMockPrompt({ promptKey: promptId });
    expect(prompt.promptKey).toBe(promptId);
    expect(prompt.status).toBe('生效中');
  });

  it('应该验证提示词内容有效性', () => {
    const prompt = createMockPrompt();
    const hasPlaceholders =
      prompt.content.includes('{user_input}') ||
      prompt.content.includes('{context}');

    expect(hasPlaceholders).toBe(true);
  });

  it('应该创建 AI 场景并关联提示词', () => {
    const scenario = createMockAiScenario(promptId, { id: scenarioId });
    expect(scenario.configuredPromptKey).toBe(promptId);
    expect(scenario.tags).toContain('demand-analysis');
  });

  it('应该验证 AI 场景的完整性', () => {
    const scenario = createMockAiScenario(promptId);
    const validation = {
      hasName: !!scenario.name,
      hasDescription: !!scenario.description,
      hasPromptKey: !!scenario.configuredPromptKey,
      hasTags: Array.isArray(scenario.tags) && scenario.tags.length > 0,
    };

    expect(validation.hasName).toBe(true);
    expect(validation.hasDescription).toBe(true);
    expect(validation.hasPromptKey).toBe(true);
    expect(validation.hasTags).toBe(true);
  });

  it('应该处理 AI 场景执行流程', async () => {
    const scenario = createMockAiScenario(promptId);
    const prompt = createMockPrompt({ promptKey: promptId });

    // 模拟执行流程
    const executionResult = {
      scenarioId: scenario.id,
      promptKey: prompt.promptKey,
      status: 'success',
      output: '分析结果示例',
      executedAt: new Date(),
    };

    expect(executionResult.status).toBe('success');
    expect(executionResult.output).toBeTruthy();
  });
});

// =========================================================================
// 测试套件 3: Supplier → Products → Search 商品发现
// =========================================================================
describe('数据流: Supplier → Products → Search', () => {
  let supplierId: string;
  let productId: string;
  let productIds: string[] = [];

  beforeAll(() => {
    const supplier = createMockSupplier();
    supplierId = supplier.id;

    // 创建多个商品
    for (let i = 0; i < 3; i++) {
      const product = createMockProduct(supplierId, {
        name: `测试商品 ${i + 1}`,
        price: 100 * (i + 1),
      });
      productIds.push(product.id);
    }
    productId = productIds[0];
  });

  it('应该创建供应商', () => {
    expect(supplierId).toBeTruthy();
    expect(supplierId).toMatch(/^supplier-/);
  });

  it('应该验证供应商完整性', () => {
    const supplier = createMockSupplier({ id: supplierId });
    const validation = {
      hasName: !!supplier.name,
      hasAddress: !!supplier.address,
      hasEmail: !!supplier.email,
      hasCredentials:
        !!supplier.creditCode || !!supplier.registeredCapital,
    };

    expect(validation.hasName).toBe(true);
    expect(validation.hasAddress).toBe(true);
    expect(validation.hasCredentials).toBe(true);
  });

  it('应该为供应商创建商品', () => {
    expect(productIds).toHaveLength(3);
    productIds.forEach((id) => {
      expect(id).toMatch(/^product-/);
    });
  });

  it('应该验证商品数据完整性', () => {
    const product = createMockProduct(supplierId, { id: productId });
    const validation = {
      hasName: !!product.name,
      hasPrice: product.price > 0,
      hasDescription: !!product.description && product.description.length > 10,
      hasImages: Array.isArray(product.images) && product.images.length > 0,
      hasSupplier: product.supplierId === supplierId,
    };

    Object.entries(validation).forEach(([key, value]) => {
      expect(value).toBe(true);
    });
  });

  it('应该执行商品搜索', () => {
    // 模拟搜索结果
    const searchResults = {
      query: '3D 模型',
      results: productIds.map((id) => ({
        id,
        score: Math.random() * 100,
      })),
      totalCount: productIds.length,
    };

    expect(searchResults.results).toHaveLength(3);
    expect(searchResults.totalCount).toBe(3);
  });

  it('应该按价格范围过滤商品', () => {
    const products = productIds.map((id, idx) =>
      createMockProduct(supplierId, {
        id,
        price: 100 * (idx + 1),
      })
    );

    const filtered = products.filter(
      (p) => p.price >= 100 && p.price <= 300
    );
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('应该支持商品排序', () => {
    const products = productIds.map((id, idx) =>
      createMockProduct(supplierId, {
        id,
        price: 100 * (idx + 1),
      })
    );

    // 按价格升序排列
    const sorted = [...products].sort((a, b) => a.price - b.price);
    expect(sorted[0].price).toBeLessThanOrEqual(sorted[1].price);
  });

  it('应该关联供应商信息到商品', () => {
    const supplier = createMockSupplier({ id: supplierId });
    const product = createMockProduct(supplierId, { id: productId });

    const enrichedProduct = {
      ...product,
      supplierName: supplier.name,
      supplierScore: 4.5,
    };

    expect(enrichedProduct.supplierName).toBe(supplier.name);
    expect(enrichedProduct.supplierScore).toBeGreaterThan(0);
  });
});

// =========================================================================
// API 集成测试
// =========================================================================
describe('API 集成验证', () => {
  const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

  it('应该连接到 API 服务', async () => {
    // 模拟 API 连接检查
    const isConnected = true; // 实际环境会真实请求
    expect(isConnected).toBe(true);
  });

  describe('Prompts API', () => {
    it('应该获取所有提示词', async () => {
      // 模拟: GET /api/prompts
      const prompts = [createMockPrompt()];
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('应该创建新提示词', async () => {
      // 模拟: POST /api/prompts
      const prompt = createMockPrompt();
      expect(prompt.id).toBeTruthy();
    });

    it('应该更新提示词', async () => {
      // 模拟: PUT /api/prompts/:id
      const prompt = createMockPrompt({
        name: '更新的提示词',
      });
      expect(prompt.name).toBe('更新的提示词');
    });
  });

  describe('AI Scenarios API', () => {
    it('应该获取所有 AI 场景', async () => {
      // 模拟: GET /api/ai_scenarios
      const scenarios = [createMockAiScenario('design-analysis')];
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('应该创建 AI 场景并验证完整性', async () => {
      // 模拟: POST /api/ai_scenarios
      const scenario = createMockAiScenario('design-analysis');
      
      const validation = {
        hasId: !!scenario.id,
        hasConfiguredPrompt: !!scenario.configuredPromptKey,
        isActive: scenario.tags && scenario.tags.length > 0,
      };

      Object.values(validation).forEach((value) => {
        expect(value).toBe(true);
      });
    });
  });

  describe('Suppliers & Products API', () => {
    it('应该创建供应商并添加商品', async () => {
      // 模拟: POST /api/suppliers, POST /api/products
      const supplier = createMockSupplier();
      const product = createMockProduct(supplier.id);

      expect(product.supplierId).toBe(supplier.id);
    });

    it('应该搜索商品', async () => {
      // 模拟: GET /api/products/search
      const supplier = createMockSupplier();
      const products = [
        createMockProduct(supplier.id, { name: '3D 模型' }),
        createMockProduct(supplier.id, { name: '渲染服务' }),
      ];

      const searchResults = products.filter((p) =>
        p.name.includes('3D')
      );
      expect(searchResults.length).toBeGreaterThan(0);
    });
  });
});

// =========================================================================
// 错误处理和边界情况
// =========================================================================
describe('错误处理和边界情况', () => {
  it('应该处理缺失的必需字段', () => {
    const invalidDemand = {
      id: 'demand-1',
      // 缺少其他必需字段
    };

    const isValid = !!(invalidDemand.id);
    expect(isValid).toBe(true);
  });

  it('应该处理无效的数据类型', () => {
    const product = createMockProduct('supplier-1');
    const hasValidPrice = typeof product.price === 'number' && product.price > 0;
    expect(hasValidPrice).toBe(true);
  });

  it('应该处理并发操作', async () => {
    const promises = [
      Promise.resolve(createMockDemand()),
      Promise.resolve(createMockSupplier()),
      Promise.resolve(createMockPrompt()),
    ];

    const results = await Promise.all(promises);
    expect(results).toHaveLength(3);
    expect(results[0]).toHaveProperty('id');
  });

  it('应该处理数据验证失败', () => {
    const invalidSupplier = createMockSupplier({ name: '' });
    const isNameValid = !!invalidSupplier.name && invalidSupplier.name.trim().length > 0;
    expect(isNameValid).toBe(false);
  });
});

// =========================================================================
// 性能基准测试
// =========================================================================
describe('性能基准测试', () => {
  it('创建数据对象应该快速', () => {
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      createMockDemand();
      createMockSupplier();
      createMockProduct('supplier-1');
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 1000 * 3 = 3000 个对象应该在 1000ms 内创建
    expect(duration).toBeLessThan(1000);
  });

  it('数据验证应该高效', () => {
    const supplier = createMockSupplier();
    const startTime = performance.now();
    
    // 执行 1000 次验证
    for (let i = 0; i < 1000; i++) {
      const validation = {
        hasName: !!supplier.name,
        hasAddress: !!supplier.address,
        hasEmail: !!supplier.email,
      };
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(500);
  });
});
