/**
 * TCB API 简化错误处理模块
 * 根据用户示例优化，保持简洁和直接
 */

class TCBErrorHandler {
  constructor() {
    // 简化的错误码映射
    this.errorMappings = {
      'DATABASE_COLLECTION_NOT_EXIST': {
        message: '数据加载中，请稍后重试~',
        action: { type: 'redirect', to: '/dashboard' }
      },
      'AUTH_PERMISSION_ERR': {
        message: '登录状态小调整，请重新登录。',
        action: { type: 'redirect', to: '/login' }
      },
      'NETWORK_ERROR': {
        message: '网络连接不太稳定，请稍后重试。',
        action: { type: 'retry' }
      },
      'INTERNAL_ERROR': {
        message: '服务暂时不可用，请稍后重试。',
        action: { type: 'retry' }
      }
    };

    this.defaultError = {
      message: '出现技术问题，请联系开发人员。',
      action: { type: 'retry' }
    };
  }

  /**
   * 处理错误，返回友好提示（简化版本）
   * @param {Error} error - 原始错误对象
   * @returns {Object} 友好的错误响应
   */
  handleError(error) {
    // 直接根据error.code进行条件判断
    if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
      return {
        success: false,
        message: '数据加载中，请稍后重试~',
        action: { type: 'redirect', to: '/dashboard' }
      };
    } else if (error.code === 'AUTH_PERMISSION_ERR') {
      return {
        success: false,
        message: '登录状态小调整，请重新登录。',
        action: { type: 'redirect', to: '/login' }
      };
    } else if (error.code === 'NETWORK_ERROR') {
      return {
        success: false,
        message: '网络连接不太稳定，请稍后重试。',
        action: { type: 'retry' }
      };
    } else if (error.code === 'INTERNAL_ERROR') {
      return {
        success: false,
        message: '服务暂时不可用，请稍后重试。',
        action: { type: 'retry' }
      };
    }

    // 默认错误处理
    return {
      success: false,
      message: '出现技术问题，请联系开发人员。',
      action: { type: 'retry' }
    };
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
   * 简化的错误处理函数（直接使用）
   * @param {Error} error - 原始错误
   * @returns {Object} 错误响应
   */
  getFriendlyError(error) {
    return this.handleError(error);
  }
}

// 创建全局实例
const errorHandler = new TCBErrorHandler();

/**
 * 便捷函数：直接处理错误（符合用户示例）
 * @param {Error} error - 原始错误
 * @returns {Object} 友好的错误响应
 */
function handleTCBError(error) {
  let friendlyMsg = '出现技术问题，请联系开发人员。';
  let action = { type: 'retry' };

  if (error.code === 'DATABASE_COLLECTION_NOT_EXIST') {
    friendlyMsg = '数据加载中，请稍后重试~';
    action = { type: 'redirect', to: '/dashboard' };
  } else if (error.code === 'AUTH_PERMISSION_ERR') {
    friendlyMsg = '登录状态小调整，请重新登录。';
    action = { type: 'redirect', to: '/login' };
  } else if (error.code === 'NETWORK_ERROR') {
    friendlyMsg = '网络连接不太稳定，请稍后重试。';
    action = { type: 'retry' };
  } else if (error.code === 'INTERNAL_ERROR') {
    friendlyMsg = '服务暂时不可用，请稍后重试。';
    action = { type: 'retry' };
  }

  return { success: false, message: friendlyMsg, action };
}

module.exports = {
  TCBErrorHandler,
  errorHandler,
  handleTCBError
};