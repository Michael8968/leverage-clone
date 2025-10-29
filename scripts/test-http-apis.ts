/**
 * 测试HTTP API端点的注册和登录功能
 */

async function testHttpApis() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        HTTP API 端点测试                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
  console.log(`测试环境: ${BASE_URL}\n`);

  const results: any[] = [];

  // 测试数据
  const testUser = {
    email: `api-test-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: 'API测试用户',
    role: 'user'
  };

  // === 测试1: 健康检查 ===
  console.log('📋 测试 1: 服务器健康检查\n');
  console.log('─────────────────────────────────────────────────────────────────');
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (response.ok) {
      console.log('✓ 服务器响应正常');
      results.push({ name: '健康检查', passed: true, message: '服务器运行正常' });
    } else {
      console.log('⚠ 健康检查端点不存在（正常情况）');
      results.push({ name: '健康检查', passed: true, message: '跳过（端点不存在）' });
    }
  } catch (error: any) {
    console.log(`⚠ 无法连接到服务器: ${error.message}`);
    results.push({ name: '健康检查', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试2: 用户注册API ===
  console.log('📋 测试 2: 用户注册API\n');
  console.log('─────────────────────────────────────────────────────────────────');
  let registeredToken = '';
  try {
    console.log(`POST ${BASE_URL}/api/auth/register`);
    console.log(`数据: ${JSON.stringify(testUser, null, 2)}\n`);
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const contentType = response.headers.get('content-type');
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}\n`);

    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error(`✗ 响应不是JSON格式:`);
      console.error(`  前100个字符: ${text.substring(0, 100)}\n`);
      results.push({ 
        name: '用户注册API', 
        passed: false, 
        message: '响应不是JSON格式，服务器可能未正确加载环境变量' 
      });
    } else {
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`✗ 注册失败: ${data.error || '未知错误'}\n`);
        results.push({ name: '用户注册API', passed: false, message: data.error || '注册失败' });
      } else {
        console.log(`✓ 注册成功`);
        console.log(`  用户: ${data.user?.name}`);
        console.log(`  邮箱: ${data.user?.email}`);
        console.log(`  角色: ${data.user?.role}`);
        console.log(`  Token: ${data.token?.substring(0, 30)}...\n`);
        
        registeredToken = data.token;
        results.push({ 
          name: '用户注册API', 
          passed: true, 
          message: `成功注册: ${testUser.email}` 
        });
      }
    }
  } catch (error: any) {
    console.error(`✗ 请求异常: ${error.message}\n`);
    results.push({ name: '用户注册API', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试3: 用户登录API ===
  console.log('📋 测试 3: 用户登录API\n');
  console.log('─────────────────────────────────────────────────────────────────');
  try {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };

    console.log(`POST ${BASE_URL}/api/auth/login`);
    console.log(`数据: ${JSON.stringify(loginData, null, 2)}\n`);
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    const contentType = response.headers.get('content-type');
    console.log(`响应状态: ${response.status} ${response.statusText}`);
    console.log(`Content-Type: ${contentType}\n`);

    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error(`✗ 响应不是JSON格式:`);
      console.error(`  前100个字符: ${text.substring(0, 100)}\n`);
      results.push({ 
        name: '用户登录API', 
        passed: false, 
        message: '响应不是JSON格式，服务器可能未正确加载环境变量' 
      });
    } else {
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`✗ 登录失败: ${data.error || '未知错误'}\n`);
        results.push({ name: '用户登录API', passed: false, message: data.error || '登录失败' });
      } else {
        console.log(`✓ 登录成功`);
        console.log(`  用户: ${data.user?.name}`);
        console.log(`  邮箱: ${data.user?.email}`);
        console.log(`  角色: ${data.user?.role}`);
        console.log(`  Token: ${data.token?.substring(0, 30)}...\n`);
        
        results.push({ 
          name: '用户登录API', 
          passed: true, 
          message: `成功登录: ${testUser.email}` 
        });
      }
    }
  } catch (error: any) {
    console.error(`✗ 请求异常: ${error.message}\n`);
    results.push({ name: '用户登录API', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 测试4: 重复邮箱注册 ===
  console.log('📋 测试 4: 重复邮箱注册验证\n');
  console.log('─────────────────────────────────────────────────────────────────');
  try {
    console.log(`POST ${BASE_URL}/api/auth/register`);
    console.log(`使用相同邮箱: ${testUser.email}\n`);
    
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const data = await response.json();
    
    if (response.status === 409 && data.error?.includes('邮箱已注册')) {
      console.log(`✓ 正确拒绝重复邮箱注册`);
      console.log(`  错误信息: ${data.error}\n`);
      results.push({ 
        name: '重复邮箱验证', 
        passed: true, 
        message: '正确拒绝重复注册' 
      });
    } else {
      console.error(`✗ 未能正确拒绝重复邮箱: ${response.status}\n`);
      results.push({ 
        name: '重复邮箱验证', 
        passed: false, 
        message: '重复邮箱未被拒绝' 
      });
    }
  } catch (error: any) {
    console.error(`✗ 请求异常: ${error.message}\n`);
    results.push({ name: '重复邮箱验证', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // 打印结果
  printResultsForHttpApis(results);
}

function printResultsForHttpApis(results: any[]) {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        测试摘要                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((r, idx) => {
    const icon = r.passed ? '✓' : '✗';
    const status = r.passed ? '通过' : '失败';
    console.log(`${idx + 1}. ${icon} ${r.name}: ${status}`);
    console.log(`   ${r.message}`);
    console.log();
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`总计: ${passed}/${total} 通过 (${Math.round(passed/total*100)}%)`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('🎉 所有HTTP API测试通过！\n');
    process.exit(0);
  } else {
    console.log('⚠ 部分HTTP API测试失败。\n');
    console.log('💡 提示: 如果看到"响应不是JSON格式"错误，请重启开发服务器：');
    console.log('   1. 停止当前dev服务器');
    console.log('   2. 重新运行: npm run dev\n');
    process.exit(1);
  }
}

testHttpApis().catch(err => {
  console.error('\n❌ 测试执行异常:', err);
  console.error(err.stack);
  process.exit(1);
});
