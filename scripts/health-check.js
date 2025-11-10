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

// 快速检查的端点
const HEALTH_CHECK_ENDPOINTS = [
  {
    name: 'getPlatformAssets',
    endpoint: '/api/v1/admin/getPlatformAssets',
    method: 'POST',
    data: {}
  },
  {
    name: 'getPrompts',
    endpoint: '/api/v1/admin/getPrompts',
    method: 'POST',
    data: {}
  },
  {
    name: 'getProductRecommendations',
    endpoint: '/api/v1/business/getProductRecommendations',
    method: 'POST',
    data: { userId: 'test-user-123', preferences: { category: 'test' } }
  }
];

async function healthCheck() {
  console.log('🏥 TCB API 快速健康检查\n');
  console.log(`📍 目标环境: ${CONFIG.baseURL}`);
  console.log(`🔑 JWT Token: ${CONFIG.jwtToken ? '已配置' : '未配置'}\n`);

  let passed = 0;
  let failed = 0;

  for (const endpoint of HEALTH_CHECK_ENDPOINTS) {
    try {
      console.log(`🔍 检查端点: ${endpoint.name}`);

      const startTime = Date.now();
      const response = await apiClient.request({
        url: endpoint.endpoint,
        method: endpoint.method,
        data: endpoint.data
      });
      const duration = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        console.log(`✅ ${endpoint.name}: ${response.status} (${duration}ms)`);
        passed++;
      } else {
        console.log(`⚠️  ${endpoint.name}: ${response.status} - 响应格式异常`);
        failed++;
      }

    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.code || 'ERROR'} - ${error.message}`);
      failed++;
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