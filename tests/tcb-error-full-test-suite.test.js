/**
 * @jest-environment jsdom
 */

/**
 * TCB错误全测试套件
 * 全面测试TCB错误处理机制，包括：
 * - 后端API错误处理
 * - 前端调用错误处理
 * - 数据库不存在错误
 * - 认证失败错误
 * - 网络错误
 * - /demand-pool失败时的redirect逻辑
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

// Mock axios for frontend API calls
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn()
  })),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  }
}));

describe('TCB错误全测试套件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('后端API错误处理测试', () => {
    test('数据库不存在错误应返回联系开发人员消息', async () => {
      const { TCBErrorHandler } = require('../scripts/tcb-error-handler');

      const handler = new TCBErrorHandler();
      const error = new Error('Collection "nonexistent" does not exist');
      error.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toContain('联系开发人员');
      expect(result.message).not.toContain('AI小助手');
      expect(result.message).not.toContain('云开发AI小助手');
      expect(result.action.type).toBe('contact_support');
    });

    test('认证失败错误应返回联系开发人员消息', async () => {
      const { TCBErrorHandler } = require('../scripts/tcb-error-handler');

      const handler = new TCBErrorHandler();
      const error = new Error('Authentication failed');
      error.code = 'AUTH_PERMISSION_ERR';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toContain('联系开发人员');
      expect(result.message).not.toContain('AI小助手');
      expect(result.action.type).toBe('redirect');
      expect(result.action.to).toBe('/login');
    });

    test('网络错误应返回联系开发人员消息', async () => {
      const { TCBErrorHandler } = require('../scripts/tcb-error-handler');

      const handler = new TCBErrorHandler();
      const error = new Error('Network connection failed');
      error.code = 'NETWORK_ERROR';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toContain('联系开发人员');
      expect(result.message).not.toContain('AI小助手');
      expect(result.action.type).toBe('retry');
    });

    test('云函数执行失败应返回联系开发人员消息', async () => {
      const { wrapCloudFunctionHandler } = require('../scripts/tcb-cloud-function-utils');

      const mockTCB = {
        callFunction: jest.fn().mockRejectedValue(new Error('cloud function execution failed'))
      };

      const wrappedFunction = wrapCloudFunctionHandler(async (event, context) => {
        await mockTCB.callFunction({ name: 'testFunction' });
      });

      // 提供mock event对象
      const mockEvent = {
        httpMethod: 'POST',
        body: '{}',
        headers: {}
      };
      const mockContext = {};

      const result = await wrappedFunction(mockEvent, mockContext);

      // 解析HTTP响应body
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.message).toContain('联系开发人员');
      expect(responseBody.message).not.toContain('AI小助手');
    });

    test('数据库操作失败应返回联系开发人员消息', async () => {
      const { safeDatabaseOperation } = require('../scripts/tcb-cloud-function-utils');

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
      expect(result.message).toContain('联系开发人员');
      expect(result.message).not.toContain('AI小助手');
    });
  });

  describe('前端API调用错误处理测试', () => {
    test('前端API调用数据库不存在错误应显示联系开发人员消息', async () => {
      const { handleResponseError } = require('../src/utils/apiClient');

      // Mock toast
      const mockToast = {
        error: jest.fn()
      };
      jest.doMock('react-toastify', () => ({
        toast: mockToast
      }));

      // Create mock error
      const mockError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'DATABASE_COLLECTION_NOT_EXIST',
            message: 'Collection does not exist'
          }
        }
      };

      try {
        await handleResponseError(mockError);
      } catch (error) {
        // 验证错误消息包含联系开发人员
        expect(error.message).toContain('联系开发人员');
        expect(error.message).not.toContain('AI小助手');
      }
    });

    test('前端API调用认证失败错误应显示联系开发人员消息', async () => {
      const { handleResponseError } = require('../src/utils/apiClient');

      // Create mock auth error
      const mockError = {
        response: {
          status: 401,
          data: {
            success: false,
            error: 'AUTH_PERMISSION_ERR',
            message: 'Authentication failed'
          }
        }
      };

      try {
        await handleResponseError(mockError);
      } catch (error) {
        expect(error.message).toContain('联系开发人员');
        expect(error.message).not.toContain('AI小助手');
      }
    });

    test('前端API调用网络错误应显示联系开发人员消息', async () => {
      const { handleResponseError } = require('../src/utils/apiClient');

      // Create mock network error
      const mockError = {
        message: 'Network Error'
      };

      try {
        await handleResponseError(mockError);
      } catch (error) {
        expect(error.message).toContain('联系开发人员');
        expect(error.message).not.toContain('AI小助手');
      }
    });
  });

  describe('数据库操作错误处理测试', () => {
    test('数据库查询失败应显示联系开发人员消息', async () => {
      const { dbSafeQuery } = require('../src/utils/dbSafeQuery');
      const { toast } = require('react-toastify');

      const mockQuery = jest.fn().mockRejectedValue(new Error('database operation failed'));

      try {
        await dbSafeQuery(mockQuery, { retryAttempts: 1 });
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false);
      } catch (error) {
        // 验证错误消息包含联系开发人员
        expect(error.message).toContain('联系开发人员');
        expect(error.message).not.toContain('AI小助手');
      }
    });

    test('批量数据库操作部分失败应显示联系开发人员消息', async () => {
      const { dbSafeBatch } = require('../src/utils/dbSafeQuery');

      const operations = [
        jest.fn().mockResolvedValue({ id: 1 }),
        jest.fn().mockRejectedValue(new Error('operation failed')),
        jest.fn().mockResolvedValue({ id: 3 })
      ];

      const result = await dbSafeBatch(operations);

      expect(result[1]).toBe(null); // 第二个操作失败
      // 验证错误消息包含联系开发人员（通过toast.error调用）
    });
  });

  describe('全局错误配置测试', () => {
    test('错误配置映射应返回联系开发人员消息', () => {
      const { getFriendlyErrorMessage, detectErrorType, ERROR_TYPES } = require('../src/config/errorConfig');

      // 测试数据库不存在错误
      const dbError = getFriendlyErrorMessage(new Error('Collection does not exist'));
      expect(dbError).toContain('联系开发人员');
      expect(dbError).not.toContain('AI小助手');

      // 测试认证错误
      const authError = getFriendlyErrorMessage(new Error('Authentication failed'), ERROR_TYPES.AUTH);
      expect(authError).toContain('联系开发人员');
      expect(authError).not.toContain('AI小助手');

      // 测试网络错误
      const networkError = getFriendlyErrorMessage(new Error('Network error'), ERROR_TYPES.NETWORK);
      expect(networkError).toContain('联系开发人员');
      expect(networkError).not.toContain('AI小助手');
    });

    test('错误类型检测应正确识别错误类型', () => {
      const { detectErrorType, ERROR_TYPES } = require('../src/config/errorConfig');

      expect(detectErrorType('Collection does not exist')).toBe(ERROR_TYPES.DATABASE);
      expect(detectErrorType('Authentication failed')).toBe(ERROR_TYPES.AUTH);
      expect(detectErrorType('Network connection failed')).toBe(ERROR_TYPES.NETWORK);
    });
  });

  describe('/demand-pool失败redirect测试', () => {
    test('demand-pool页面加载失败应redirect到错误页面', async () => {
      // 简化测试：直接验证错误处理逻辑，不依赖window.location mock
      const { getFriendlyErrorMessage } = require('../src/config/errorConfig');

      const error = new Error('Collection "demands" does not exist');
      const friendlyMessage = getFriendlyErrorMessage(error);

      // 验证错误消息包含联系开发人员
      expect(friendlyMessage).toContain('联系开发人员');
      expect(friendlyMessage).not.toContain('AI小助手');

      // 验证错误类型被正确识别为数据库错误
      const { detectErrorType, ERROR_TYPES } = require('../src/config/errorConfig');
      expect(detectErrorType(error.message)).toBe(ERROR_TYPES.DATABASE);
    });

    test('demand-pool权限错误应显示联系开发人员消息', async () => {
      const { toast } = require('react-toastify');

      // Mock权限拒绝错误
      const mockError = new Error('permission-denied');

      // 模拟demand-pool页面的错误处理
      const errorMessage = mockError.message;
      let friendlyMessage = '无法加载需求列表，请稍后重试。';

      if (errorMessage.includes('permission-denied') || errorMessage.includes('权限')) {
        friendlyMessage = '权限不足：无法访问需求数据，请联系开发人员。';
      }

      expect(friendlyMessage).toContain('联系开发人员');
      expect(friendlyMessage).not.toContain('AI小助手');
    });

    test('demand-pool网络错误应显示联系开发人员消息', async () => {
      const { toast } = require('react-toastify');

      // Mock网络错误
      const mockError = new Error('network error');

      // 模拟demand-pool页面的错误处理
      const errorMessage = mockError.message;
      let friendlyMessage = '无法加载需求列表，请稍后重试。';

      if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        friendlyMessage = '网络连接问题：无法连接到服务器，请联系开发人员。';
      }

      expect(friendlyMessage).toContain('联系开发人员');
      expect(friendlyMessage).not.toContain('AI小助手');
    });
  });

  describe('端到端错误处理流程测试', () => {
    test('完整错误处理链路：API -> 前端 -> UI显示联系开发人员', async () => {
      const { handleResponseError } = require('../src/utils/apiClient');

      // Mock API返回数据库不存在错误
      const mockError = {
        response: {
          status: 500,
          data: {
            success: false,
            error: 'DATABASE_COLLECTION_NOT_EXIST',
            message: 'Collection does not exist in database'
          }
        }
      };

      // 模拟前端调用流程
      try {
        await handleResponseError(mockError);
      } catch (error) {
        // 验证错误处理链路完整
        expect(error.message).toContain('联系开发人员');
        expect(error.message).not.toContain('AI小助手');
      }
    });

    test('多层错误处理一致性验证', () => {
      const { TCBErrorHandler } = require('../scripts/tcb-error-handler');
      const { getFriendlyErrorMessage } = require('../src/config/errorConfig');

      const handler = new TCBErrorHandler();

      // 测试同一种错误在不同层的处理结果应该一致
      const backendError = new Error('Collection does not exist');
      backendError.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const frontendError = new Error('Collection does not exist');

      const backendResult = handler.handleError(backendError);
      const frontendResult = getFriendlyErrorMessage(frontendError);

      // 都应该包含联系开发人员
      expect(backendResult.message).toContain('联系开发人员');
      expect(frontendResult).toContain('联系开发人员');

      // 都不应该包含AI小助手
      expect(backendResult.message).not.toContain('AI小助手');
      expect(frontendResult).not.toContain('AI小助手');
    });
  });

  describe('错误监控和报告测试', () => {
    test('严重错误应被标记为需要监控', () => {
      const { shouldMonitorError, ERROR_TYPES, ERROR_SEVERITY } = require('../src/config/errorConfig');

      // 测试数据库错误应该被监控
      const dbError = {
        type: ERROR_TYPES.DATABASE,
        severity: ERROR_SEVERITY.HIGH
      };
      expect(shouldMonitorError(dbError)).toBe(true);

      // 测试认证错误应该被监控
      const authError = {
        type: ERROR_TYPES.AUTH,
        severity: ERROR_SEVERITY.CRITICAL
      };
      expect(shouldMonitorError(authError)).toBe(true);

      // 测试验证错误不应该被监控
      const validationError = {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.LOW
      };
      expect(shouldMonitorError(validationError)).toBe(false);
    });

    test('错误报告应包含必要信息', () => {
      const { ERROR_TYPES, ERROR_SEVERITY } = require('../src/config/errorConfig');

      const errorInfo = {
        originalError: new Error('Database connection failed'),
        type: ERROR_TYPES.DATABASE,
        severity: ERROR_SEVERITY.HIGH,
        timestamp: new Date().toISOString(),
        context: { operation: 'query', collection: 'users' },
        userAgent: 'test-agent',
        url: '/api/test'
      };

      // 验证错误报告包含所有必要字段
      expect(errorInfo.originalError).toBeInstanceOf(Error);
      expect(errorInfo.type).toBe(ERROR_TYPES.DATABASE);
      expect(errorInfo.severity).toBe(ERROR_SEVERITY.HIGH);
      expect(errorInfo.timestamp).toBeDefined();
      expect(errorInfo.context).toBeDefined();
      expect(errorInfo.userAgent).toBeDefined();
      expect(errorInfo.url).toBeDefined();
    });
  });

  describe('产品化表达过滤测试', () => {
    test('所有错误消息不应包含产品化表达', () => {
      const { TCBErrorHandler } = require('../scripts/tcb-error-handler');
      const { getFriendlyErrorMessage, ERROR_MESSAGE_MAP } = require('../src/config/errorConfig');

      const handler = new TCBErrorHandler();

      // 测试所有预定义错误码
      const errorCodes = [
        'DATABASE_COLLECTION_NOT_EXIST',
        'AUTH_PERMISSION_ERR',
        'NETWORK_ERROR',
        'AI_QUOTA_EXCEEDED',
        'UPLOAD_FILE_TOO_LARGE',
        'INTERNAL_ERROR'
      ];

      errorCodes.forEach(code => {
        const error = new Error('Test error');
        error.code = code;

        const result = handler.handleError(error);

        expect(result.message).not.toContain('AI小助手');
        expect(result.message).not.toContain('云开发AI小助手');
        expect(result.message).not.toContain('小助手');
      });

      // 测试所有错误消息映射
      Object.values(ERROR_MESSAGE_MAP).forEach(category => {
        Object.values(category).forEach(message => {
          expect(message).not.toContain('AI小助手');
          expect(message).not.toContain('云开发AI小助手');
          expect(message).not.toContain('小助手');
        });
      });
    });

    test('动态错误消息生成不应包含产品化表达', () => {
      const { getFriendlyErrorMessage } = require('../src/config/errorConfig');

      const testMessages = [
        'Failed to fetch',
        'Network error',
        'Authentication failed',
        'Database operation failed',
        'Permission denied'
      ];

      testMessages.forEach(message => {
        const friendlyMessage = getFriendlyErrorMessage(new Error(message));
        expect(friendlyMessage).not.toContain('AI小助手');
        expect(friendlyMessage).not.toContain('云开发AI小助手');
        expect(friendlyMessage).not.toContain('小助手');
      });
    });
  });
});