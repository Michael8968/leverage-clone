
/**
 * @file 前端API请求工具函数
 *
 * 此文件提供了一系列函数，用于与新的TCB HTTP API进行交互。
 * 它封装了 `fetch` API，并统一处理了认证头和错误。
 */

// 从环境变量或配置文件中获取API的基础URL和可发布的密钥
const API_BASE_URL = process.env.NEXT_PUBLIC_TCB_API_URL || 'https://your-deployed-url.tcloudbase.com';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_TCB_PUBLISHABLE_KEY || 'your-publishable-api-key';

/**
 * 获取认证头
 * 优先使用本地存储的JWT令牌（如果用户已登录），
 * 否则回退到使用公共可发布密钥。
 * @returns {HeadersInit} 包含认证信息的Headers对象
 */
const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('user_jwt_token') : null;
  const apiKey = token || PUBLISHABLE_KEY;

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };
};

/**
 * 处理API响应的通用函数
 * @param {Response} response - fetch API的响应对象
 * @returns {Promise<any>} 解析后的JSON数据
 * @throws {Error} 如果响应状态码不是 2xx
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'An unknown API error occurred.' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

/**
 * 调用 /api/createUser 接口
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<any>} API的响应数据
 */
export const apiCreateUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/api/createUser`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
};

/**
 * 调用 /api/posts 接口
 * @param {string} [userId] - (可选) 要查询的用户的ID
 * @returns {Promise<any>} API的响应数据，包含帖子列表
 */
export const apiGetPosts = async (userId) => {
  const url = new URL(`${API_BASE_URL}/api/posts`);
  if (userId) {
    url.searchParams.append('userId', userId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

// --- 使用示例 ---
/*
async function exampleUsage() {
  try {
    // 创建用户
    const newUser = await apiCreateUser('test@example.com', 'securepassword123');
    console.log('User created:', newUser);

    // 获取所有帖子
    const allPosts = await apiGetPosts();
    console.log('All posts:', allPosts);

    // 获取特定用户的帖子
    const userPosts = await apiGetPosts('some-user-id');
    console.log('Posts by user:', userPosts);

  } catch (error) {
    console.error('API operation failed:', error.message);
  }
}
*/
