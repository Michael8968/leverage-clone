#!/usr/bin/env node

/**
 * API 路由快速测试脚本
 * 测试关键 API 端点是否正常响应
 */

async function testApiRoutes() {
  console.log('🧪 开始测试关键 API 路由...\n');

  const baseUrl = 'http://localhost:3000';
  const tests = [
    {
      name: '健康检查',
      method: 'GET',
      url: `${baseUrl}/api/health`,
      expectedStatus: 200
    },
    {
      name: '获取产品列表',
      method: 'GET', 
      url: `${baseUrl}/api/products`,
      expectedStatus: 200
    },
    {
      name: '获取用户列表',
      method: 'GET',
      url: `${baseUrl}/api/users`,
      expectedStatus: 200
    },
    {
      name: '获取需求列表',
      method: 'GET',
      url: `${baseUrl}/api/demands`,
      expectedStatus: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📡 测试: ${test.name}`);
      console.log(`   ${test.method} ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const statusOk = response.status === test.expectedStatus;
      
      if (statusOk) {
        console.log(`   ✅ 状态码: ${response.status}`);
        
        // 尝试解析响应
        try {
          const data = await response.json();
          console.log(`   📊 响应数据: ${JSON.stringify(data).substring(0, 100)}...`);
        } catch (e) {
          console.log(`   ⚠️  无法解析 JSON 响应`);
        }
        
        passed++;
      } else {
        console.log(`   ❌ 状态码: ${response.status} (期望: ${test.expectedStatus})`);
        failed++;
      }

    } catch (error) {
      console.log(`   ❌ 请求失败: ${error.message}`);
      failed++;
    }

    console.log();
  }

  console.log('='.repeat(60));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败\n`);

  if (failed === 0) {
    console.log('🎉 所有 API 路由测试通过！');
    return true;
  } else {
    console.log('⚠️  部分 API 路由测试失败，请检查日志。');
    return false;
  }
}

if (require.main === module) {
  // 等待服务器启动
  console.log('⏳ 等待开发服务器就绪...\n');
  
  setTimeout(() => {
    testApiRoutes().then(success => {
      process.exit(success ? 0 : 1);
    });
  }, 2000);
}

module.exports = { testApiRoutes };
