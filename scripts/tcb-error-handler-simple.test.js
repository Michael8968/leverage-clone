/**
 * TCB简化错误处理模块测试用例
 * 验证符合用户示例的错误处理逻辑
 */

const { handleTCBError, TCBErrorHandler } = require('./tcb-error-handler-simple');

describe('TCBErrorHandler Simple', () => {
  describe('handleTCBError 函数测试', () => {
    test('DATABASE_COLLECTION_NOT_EXIST 错误处理', () => {
      const error = new Error('Collection does not exist');
      error.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('数据加载中，请稍后重试~');
      expect(result.action).toEqual({ type: 'redirect', to: '/dashboard' });
    });

    test('AUTH_PERMISSION_ERR 错误处理', () => {
      const error = new Error('Permission denied');
      error.code = 'AUTH_PERMISSION_ERR';

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('登录状态小调整，请重新登录。');
      expect(result.action).toEqual({ type: 'redirect', to: '/login' });
    });

    test('NETWORK_ERROR 错误处理', () => {
      const error = new Error('Network error');
      error.code = 'NETWORK_ERROR';

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('网络连接不太稳定，请稍后重试。');
      expect(result.action).toEqual({ type: 'retry' });
    });

    test('INTERNAL_ERROR 错误处理', () => {
      const error = new Error('Internal server error');
      error.code = 'INTERNAL_ERROR';

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('服务暂时不可用，请稍后重试。');
      expect(result.action).toEqual({ type: 'retry' });
    });

    test('未知错误使用默认处理', () => {
      const error = new Error('Unknown error');
      error.code = 'UNKNOWN_ERROR';

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('出现技术问题，请联系开发人员。');
      expect(result.action).toEqual({ type: 'retry' });
    });

    test('没有错误码的错误使用默认处理', () => {
      const error = new Error('Generic error without code');

      const result = handleTCBError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('出现技术问题，请联系开发人员。');
      expect(result.action).toEqual({ type: 'retry' });
    });
  });

  describe('TCBErrorHandler 类测试', () => {
    let handler;

    beforeEach(() => {
      handler = new TCBErrorHandler();
    });

    test('handleError 方法返回正确格式', () => {
      const error = new Error('Test');
      error.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const result = handler.handleError(error);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('action');
      expect(result.action).toHaveProperty('type');
    });

    test('createErrorResponse 创建HTTP响应', () => {
      const error = new Error('Test error');
      error.code = 'AUTH_PERMISSION_ERR';

      const response = handler.createErrorResponse(error);

      expect(response.statusCode).toBe(500);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('登录状态小调整，请重新登录。');
      expect(body.action.type).toBe('redirect');
      expect(body.action.to).toBe('/login');
    });
  });

  describe('实际使用场景测试', () => {
    test('模拟数据库操作错误处理', () => {
      // 模拟数据库操作失败
      const mockError = new Error('Collection not found');
      mockError.code = 'DATABASE_COLLECTION_NOT_EXIST';

      // 使用便捷函数处理
      const result = handleTCBError(mockError);

      expect(result.success).toBe(false);
      expect(result.message).toBe('数据加载中，请稍后重试~');
      expect(result.action.type).toBe('redirect');
      expect(result.action.to).toBe('/dashboard');
    });

    test('模拟认证错误处理', () => {
      // 模拟认证失败
      const mockError = new Error('Authentication failed');
      mockError.code = 'AUTH_PERMISSION_ERR';

      const result = handleTCBError(mockError);

      expect(result.success).toBe(false);
      expect(result.message).toBe('登录状态小调整，请重新登录。');
      expect(result.action.type).toBe('redirect');
      expect(result.action.to).toBe('/login');
    });
  });

  describe('与用户示例完全一致的测试', () => {
    test('完全按照用户示例的逻辑', () => {
      // 模拟用户示例中的使用方式
      function testErrorHandling(error) {
        let friendlyMsg = '出现技术问题，请联系开发人员。';
        let action = { type: 'retry' };

        if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
          friendlyMsg = '数据加载中，请稍后重试~';
          action = { type: 'redirect', to: '/dashboard' };
        } else if (error.code === 'AUTH_PERMISSION_ERR') {
          friendlyMsg = '登录状态小调整，请重新登录。';
          action = { type: 'redirect', to: '/login' };
        }

        return { success: false, message: friendlyMsg, action };
      }

      // 测试与我们的实现是否一致
      const error1 = { code: 'DATABASE_COLLECTION_NOT_EXIST' };
      const error2 = { code: 'AUTH_PERMISSION_ERR' };
      const error3 = { code: 'UNKNOWN_ERROR' };

      expect(handleTCBError(error1)).toEqual(testErrorHandling(error1));
      expect(handleTCBError(error2)).toEqual(testErrorHandling(error2));
      expect(handleTCBError(error3).message).toBe('出现技术问题，请联系开发人员。');
    });
  });
});