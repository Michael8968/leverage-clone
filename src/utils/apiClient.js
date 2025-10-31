/**
 * React TCB API拦截器
 * axios.interceptors.response.use() 捕获4xx/5xx，替换error.response.data为友好提示
 */

import axios from 'axios';
import { toast } from 'react-toastify';
import { getFriendlyErrorMessage, detectErrorType, getErrorRecoveryConfig } from './errorConfig.js';

/**
 * 处理API响应错误
 * @param {Object} error - axios错误对象
 * @returns {Promise} 拒绝的Promise，包含友好错误信息
 */
const handleResponseError = (error) => {
  let friendlyMessage = '出现技术问题，请联系开发人员。';
  let action = { type: 'retry' };

  if (error.response) {
    // 服务器返回了错误状态码
    const { status, data } = error.response;

    // 处理4xx/5xx错误
    if (status >= 400 && status < 600) {
      // 如果后端已经返回了友好的错误信息，直接使用
      if (data && data.message && data.action) {
        friendlyMessage = data.message;
        action = data.action;
      } else {
        // 根据HTTP状态码映射
        switch (status) {
          case 401:
            friendlyMessage = '权限验证中，请重新登录。';
            action = { type: 'redirect', to: '/login' };
            break;
          case 403:
            friendlyMessage = '权限不足，无法访问此功能。';
            action = { type: 'redirect', to: '/login' };
            break;
          case 404:
            friendlyMessage = '数据加载中，请稍后重试~';
            action = { type: 'redirect', to: '/demand-pool' };
            break;
          case 429:
            friendlyMessage = '请求过于频繁，请稍后再试。';
            action = { type: 'retry', delay: 5000 };
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            friendlyMessage = '服务暂时不可用，请稍后重试。';
            action = { type: 'retry', delay: 3000 };
            break;
          default:
            friendlyMessage = '出现技术问题，请联系开发人员。';
            action = { type: 'retry' };
        }
      }
    }
  } else if (error.request) {
    // 网络错误
    friendlyMessage = '网络连接不太稳定，请稍后重试。';
    action = { type: 'retry' };
  } else {
    // 其他错误
    friendlyMessage = '出现技术问题，请联系开发人员。';
    action = { type: 'retry' };
  }

  // 显示错误提示
  toast.error(friendlyMessage, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });

  // 执行错误操作
  executeErrorAction(action);

  // 返回标准化的错误对象
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
export { createApiClient, handleResponseError, ERROR_MAPPINGS };