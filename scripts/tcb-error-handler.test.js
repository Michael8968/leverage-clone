/**
 * TCB错误处理模块测试用例
 * 测试各种错误场景的友好提示转换
 */

const { TCBErrorHandler } = require('./tcb-error-handler');

describe('TCBErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new TCBErrorHandler();
  });

  describe('错误码映射测试', () => {
    test('DATABASE_COLLECTION_NOT_EXIST 错误映射', () => {
      const error = new Error('Collection does not exist');
      error.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('数据服务暂时不可用，请稍后再试哦~');
      expect(result.action.type).toBe('retry');
      expect(result.action.delay).toBe(2000);
    });

    test('AUTH_PERMISSION_ERR 错误映射', () => {
      const error = new Error('Permission denied');
      error.code = 'AUTH_PERMISSION_ERR';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('登录状态已过期，请重新登录哦~');
      expect(result.action.type).toBe('redirect');
      expect(result.action.to).toBe('/login');
    });

    test('NETWORK_ERROR 错误映射', () => {
      const error = new Error('Network connection failed');
      error.code = 'NETWORK_ERROR';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('网络连接不太稳定，请检查网络后重试~');
      expect(result.action.type).toBe('retry');
      expect(result.action.delay).toBe(3000);
    });

    test('AI_QUOTA_EXCEEDED 错误映射', () => {
      const error = new Error('AI quota exceeded');
      error.code = 'AI_QUOTA_EXCEEDED';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('AI使用额度已用完，请升级会员享受更多服务~');
      expect(result.action.type).toBe('redirect');
      expect(result.action.to).toBe('/pricing');
    });
  });

  describe('错误消息关键词提取测试', () => {
    test('从消息中提取数据库集合不存在错误', () => {
      const error = new Error('The collection "users" does not exist in the database');

      const result = handler.handleError(error);

      expect(result.error).toBe('DATABASE_COLLECTION_NOT_EXIST');
      expect(result.message).toBe('数据服务暂时不可用，请稍后再试哦~');
    });

    test('从消息中提取权限拒绝错误', () => {
      const error = new Error('Access denied: permission denied for this operation');

      const result = handler.handleError(error);

      expect(result.error).toBe('DATABASE_PERMISSION_DENIED');
      expect(result.message).toBe('权限不足，无法访问此功能呢~');
    });

    test('从消息中提取超时错误', () => {
      const error = new Error('Request timed out after 30 seconds');

      const result = handler.handleError(error);

      expect(result.error).toBe('DATABASE_QUERY_TIMEOUT');
      expect(result.message).toBe('查询超时了，请重新尝试一下吧~');
    });

    test('从消息中提取token过期错误', () => {
      const error = new Error('Authentication token has expired');

      const result = handler.handleError(error);

      expect(result.error).toBe('AUTH_TOKEN_EXPIRED');
      expect(result.message).toBe('登录已过期，请重新登录体验更多功能~');
    });

    test('从消息中提取网络错误', () => {
      const error = new Error('Network connection error occurred');

      const result = handler.handleError(error);

      expect(result.error).toBe('NETWORK_ERROR');
      expect(result.message).toBe('网络连接不太稳定，请检查网络后重试~');
    });
  });

  describe('默认错误处理测试', () => {
    test('未知错误使用默认处理', () => {
      const error = new Error('Some unknown error occurred');
      error.code = 'SOME_UNKNOWN_CODE';

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('出现了一些小问题，请稍后再试哦~');
      expect(result.action.type).toBe('retry');
      expect(result.action.delay).toBe(2000);
    });

    test('没有错误码的错误使用默认处理', () => {
      const error = new Error('Generic error without code');

      const result = handler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.message).toBe('出现了一些小问题，请稍后再试哦~');
    });
  });

  describe('HTTP响应创建测试', () => {
    test('创建错误HTTP响应', () => {
      const error = new Error('Test error');
      error.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const response = handler.createErrorResponse(error);

      expect(response.statusCode).toBe(500);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('数据服务暂时不可用，请稍后再试哦~');
      expect(body.error).toBe('DATABASE_COLLECTION_NOT_EXIST');
    });

    test('创建带有自定义CORS头的错误响应', () => {
      const error = new Error('Test error');
      const customHeaders = {
        'Access-Control-Allow-Origin': 'https://example.com',
        'X-Custom-Header': 'custom-value'
      };

      const response = handler.createErrorResponse(error, customHeaders);

      expect(response.headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(response.headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('异步函数包装测试', () => {
    test('成功执行的异步函数正常返回', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true, data: 'test' });

      const wrappedFn = handler.wrapAsync(mockFn);
      const result = await wrappedFn('arg1', 'arg2');

      expect(result).toEqual({ success: true, data: 'test' });
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('抛出错误的异步函数返回友好错误响应', async () => {
      const mockError = new Error('Database connection failed');
      mockError.code = 'DATABASE_COLLECTION_NOT_EXIST';

      const mockFn = jest.fn().mockRejectedValue(mockError);

      const wrappedFn = handler.wrapAsync(mockFn);
      const result = await wrappedFn();

      expect(result.statusCode).toBe(500);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.message).toBe('数据服务暂时不可用，请稍后再试哦~');
      expect(body.error).toBe('DATABASE_COLLECTION_NOT_EXIST');
    });
  });

  describe('错误处理调性测试', () => {
    test('所有错误消息都保持友好调性', () => {
      const testErrors = [
        'DATABASE_COLLECTION_NOT_EXIST',
        'AUTH_PERMISSION_ERR',
        'NETWORK_ERROR',
        'AI_QUOTA_EXCEEDED',
        'UPLOAD_FILE_TOO_LARGE',
        'INTERNAL_ERROR'
      ];

      testErrors.forEach(errorCode => {
        const error = new Error('Test');
        error.code = errorCode;

        const result = handler.handleError(error);

        // 检查消息是否包含友好语气词
        const friendlyWords = ['哦', '呢', '吧', '啦', '~'];
        const hasFriendlyTone = friendlyWords.some(word => result.message.includes(word));

        expect(hasFriendlyTone).toBe(true);
        expect(result.message).not.toContain('云开发AI小助手');
        expect(result.message).not.toContain('TCB');
      });
    });

    test('重试操作包含适当延迟', () => {
      const retryErrors = [
        'DATABASE_COLLECTION_NOT_EXIST',
        'NETWORK_ERROR',
        'INTERNAL_ERROR'
      ];

      retryErrors.forEach(errorCode => {
        const error = new Error('Test');
        error.code = errorCode;

        const result = handler.handleError(error);

        expect(result.action.type).toBe('retry');
        expect(result.action.delay).toBeGreaterThan(0);
      });
    });
  });
});