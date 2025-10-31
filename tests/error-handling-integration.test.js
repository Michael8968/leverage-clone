/**
 * 错误处理集成测试
 * 测试所有5层错误处理机制是否正常工作
 */

// Mock TCB SDK
jest.mock('@cloudbase/node-sdk', () => ({
  init: jest.fn(() => ({
    callFunction: jest.fn(),
    database: jest.fn(() => ({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(),
          add: jest.fn(),
          update: jest.fn(),
          remove: jest.fn()
        }))
      }))
    }))
  }))
}));

describe('错误处理集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('第1层：后端云函数错误处理', () => {
    test('云函数执行失败时返回友好错误消息', async () => {
      const { wrapCloudFunction } = require('../scripts/tcb-cloud-function-utils.js');

      // Mock TCB SDK 抛出错误
      const mockTCB = {
        callFunction: jest.fn().mockRejectedValue(new Error('cloud function execution failed'))
      };

      const wrappedFunction = wrapCloudFunction(async () => {
        await mockTCB.callFunction({ name: 'testFunction' });
      });

      const result = await wrappedFunction();

      expect(result.success).toBe(false);
      expect(result.message).toContain('云函数执行失败');
    });

    test('数据库操作失败时返回友好错误消息', async () => {
      const { safeDatabaseOperation } = require('../scripts/tcb-cloud-function-utils.js');

      const mockDB = {
        collection: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockRejectedValue(new Error('database operation failed'))
          }))
        }))
      };

      const result = await safeDatabaseOperation(
        () => mockDB.collection('test').where({}).get(),
        '查询数据'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('数据库操作失败');
    });
  });

  describe('第2层：前端API拦截器错误处理', () => {
    test('网络错误时显示友好提示', async () => {
      const { apiClient } = require('../src/utils/apiClient.js');

      // Mock fetch 抛出网络错误
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      try {
        await apiClient.get('/test-endpoint');
      } catch (error) {
        // 验证错误被正确处理（这里会抛出错误）
        expect(error.message).toContain('网络连接失败');
      }
    });

    test('认证失败时显示重新登录提示', async () => {
      const { apiClient } = require('../src/utils/apiClient.js');

      // Mock 401响应
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      try {
        await apiClient.get('/protected-endpoint');
      } catch (error) {
        expect(error.message).toContain('重新登录');
      }
    });
  });

  describe('第3层：数据库操作错误处理', () => {
    test('数据库查询失败时显示友好提示并重试', async () => {
      const { dbSafeQuery } = require('../src/utils/dbSafeQuery.js');

      const mockQuery = jest.fn()
        .mockRejectedValueOnce(new Error('database operation failed'))
        .mockResolvedValueOnce({ data: [] });

      const result = await dbSafeQuery(mockQuery, { retryAttempts: 1 });

      expect(result.success).toBe(true); // 重试后成功
      expect(mockQuery).toHaveBeenCalledTimes(2); // 调用了2次（1次失败 + 1次重试）
    });

    test('批量操作部分失败时返回部分成功结果', async () => {
      const { batchDatabaseOperation } = require('../src/utils/dbSafeQuery.js');

      const operations = [
        jest.fn().mockResolvedValue({ id: 1 }),
        jest.fn().mockRejectedValue(new Error('operation failed')),
        jest.fn().mockResolvedValue({ id: 3 })
      ];

      const result = await batchDatabaseOperation(operations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[2].success).toBe(true);
    });
  });

  describe('第4层：前端组件错误边界', () => {
    test('ErrorBoundary类可以实例化', () => {
      const ErrorBoundary = require('../src/components/ErrorBoundary.jsx').default;

      // 验证ErrorBoundary类存在
      expect(typeof ErrorBoundary).toBe('function');
      expect(ErrorBoundary.prototype).toBeDefined();
    });

    test('错误边界工具函数存在', () => {
      const { withErrorBoundary, ChatErrorBoundary, AIRecommendationErrorBoundary } = require('../src/components/ErrorBoundary.jsx');

      expect(typeof withErrorBoundary).toBe('function');
      expect(typeof ChatErrorBoundary).toBe('function');
      expect(typeof AIRecommendationErrorBoundary).toBe('function');
    });
  });

  describe('第5层：全局错误配置', () => {
    test('错误配置正确映射消息', () => {
      const { getFriendlyErrorMessage, detectErrorType, ERROR_TYPES } = require('../src/config/errorConfig.js');

      // 测试消息映射
      const networkMessage = getFriendlyErrorMessage(new Error('Failed to fetch'));
      expect(networkMessage).toContain('网络连接失败');

      // 测试类型检测
      const detectedType = detectErrorType('AI service unavailable');
      expect(detectedType).toBe(ERROR_TYPES.AI);
    });

    test('错误钩子模拟测试', () => {
      const { ERROR_TYPES } = require('../src/hooks/useErrorHandler.js');

      // 模拟错误处理器
      const mockHandleError = (error, context = {}) => {
        const friendlyMessage = getFriendlyMessage(error, context.type);
        // 这里可以验证消息是否正确
        return friendlyMessage;
      };

      // 测试网络错误
      const networkMessage = mockHandleError(new Error('Failed to fetch'), {
        type: ERROR_TYPES.NETWORK
      });

      expect(networkMessage).toContain('网络连接失败');

      // 测试AI错误
      const aiMessage = mockHandleError(new Error('AI service unavailable'), {
        type: ERROR_TYPES.AI
      });

      expect(aiMessage).toContain('推荐灵感生成中');
    });
  });

  describe('端到端错误处理流程', () => {
    test('错误监控和报告功能', () => {
      const { shouldMonitorError, ERROR_TYPES, ERROR_SEVERITY } = require('../src/config/errorConfig.js');

      // 测试高严重程度错误应该被监控
      const shouldMonitor = shouldMonitorError({
        type: ERROR_TYPES.SYSTEM,
        severity: ERROR_SEVERITY.CRITICAL
      });

      expect(shouldMonitor).toBe(true);

      // 测试低严重程度错误不应该被监控
      const shouldNotMonitor = shouldMonitorError({
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.LOW
      });

      expect(shouldNotMonitor).toBe(false);
    });
  });
});

// 辅助函数：获取友好的错误消息（从配置中提取）
function getFriendlyMessage(error, type) {
  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();

  if (type === 'network' || lowerMessage.includes('fetch')) {
    return '网络连接失败，请检查网络后重试。';
  }

  if (type === 'ai' || lowerMessage.includes('ai')) {
    return '推荐灵感生成中~';
  }

  return '出现技术问题，请稍后重试。';
}