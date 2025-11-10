/**
 * React TCB API拦截器
 * axios.interceptors.response.use() 捕获4xx/5xx，替换error.response.data为友好提示
 */

import axios from 'axios';
import { toast } from 'react-toastify';
import { getFriendlyErrorMessage, detectErrorType, getErrorRecoveryConfig } from '../config/errorConfig.js';

/**
 * 处理API响应错误
 * @param {Object} error - axios错误对象
 * @param {Object} options - 处理选项
 * @returns {Promise} 拒绝的Promise，包含友好错误信息
 */
const handleResponseError = (error, options = {}) => {
  const { showErrorToast = true, toastConfig = {} } = options;

  // 使用统一错误配置获取友好消息
  const friendlyMessage = getFriendlyErrorMessage(error);
  const errorType = detectErrorType(error.message || error.response?.data?.message || '');
  const recoveryConfig = getErrorRecoveryConfig(errorType);

  let action = { type: 'contact_support' };

  // 根据错误类型设置action
  if (recoveryConfig.retryable) {
    action = { type: 'retry', delay: recoveryConfig.retryDelay || 2000 };
  } else if (recoveryConfig.redirectTo) {
    action = { type: 'redirect', to: recoveryConfig.redirectTo };
  }

  // 特殊处理：数据库不存在时重定向到demand-pool
  if (error.response?.data?.error === 'DATABASE_COLLECTION_NOT_EXIST') {
    action = { type: 'redirect', to: '/demand-pool' };
  }

  // 显示错误提示
  if (showErrorToast) {
    toast.error(friendlyMessage, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      ...toastConfig
    });
  }

  // 执行错误操作
  executeErrorAction(action);

  const friendlyError = {
    success: false,
    message: friendlyMessage,
    action: action,
    originalError: error,
    timestamp: new Date().toISOString()
  };

  return Promise.reject(friendlyError);
};

/**
 * 执行错误操作
 * @param {Object} action - 错误操作配置
 */
const executeErrorAction = (action) => {
  switch (action.type) {
    case 'redirect':
      if (action.to && typeof window !== 'undefined') {
        // 延迟跳转，让用户看到错误提示
        setTimeout(() => {
          window.location.href = action.to;
        }, 2000);
      }
      break;

    case 'retry':
      // 重试逻辑通常由调用方处理，这里不做自动重试
      console.log('建议重试操作', action);
      break;

    default:
      console.log('未知错误操作类型:', action.type);
  }
};

/**
 * 创建配置好的axios实例
 */
const createApiClient = (baseURL = '/api', options = {}) => {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  // 请求拦截器 - 添加认证头
  client.interceptors.request.use(
    (config) => {
      // 显示loading提示（如果需要）
      if (options.showLoading !== false) {
        toast.info('加载中...', {
          position: "top-right",
          autoClose: false,
          hideProgressBar: true,
          closeOnClick: false,
          pauseOnHover: false,
          draggable: false,
          toastId: 'loading'
        });
      }

      // 添加认证头
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => {
      toast.dismiss('loading');
      return Promise.reject(error);
    }
  );

  // 响应拦截器 - 处理错误
  client.interceptors.response.use(
    (response) => {
      // 隐藏loading提示
      toast.dismiss('loading');

      // 处理成功响应
      if (response.data && response.data.message) {
        // 如果后端返回了成功消息，可以显示
        if (options.showSuccessMessage !== false) {
          toast.success(response.data.message, {
            position: "top-right",
            autoClose: 3000,
          });
        }
      }

      return response;
    },
    (error) => {
      // 隐藏loading提示
      toast.dismiss('loading');

      // 处理错误
      return handleResponseError(error);
    }
  );

  return client;
};

// 创建默认API客户端实例
const apiClient = createApiClient();

export default apiClient;
export { createApiClient, handleResponseError };