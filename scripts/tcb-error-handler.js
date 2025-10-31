/**
 * TCB API 全局错误处理模块
 * 将TCB默认错误转换为友好提示，保持一致的错误处理策略
 */

const { getFriendlyErrorMessage, detectErrorType, getErrorRecoveryConfig, ERROR_TYPES } = require('../src/config/errorConfig');

class TCBErrorHandler {
  constructor() {
    // 使用统一的错误配置
    this.errorMappings = {
      // 数据库相关错误
      'DATABASE_COLLECTION_NOT_EXIST': {
        message: getFriendlyErrorMessage(new Error('Collection does not exist'), ERROR_TYPES.DATABASE),
        action: { type: 'contact_support' }
      },
      'DATABASE_PERMISSION_DENIED': {
        message: getFriendlyErrorMessage(new Error('permission denied'), ERROR_TYPES.AUTH),
        action: { type: 'redirect', to: '/login' }
      },
      'DATABASE_DOCUMENT_NOT_FOUND': {
        message: getFriendlyErrorMessage(new Error('resource not found'), ERROR_TYPES.BUSINESS),
        action: { type: 'retry' }
      },
      'DATABASE_QUERY_TIMEOUT': {
        message: getFriendlyErrorMessage(new Error('timeout'), ERROR_TYPES.NETWORK),
        action: { type: 'retry', delay: 1000 }
      },

      // 认证相关错误
      'AUTH_PERMISSION_ERR': {
        message: getFriendlyErrorMessage(new Error('authentication failed'), ERROR_TYPES.AUTH),
        action: { type: 'redirect', to: '/login' }
      },
      'AUTH_TOKEN_EXPIRED': {
        message: getFriendlyErrorMessage(new Error('authentication failed'), ERROR_TYPES.AUTH),
        action: { type: 'redirect', to: '/login' }
      },
      'AUTH_INVALID_TOKEN': {
        message: getFriendlyErrorMessage(new Error('authentication failed'), ERROR_TYPES.AUTH),
        action: { type: 'redirect', to: '/login' }
      },

      // 网络相关错误
      'NETWORK_ERROR': {
        message: getFriendlyErrorMessage(new Error('Network request failed'), ERROR_TYPES.NETWORK),
        action: { type: 'retry', delay: 3000 }
      },
      'NETWORK_TIMEOUT': {
        message: getFriendlyErrorMessage(new Error('Timeout'), ERROR_TYPES.NETWORK),
        action: { type: 'retry', delay: 2000 }
      },

      // AI服务相关错误
      'AI_SERVICE_UNAVAILABLE': {
        message: getFriendlyErrorMessage(new Error('AI service unavailable'), ERROR_TYPES.AI),
        action: { type: 'retry', delay: 5000 }
      },
      'AI_MODEL_NOT_FOUND': {
        message: getFriendlyErrorMessage(new Error('model loading failed'), ERROR_TYPES.AI),
        action: { type: 'retry' }
      },
      'AI_QUOTA_EXCEEDED': {
        message: getFriendlyErrorMessage(new Error('quota exceeded'), ERROR_TYPES.TCB),
        action: { type: 'contact_support' }
      },

      // 文件上传相关错误
      'UPLOAD_FILE_TOO_LARGE': {
        message: getFriendlyErrorMessage(new Error('length exceeded'), ERROR_TYPES.VALIDATION),
        action: { type: 'retry' }
      },
      'UPLOAD_INVALID_TYPE': {
        message: getFriendlyErrorMessage(new Error('format error'), ERROR_TYPES.VALIDATION),
        action: { type: 'retry' }
      },
      'UPLOAD_PERMISSION_DENIED': {
        message: getFriendlyErrorMessage(new Error('permission denied'), ERROR_TYPES.AUTH),
        action: { type: 'contact_support' }
      },

      // 通用错误
      'INTERNAL_ERROR': {
        message: getFriendlyErrorMessage(new Error('service unavailable'), ERROR_TYPES.TCB),
        action: { type: 'retry', delay: 3000 }
      },
      'UNKNOWN_ERROR': {
        message: getFriendlyErrorMessage(new Error(''), null),
        action: { type: 'contact_support' }
      },
      'VALIDATION_FAILED': {
        message: getFriendlyErrorMessage(new Error('invalid input'), ERROR_TYPES.VALIDATION),
        action: { type: 'retry' }
      }
    };

    // 默认错误处理
    this.defaultError = {
      message: getFriendlyErrorMessage(new Error(''), null),
      action: { type: 'contact_support' }
    };
  }

