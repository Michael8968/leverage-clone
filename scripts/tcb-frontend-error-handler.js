/**
 * 前端TCB API错误处理拦截器
 * 为axios请求自动处理TCB错误响应，转换为友好提示
 */

class TCBFrontendErrorHandler {
  constructor() {
    this.errorMappings = {
      // 数据库相关错误
      'DATABASE_COLLECTION_NOT_EXIST': {
        message: '数据服务暂时不可用，请稍后再试哦~',
        action: { type: 'retry', delay: 2000 }
      },
      'DATABASE_PERMISSION_DENIED': {
        message: '权限不足，无法访问此功能呢~',
        action: { type: 'redirect', to: '/login' }
      },
      'DATABASE_DOCUMENT_NOT_FOUND': {
        message: '没有找到相关信息，请检查后重试~',
        action: { type: 'retry' }
      },
      'DATABASE_QUERY_TIMEOUT': {
        message: '查询超时了，请重新尝试一下吧~',
        action: { type: 'retry', delay: 1000 }
      },

      // 认证相关错误
      'AUTH_PERMISSION_ERR': {
        message: '登录状态已过期，请重新登录哦~',
        action: { type: 'redirect', to: '/login' }
      },
      'AUTH_TOKEN_EXPIRED': {
        message: '登录已过期，请重新登录体验更多功能~',
        action: { type: 'redirect', to: '/login' }
      },
      'AUTH_INVALID_TOKEN': {
        message: '登录信息有误，请重新登录吧~',
        action: { type: 'redirect', to: '/login' }
      },

      // 网络相关错误
      'NETWORK_ERROR': {
        message: '网络连接不太稳定，请检查网络后重试~',
        action: { type: 'retry', delay: 3000 }
      },
      'NETWORK_TIMEOUT': {
        message: '请求超时了，请重新尝试一下吧~',
        action: { type: 'retry', delay: 2000 }
      },

      // AI服务相关错误
      'AI_SERVICE_UNAVAILABLE': {
        message: 'AI助手正在休息中，请稍后再来找我聊天~',
        action: { type: 'retry', delay: 5000 }
      },
      'AI_MODEL_NOT_FOUND': {
        message: '选择的AI模型暂时不可用，请尝试其他选项~',
        action: { type: 'retry' }
      },
      'AI_QUOTA_EXCEEDED': {
        message: 'AI使用额度已用完，请升级会员享受更多服务~',
        action: { type: 'redirect', to: '/pricing' }
      },

      // 文件上传相关错误
      'UPLOAD_FILE_TOO_LARGE': {
        message: '文件太大啦，请选择小一点的文件上传~',
        action: { type: 'retry' }
      },
      'UPLOAD_INVALID_TYPE': {
        message: '文件格式不支持，请选择正确的文件类型哦~',
        action: { type: 'retry' }
      },
      'UPLOAD_PERMISSION_DENIED': {
        message: '没有上传权限，请联系管理员获取权限~',
        action: { type: 'redirect', to: '/support' }
      },

      // 通用错误
      'INTERNAL_ERROR': {
        message: '服务暂时出现小问题，请稍后再试哦~',
        action: { type: 'retry', delay: 3000 }
      },
      'UNKNOWN_ERROR': {
        message: '出现了一些技术问题，请联系我们的小助手~',
        action: { type: 'redirect', to: '/support' }
      },
      'VALIDATION_FAILED': {
        message: '输入信息好像不太对，请检查后重新提交~',
        action: { type: 'retry' }
      }
    };

    this.defaultError = {
      message: '出现了一些小问题，请稍后再试哦~',
      action: { type: 'retry', delay: 2000 }
    };
  }

  /**
   * 处理API响应错误
   * @param {Object} response - axios响应对象
   * @returns {Object} 处理后的错误信息
   */
  handleResponseError(response) {
    if (!response.data) {
      return this.defaultError;
    }

    const { error, message, action } = response.data;

    // 如果后端已经返回了友好提示，直接使用
    if (message && action) {
      return { message, action };
    }

    // 否则根据错误码映射
    return this.errorMappings[error] || this.defaultError;
  }

  /**
   * 处理网络错误
   * @param {Error} error - axios错误对象
   * @returns {Object} 处理后的错误信息
   */
  handleNetworkError(error) {
    if (error.response) {
      // 服务器返回了错误状态码
      return this.handleResponseError(error.response);
    } else if (error.request) {
      // 网络错误
      return this.errorMappings['NETWORK_ERROR'] || this.defaultError;
    } else {
      // 其他错误
      return this.defaultError;
    }
  }

  /**
   * 执行错误操作（如重试或跳转）
   * @param {Object} errorInfo - 错误信息对象
   * @param {Function} retryCallback - 重试回调函数
   */
  executeAction(errorInfo, retryCallback = null) {
    const { action } = errorInfo;

    switch (action.type) {
      case 'retry':
        if (retryCallback && typeof retryCallback === 'function') {
          const delay = action.delay || 1000;
          setTimeout(() => {
            retryCallback();
          }, delay);
        }
        break;

      case 'redirect':
        if (action.to) {
          // 在前端环境中使用路由跳转
          if (typeof window !== 'undefined' && window.location) {
            window.location.href = action.to;
          }
        }
        break;

      default:
        console.log('未知的错误操作类型:', action.type);
    }
  }

  /**
   * 显示错误提示（可集成到UI框架）
   * @param {Object} errorInfo - 错误信息
   * @param {Function} showToast - 显示提示的函数
   */
  showErrorToast(errorInfo, showToast = console.log) {
    showToast(errorInfo.message);
  }
}

// 创建全局实例
const frontendErrorHandler = new TCBFrontendErrorHandler();

/**
 * Axios响应拦截器
 * @param {Object} axiosInstance - axios实例
 */
function setupAxiosInterceptors(axiosInstance) {
  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response) => {
      // 成功响应直接返回
      return response;
    },
    (error) => {
      // 处理错误响应
      const errorInfo = frontendErrorHandler.handleNetworkError(error);

      // 可以在这里集成UI提示
      console.error('API错误:', errorInfo);

      // 返回Promise.reject以保持错误链
      return Promise.reject({
        ...error,
        friendlyMessage: errorInfo.message,
        action: errorInfo.action
      });
    }
  );

  return axiosInstance;
}

module.exports = {
  TCBFrontendErrorHandler,
  frontendErrorHandler,
  setupAxiosInterceptors
};