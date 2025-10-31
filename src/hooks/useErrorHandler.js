/**
 * 全局错误处理钩子
 * 提供统一的错误处理逻辑和状态管理
 */

import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  BUSINESS: 'business',
  SYSTEM: 'system',
  AI: 'ai',
  DATABASE: 'database'
};

/**
 * 错误严重程度枚举
 */
export const ERROR_SEVERITY = {
  LOW: 'low',       // 轻微错误，不影响主要功能
  MEDIUM: 'medium', // 中等错误，需要用户注意
  HIGH: 'high',     // 严重错误，阻止用户操作
  CRITICAL: 'critical' // 关键错误，需要立即处理
};

/**
 * 全局错误处理钩子
 * @param {Object} options - 配置选项
 * @param {boolean} options.showToast - 是否显示toast提示
 * @param {boolean} options.logErrors - 是否记录错误日志
 * @param {Function} options.onError - 自定义错误处理函数
 */
export function useErrorHandler(options = {}) {
  const {
    showToast = true,
    logErrors = true,
    onError
  } = options;

  const [errorState, setErrorState] = useState({
    hasError: false,
    error: null,
    type: null,
    severity: ERROR_SEVERITY.MEDIUM,
    timestamp: null
  });

  /**
   * 处理错误的核心函数
   */
  const handleError = useCallback((error, context = {}) => {
    const {
      type = ERROR_TYPES.SYSTEM,
      severity = ERROR_SEVERITY.MEDIUM,
      silent = false,
      customMessage,
      action
    } = context;

    // 创建错误对象
    const errorInfo = {
      originalError: error,
      type,
      severity,
      timestamp: new Date().toISOString(),
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };

    // 更新错误状态
    setErrorState({
      hasError: true,
      error: errorInfo,
      type,
      severity,
      timestamp: errorInfo.timestamp
    });

    // 记录错误日志
    if (logErrors) {
      console.error('全局错误处理:', errorInfo);
    }

    // 显示用户友好的错误提示
    if (showToast && !silent) {
      const message = customMessage || getFriendlyMessage(error, type);
      const toastType = getToastType(severity);

      toast[toastType](message, {
        position: "top-center",
        autoClose: getAutoCloseTime(severity),
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }

    // 调用自定义错误处理函数
    if (onError) {
      onError(errorInfo);
    }

    // 可以在这里集成错误监控服务
    reportToMonitoring(errorInfo);

    return errorInfo;
  }, [showToast, logErrors, onError]);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      type: null,
      severity: ERROR_SEVERITY.MEDIUM,
      timestamp: null
    });
  }, []);

  /**
   * 重试函数包装器
   */
  const withRetry = useCallback((fn, maxRetries = 3, delay = 1000) => {
    return async (...args) => {
      let lastError;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;

          if (attempt < maxRetries) {
            // 指数退避重试
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
            continue;
          }
        }
      }

      // 所有重试都失败，抛出错误
      throw lastError;
    };
  }, []);

  /**
   * 异步错误处理包装器
   */
  const withErrorHandling = useCallback((fn, context = {}) => {
    return async (...args) => {
      try {
        clearError();
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        throw error; // 重新抛出错误，让调用方处理
      }
    };
  }, [handleError, clearError]);

  return {
    errorState,
    handleError,
    clearError,
    withRetry,
    withErrorHandling
  };
}

/**
 * 获取友好的错误消息
 */
function getFriendlyMessage(error, type) {
  // 基于错误类型和消息内容生成友好的提示
  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();

  // 网络相关错误
  if (type === ERROR_TYPES.NETWORK || lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return '网络连接不太稳定，请稍后重试。';
  }

  // 认证相关错误
  if (type === ERROR_TYPES.AUTH || lowerMessage.includes('auth') || lowerMessage.includes('unauthorized')) {
    return '请重新登录后继续操作。';
  }

  // 验证相关错误
  if (type === ERROR_TYPES.VALIDATION || lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
    return '输入信息有误，请检查后重新提交。';
  }

  // AI相关错误
  if (type === ERROR_TYPES.AI || lowerMessage.includes('ai') || lowerMessage.includes('recommendation')) {
    return '推荐灵感生成中~';
  }

  // 数据库相关错误
  if (type === ERROR_TYPES.DATABASE || lowerMessage.includes('database') || lowerMessage.includes('query')) {
    return '数据处理中，请稍后重试。';
  }

  // 业务逻辑错误
  if (type === ERROR_TYPES.BUSINESS) {
    return message || '操作失败，请稍后重试。';
  }

  // 系统错误
  if (type === ERROR_TYPES.SYSTEM) {
    return '系统暂时不可用，请稍后重试。';
  }

  // 默认错误消息
  return '出现技术问题，请联系开发人员。';
}

/**
 * 根据严重程度获取toast类型
 */
function getToastType(severity) {
  switch (severity) {
    case ERROR_SEVERITY.LOW:
      return 'info';
    case ERROR_SEVERITY.MEDIUM:
      return 'warning';
    case ERROR_SEVERITY.HIGH:
      return 'error';
    case ERROR_SEVERITY.CRITICAL:
      return 'error';
    default:
      return 'error';
  }
}

/**
 * 根据严重程度获取自动关闭时间
 */
function getAutoCloseTime(severity) {
  switch (severity) {
    case ERROR_SEVERITY.LOW:
      return 3000;
    case ERROR_SEVERITY.MEDIUM:
      return 5000;
    case ERROR_SEVERITY.HIGH:
      return 8000;
    case ERROR_SEVERITY.CRITICAL:
      return false; // 不自动关闭
    default:
      return 5000;
  }
}

/**
 * 报告错误到监控服务
 */
function reportToMonitoring(errorInfo) {
  // 这里可以集成各种错误监控服务
  const errorReport = {
    message: errorInfo.originalError?.message,
    stack: errorInfo.originalError?.stack,
    type: errorInfo.type,
    severity: errorInfo.severity,
    timestamp: errorInfo.timestamp,
    context: errorInfo.context,
    userAgent: errorInfo.userAgent,
    url: errorInfo.url
  };

  // 示例：发送到监控API
  // fetch('/api/errors', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(errorReport)
  // }).catch(console.error);

  console.log('错误监控报告:', errorReport);
}

/**
 * 全局错误处理上下文和提供者
 */
import { createContext, useContext } from 'react';

const ErrorContext = createContext(null);

export function ErrorProvider({ children, config = {} }) {
  const errorHandler = useErrorHandler(config);

  return (
    <ErrorContext.Provider value={errorHandler}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useGlobalError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useGlobalError must be used within an ErrorProvider');
  }
  return context;
}

export default useErrorHandler;