  /**
   * 处理错误，返回友好提示
   * @param {Error} error - 原始错误对象
   * @returns {Object} 友好的错误响应
   */
  handleError(error) {
    console.error('原始错误:', error);

    // 提取错误码
    const errorCode = this.extractErrorCode(error);
    console.log('错误码:', errorCode);

    // 获取映射的友好提示
    const friendlyError = errorCode ? this.errorMappings[errorCode] : null;
    const finalError = friendlyError || this.defaultError;

    // 返回统一格式
    return {
      success: false,
      message: finalError.message,
      error: errorCode || 'UNKNOWN_ERROR',
      action: finalError.action,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 从错误对象中提取错误码
   * @param {Error} error - 错误对象
   * @returns {string} 错误码
   */
  extractErrorCode(error) {
    // 优先级：error.code > error.message中的关键词 > 默认错误

    // 1. 直接的error.code
    if (error.code) {
      return error.code;
    }

    // 2. 从error.message中提取关键词
    const message = error.message || '';
    const lowerMessage = message.toLowerCase();

    // 数据库相关
    if (lowerMessage.includes('collection') && lowerMessage.includes('not exist')) {
      return 'DATABASE_COLLECTION_NOT_EXIST';
    }
    if (lowerMessage.includes('permission') && lowerMessage.includes('denied')) {
      return 'DATABASE_PERMISSION_DENIED';
    }
    if (lowerMessage.includes('document') && lowerMessage.includes('not found')) {
      return 'DATABASE_DOCUMENT_NOT_FOUND';
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return 'DATABASE_QUERY_TIMEOUT';
    }

    // 认证相关
    if (lowerMessage.includes('token') && lowerMessage.includes('expired')) {
      return 'AUTH_TOKEN_EXPIRED';
    }
    if (lowerMessage.includes('invalid') && lowerMessage.includes('token')) {
      return 'AUTH_INVALID_TOKEN';
    }
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return 'AUTH_PERMISSION_ERR';
    }

    // 网络相关
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    if (lowerMessage.includes('timeout')) {
      return 'NETWORK_TIMEOUT';
    }

    // AI服务相关
    if (lowerMessage.includes('ai') || lowerMessage.includes('model')) {
      return 'AI_SERVICE_UNAVAILABLE';
    }
    if (lowerMessage.includes('quota') || lowerMessage.includes('limit')) {
      return 'AI_QUOTA_EXCEEDED';
    }

    // 文件上传相关
    if (lowerMessage.includes('file') && lowerMessage.includes('large')) {
      return 'UPLOAD_FILE_TOO_LARGE';
    }
    if (lowerMessage.includes('invalid') && lowerMessage.includes('type')) {
      return 'UPLOAD_INVALID_TYPE';
    }

    // 如果都没有匹配到，返回null，让handleError使用默认错误
    return null;
  }

  /**
   * 创建错误响应（用于HTTP响应）
   * @param {Error} error - 原始错误
   * @param {Object} corsHeaders - CORS头
   * @returns {Object} HTTP响应对象
   */
  createErrorResponse(error, corsHeaders = {}) {
    const friendlyError = this.handleError(error);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        ...corsHeaders
      },
      body: JSON.stringify(friendlyError)
    };
  }

  /**
   * 包装异步函数，自动处理错误
   * @param {Function} fn - 要包装的异步函数
   * @param {Object} corsHeaders - CORS头
   * @returns {Function} 包装后的函数
   */
  wrapAsync(fn, corsHeaders = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.createErrorResponse(error, corsHeaders);
      }
    };
  }
}

// 创建全局实例
const errorHandler = new TCBErrorHandler();

module.exports = {
  TCBErrorHandler,
  errorHandler
};