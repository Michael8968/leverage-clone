/**
 * TCB云函数通用错误处理工具
 * 在main handler中全包try-catch，替换所有TCB error为友好提示
 */

const cloudbase = require('@cloudbase/node-sdk');
const { getFriendlyErrorMessage, detectErrorType, getErrorRecoveryConfig, ERROR_TYPES } = require('../src/config/errorConfig');

/**
 * 通用云函数错误处理器
 * @param {Error} error - 原始错误
 * @returns {Object} 友好的错误响应
 */
function handleCloudFunctionError(error) {
  console.error('云函数错误:', error);

  // 使用统一的错误配置获取友好消息
  const friendlyMsg = getFriendlyErrorMessage(error);
  const errorType = detectErrorType(error.message);
  const recoveryConfig = getErrorRecoveryConfig(errorType);

  let action = { type: 'contact_support' };

  // 根据错误类型设置action
  if (recoveryConfig.retryable) {
    action = { type: 'retry', delay: recoveryConfig.retryDelay || 2000 };
  } else if (recoveryConfig.redirectTo) {
    action = { type: 'redirect', to: recoveryConfig.redirectTo };
  }

  // 特殊处理：数据库不存在时重定向到demand-pool
  if (error.code === 'DATABASE_COLLECTION_NOT_EXIST' || error.code === 'ResourceNotFound') {
    action = { type: 'redirect', to: '/demand-pool' };
  }

  return {
    success: false,
    message: friendlyMsg,
    action: action,
    timestamp: new Date().toISOString()
  };
}

/**
 * 云函数主处理器的通用包装器
 * @param {Function} handler - 业务逻辑处理函数
 * @param {Object} corsHeaders - CORS头
 * @returns {Function} 包装后的处理器
 */
function wrapCloudFunctionHandler(handler, corsHeaders = {}) {
  return async (event, context) => {
    // CORS预检处理
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          ...corsHeaders
        }
      };
    }

    const defaultCorsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      ...corsHeaders
    };

    try {
      // 执行业务逻辑
      const result = await handler(event, context);

      // 如果业务逻辑返回的不是标准响应格式，进行包装
      if (!result.statusCode) {
        return {
          statusCode: 200,
          headers: defaultCorsHeaders,
          body: JSON.stringify({
            success: true,
            message: '操作成功',
            data: result
          })
        };
      }

      // 确保CORS头存在
      return {
        ...result,
        headers: {
          ...defaultCorsHeaders,
          ...result.headers
        }
      };

    } catch (error) {
      console.error('云函数执行失败:', error);

      // 使用通用错误处理器
      const friendlyError = handleCloudFunctionError(error);

      return {
        statusCode: 500,
        headers: defaultCorsHeaders,
        body: JSON.stringify(friendlyError)
      };
    }
  };
}

/**
 * 初始化TCB应用的通用函数
 * @param {Object} options - 初始化选项
 * @returns {Object} TCB应用实例
 */
function initTCBApp(options = {}) {
  const defaultOptions = {
    env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
    secretId: process.env.TCB_SECRET_ID,
    secretKey: process.env.TCB_SECRET_KEY,
    ...options
  };

  return cloudbase.init(defaultOptions);
}

/**
 * 数据库操作的安全包装器（后端版本）
 * @param {Function} operation - 数据库操作函数
 * @param {string} operationName - 操作名称，用于日志
 * @returns {Promise} 操作结果
 */
async function safeDatabaseOperation(operation, operationName = '数据库操作') {
  try {
    const result = await operation();
    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error(`${operationName}失败:`, error);

    // 使用统一错误配置获取友好消息
    const friendlyMsg = getFriendlyErrorMessage(error);
    const errorType = detectErrorType(error.message);
    const recoveryConfig = getErrorRecoveryConfig(errorType);

    let action = { type: 'contact_support' };

    if (recoveryConfig.retryable) {
      action = { type: 'retry', delay: recoveryConfig.retryDelay || 2000 };
    } else if (recoveryConfig.redirectTo) {
      action = { type: 'redirect', to: recoveryConfig.redirectTo };
    }

    return {
      success: false,
      message: friendlyMsg,
      action: action,
      error: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  handleCloudFunctionError,
  wrapCloudFunctionHandler,
  initTCBApp,
  safeDatabaseOperation
};