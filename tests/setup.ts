/**
 * @file tests/setup.ts
 * @description Jest 测试环境配置
 */

import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 全局测试超时设置
jest.setTimeout(30000);

// 模拟 fetch（如果使用 Node 18+）
global.fetch = fetch;

// 全局测试钩子
beforeAll(() => {
  console.log('🧪 开始运行集成测试');
});

afterAll(() => {
  console.log('✅ 集成测试完成');
});
