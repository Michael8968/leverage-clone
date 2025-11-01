/**
 * @file 前端API请求工具函数 (V2 - 优化版)
 *
 * 此文件提供了一系列与TCB HTTP API交互的函数。
 * - 封装了 fetch API，统一处理认证头和错误。
 * - 实现了请求重试机制，以应对网络波动。
 * - 为GET请求实现了基于SessionStorage的简单缓存策略。
 */

// API的基础URL，从环境变量中获取
const API_BASE_URL = 'https://leverage-tcb-5gvvzaincb98cd4e.ap-shanghai.tcb-api.tencentcloudapi.com';

/**
 * 带有重试和超时的fetch封装
 * @param {string} url - 请求的URL
 * @param {RequestInit} options - fetch的配置选项
 * @param {number} retries - 重试次数
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (url, options, retries = 3) => {
  const timeout = 5000; // 5秒超时
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok && response.status >= 500) { // 只对服务端错误进行重试
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed: ${error.message}`);
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // 指数退避
    }
  }
};


/**
 * 获取认证头
 * @returns {HeadersInit} 包含认证信息的Headers对象
 */
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

/**
 * 处理API响应的通用函数
 * @param {Response} response - fetch API的响应对象
 * @returns {Promise<any>} 解析后的JSON数据
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * API请求的通用函数
 * @param {'GET' | 'POST'} method - HTTP方法
 * @param {string} endpoint - API的端点 (e.g., '/api/posts')
 * @param {object} [body] - POST请求的请求体
 * @param {boolean} [useCache=true] - 是否对GET请求使用缓存
 * @returns {Promise<any>}
 */
const apiRequest = async (method, endpoint, body = null, useCache = true) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: getAuthHeaders(),
    ...(body && { body: JSON.stringify(body) }),
  };

  const cacheKey = `cache_${endpoint}`;
  if (method === 'GET' && useCache && typeof window !== 'undefined') {
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
        console.log(`[Cache] Hit for ${endpoint}`);
        // 在后台静默更新缓存
        fetchWithRetry(url, options).then(handleResponse).then(freshData => {
            sessionStorage.setItem(cacheKey, JSON.stringify(freshData));
        }).catch(() => { /* 静默失败 */ });
        return JSON.parse(cachedData);
    }
  }

  const response = await fetchWithRetry(url, options);
  const data = await handleResponse(response);
  
  if (method === 'GET' && useCache && typeof window !== 'undefined') {
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`[Cache] Stored for ${endpoint}`);
  }

  return data;
};

// --- 封装后的API函数 ---

export const apiLogin = (email, password) => 
  apiRequest('POST', '/api/auth/login', { email, password });

export const apiRegister = (userData) =>
  apiRequest('POST', '/api/auth/register', userData);

export const apiVerifyToken = () =>
  apiRequest('GET', '/api/auth/verify', null, false); // 不缓存验证请求

export const apiGetPosts = (userId) => {
  const endpoint = userId ? `/api/posts?userId=${userId}` : '/api/posts';
  return apiRequest('GET', endpoint);
};

export const apiCreatePost = (title, content) =>
  apiRequest('POST', '/api/posts', { title, content });
