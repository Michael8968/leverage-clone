/**
 * TCB DB操作优化
 * 所有db.collection/add/get/update外层加try-catch，映射error.code到友好msg
 */

import { toast } from 'react-toastify';
import { getFriendlyErrorMessage, detectErrorType, getErrorRecoveryConfig } from '../config/errorConfig.js';

/**
 * 数据库操作的安全包装器
 * @param {Function} operation - 数据库操作函数
 * @param {Object} options - 配置选项
 * @returns {Promise} 包装后的操作结果
 */
export async function dbSafeQuery(operation, options = {}) {
  const {
    showErrorToast = true,
    defaultErrorMessage = getFriendlyErrorMessage(new Error('database operation failed')),
    onError = null
  } = options;

  try {
    const result = await operation();
    return result;
  } catch (error) {
    console.error('数据库操作失败:', error);

    // 使用统一错误配置获取友好消息
    const friendlyMessage = getFriendlyErrorMessage(error);
    const errorType = detectErrorType(error.message);
    const recoveryConfig = getErrorRecoveryConfig(errorType);

    if (showErrorToast) {
      toast.error(friendlyMessage);
    }

    if (onError) {
      onError(error, friendlyMessage);
    }

    // 如果是可重试的错误，可以选择重试
    if (recoveryConfig.retryable) {
      throw new Error(friendlyMessage);
    }

    throw error;
  }
}

/**
 * 用户状态更新专用包装器
 * PRD: 用户状态更新失败时'设置中，请稍等~'
 */
export async function dbSafeUserUpdate(operation, options = {}) {
  return dbSafeQuery(operation, {
    defaultErrorMessage: '设置中，请稍等~',
    ...options
  });
}

/**
 * 数据查询专用包装器
 */
export async function dbSafeRead(operation, options = {}) {
  return dbSafeQuery(operation, {
    defaultErrorMessage: '数据加载中，请稍后重试~',
    ...options
  });
}

/**
 * 数据写入专用包装器
 */
export async function dbSafeWrite(operation, options = {}) {
  return dbSafeQuery(operation, {
    defaultErrorMessage: '数据保存中，请稍等~',
    ...options
  });
}

/**
 * 批量数据库操作包装器
 * @param {Array<Function>} operations - 操作函数数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Array>} 操作结果数组
 */
export async function dbSafeBatch(operations, options = {}) {
  const results = [];
  const errors = [];

  for (const operation of operations) {
    try {
      const result = await dbSafeQuery(operation, {
        showErrorToast: false, // 批量操作时不显示单个错误提示
        ...options
      });
      results.push(result);
    } catch (error) {
      errors.push(error);
      results.push(null);
    }
  }

  // 如果有错误，显示汇总错误信息
  if (errors.length > 0) {
    const errorMessage = `批量操作中 ${errors.length} 项失败，请重试。`;
    toast.error(errorMessage, {
      position: "top-right",
      autoClose: 5000,
    });
  }

  return results;
}

/**
 * 数据库连接状态检查
 * @param {Object} db - 数据库实例
 * @returns {Promise<boolean>} 连接状态
 */
export async function checkDbConnection(db) {
  try {
    // 尝试一个简单的查询来检查连接
    await dbSafeQuery(async () => {
      // 这里可以执行一个简单的查询，比如检查系统集合
      return true;
    }, {
      showErrorToast: false
    });
    return true;
  } catch (error) {
    console.warn('数据库连接检查失败:', error);
    return false;
  }
}

/**
 * 重试数据库操作
 * @param {Function} operation - 数据库操作函数
 * @param {Object} options - 配置选项
 * @returns {Promise} 操作结果
 */
export async function dbRetryOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    ...queryOptions
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await dbSafeQuery(operation, {
        showErrorToast: attempt === maxRetries, // 只在最后一次重试时显示错误
        ...queryOptions
      });
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        console.log(`数据库操作重试 ${attempt}/${maxRetries}, 等待 ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoff; // 指数退避
      }
    }
  }

  throw lastError;
}

// 导出错误映射供其他模块使用
// export { DB_ERROR_MAPPINGS };