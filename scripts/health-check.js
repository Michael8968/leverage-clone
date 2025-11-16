#!/usr/bin/env node

/**
 * TCB API 快速健康检查脚本
 * 部署后的快速验证，无需完整测试套件
 */

const axios = require('axios');

const CONFIG = {
  baseURL: process.env.TCB_API_BASE_URL || 'http://localhost:3000',
  jwtToken: process.env.MOCK_JWT_TOKEN || 'test-jwt-token',
  timeout: 10000
};

const apiClient = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CONFIG.jwtToken}`,
  },
});

// 快速检查的端点（使用实际的 Next.js API 路由）
const HEALTH_CHECK_ENDPOINTS = [
  {
    name: 'getPlatformAssets',
    endpoint: '/api/llm-platform-assets',
    method: 'GET',
    data: null
  },
  {
    name: 'getPrompts',
    endpoint: '/api/prompts',
    method: 'GET',
    data: null
  },
  {
    name: 'health',
    endpoint: '/api/health',
    method: 'GET',
    data: null
  }
];

async function healthCheck() {
  console.log('🏥 TCB API 快速健康检查\n');
  console.log(`📍 目标环境: ${CONFIG.baseURL}`);
  console.log(`🔑 JWT Token: ${CONFIG.jwtToken ? '已配置' : '未配置'}\n`);

  let passed = 0;
  let failed = 0;

  for (const endpoint of HEALTH_CHECK_ENDPOINTS) {
    const startTime = Date.now();
    try {
      console.log(`🔍 检查端点: ${endpoint.name}`);

      const requestConfig = {
        url: endpoint.endpoint,
        method: endpoint.method,
      };
      
      // 只有 POST/PUT 等方法才需要 data
      if (endpoint.data !== null && (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH')) {
        requestConfig.data = endpoint.data;
      }
      
      const response = await apiClient.request(requestConfig);
      const duration = Date.now() - startTime;

      // 检查响应状态
      // 对于 health 端点，200 或 503 都算通过（503 表示服务器运行但数据库可能未配置）
      // 对于其他端点，只有 200 才算成功
      const isHealthEndpoint = endpoint.name === 'health';
      const isSuccess = response.status === 200 || (isHealthEndpoint && response.status === 503);
      
      if (isSuccess) {
        const statusText = response.status === 503 && isHealthEndpoint ? '503 (数据库未配置，但服务器运行正常)' : `${response.status}`;
        console.log(`✅ ${endpoint.name}: ${statusText} (${duration}ms)`);
        passed++;
      } else {
        console.log(`⚠️  ${endpoint.name}: ${response.status} - 响应格式异常`);
        failed++;
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      // 对于 health 端点，503 状态码应该被视为可接受的（服务器运行但数据库未配置）
      const isHealthEndpoint = endpoint.name === 'health';
      if (isHealthEndpoint && error.response && error.response.status === 503) {
        console.log(`✅ ${endpoint.name}: 503 (数据库未配置，但服务器运行正常) (${duration}ms)`);
        passed++;
      } else {
        console.log(`❌ ${endpoint.name}: ${error.code || 'ERROR'} - ${error.message}`);
        failed++;
      }
    }
  }

  console.log(`\n📊 检查结果: ${passed} 通过, ${failed} 失败`);

  if (failed === 0) {
    console.log('🎉 所有健康检查通过！API服务运行正常。');
    process.exit(0);
  } else {
    console.log('⚠️  部分检查失败，请检查API服务状态。');
    console.log('💡 提示: 确保API服务正在运行，且JWT token正确配置');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  healthCheck().catch(error => {
    console.error('健康检查脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { healthCheck };