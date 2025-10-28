/**
 * 测试脚本：验证TCB数据库连接和用户注册/登录功能
 * 测试内容：
 * 1. 验证TCB数据库连接
 * 2. 测试用户注册功能
 * 3. 测试用户登录功能
 * 4. 测试平台管理员数量限制
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  error?: any;
}

const results: TestResult[] = [];

// 生成随机邮箱
function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

async function testTcbConnection() {
  console.log('🔍 测试 1: 验证TCB数据库连接...\n');
  
  try {
    // 通过API测试数据库连接
    const res = await fetch(`${BASE_URL}/api/users?limit=1`);
    const data = await res.json();
    
    if (res.ok && data.items !== undefined) {
      console.log('✓ TCB数据库连接成功');
      results.push({
        name: 'TCB数据库连接',
        passed: true,
        message: `成功获取用户数据，当前用户总数: ${data.total || data.items?.length || 0}`
      });
      return true;
    } else {
      throw new Error(`数据库查询失败: ${data.error || '未知错误'}`);
    }
  } catch (error: any) {
    console.error('✗ TCB数据库连接失败:', error.message);
    results.push({
      name: 'TCB数据库连接',
      passed: false,
      message: error.message,
      error
    });
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n🔍 测试 2: 用户注册功能...\n');
  
  const testEmail = generateTestEmail();
  const testUser = {
    email: testEmail,
    password: 'Test123456!',
    name: '测试用户',
    role: 'user'
  };

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    const data = await res.json();

    if (res.ok && data.token && data.user) {
      console.log('✓ 用户注册成功');
      console.log(`  - 邮箱: ${data.user.email}`);
      console.log(`  - 用户ID: ${data.user.uid}`);
      console.log(`  - 角色: ${data.user.role}`);
      console.log(`  - Token: ${data.token.substring(0, 20)}...`);
      
      results.push({
        name: '用户注册',
        passed: true,
        message: `成功注册用户: ${testEmail}`
      });
      return { email: testEmail, password: testUser.password, token: data.token };
    } else {
      throw new Error(data.error || '注册失败');
    }
  } catch (error: any) {
    console.error('✗ 用户注册失败:', error.message);
    results.push({
      name: '用户注册',
      passed: false,
      message: error.message,
      error
    });
    return null;
  }
}

async function testUserLogin(credentials: { email: string; password: string } | null) {
  console.log('\n🔍 测试 3: 用户登录功能...\n');
  
  if (!credentials) {
    console.log('⊘ 跳过登录测试（注册失败）');
    results.push({
      name: '用户登录',
      passed: false,
      message: '跳过测试：依赖注册测试'
    });
    return null;
  }

  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await res.json();

    if (res.ok && data.token && data.user) {
      console.log('✓ 用户登录成功');
      console.log(`  - 邮箱: ${data.user.email}`);
      console.log(`  - 用户ID: ${data.user.uid}`);
      console.log(`  - 角色: ${data.user.role}`);
      console.log(`  - Token: ${data.token.substring(0, 20)}...`);
      
      results.push({
        name: '用户登录',
        passed: true,
        message: `成功登录用户: ${credentials.email}`
      });
      return data.token;
    } else {
      throw new Error(data.error || '登录失败');
    }
  } catch (error: any) {
    console.error('✗ 用户登录失败:', error.message);
    results.push({
      name: '用户登录',
      passed: false,
      message: error.message,
      error
    });
    return null;
  }
}

async function testAdminRegistrationLimit() {
  console.log('\n🔍 测试 4: 平台管理员数量限制...\n');
  
  try {
    // 先检查当前管理员数量
    const countRes = await fetch(`${BASE_URL}/api/users?role=admin&limit=100`);
    const countData = await countRes.json();
    const adminCount = countData.items?.length || countData.total || 0;
    
    console.log(`  当前管理员数量: ${adminCount}/10`);

    // 如果未达上限，测试注册新管理员
    if (adminCount < 10) {
      const testEmail = generateTestEmail();
      const adminRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Admin123456!',
          name: '测试管理员',
          role: 'admin'
        })
      });

      const adminData = await adminRes.json();

      if (adminRes.ok) {
        console.log('✓ 管理员注册成功（未达上限）');
        results.push({
          name: '管理员数量限制（未达上限）',
          passed: true,
          message: `成功注册管理员，当前数量: ${adminCount + 1}/10`
        });
      } else {
        throw new Error(adminData.error || '管理员注册失败');
      }
    } else {
      // 达到上限，测试是否正确拒绝
      const testEmail = generateTestEmail();
      const limitRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'Admin123456!',
          name: '超限测试管理员',
          role: 'admin'
        })
      });

      const limitData = await limitRes.json();

      if (limitRes.status === 403 && limitData.error?.includes('上限')) {
        console.log('✓ 正确拒绝超限管理员注册');
        results.push({
          name: '管理员数量限制（已达上限）',
          passed: true,
          message: '正确拒绝了超出上限的管理员注册'
        });
      } else {
        throw new Error(`上限验证失败: 状态=${limitRes.status}, 消息=${limitData.error}`);
      }
    }
  } catch (error: any) {
    console.error('✗ 管理员数量限制测试失败:', error.message);
    results.push({
      name: '管理员数量限制',
      passed: false,
      message: error.message,
      error
    });
  }
}

async function testDuplicateEmailRegistration(email: string) {
  console.log('\n🔍 测试 5: 重复邮箱注册验证...\n');
  
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'Test123456!',
        name: '重复用户',
        role: 'user'
      })
    });

    const data = await res.json();

    if (res.status === 409 && data.error?.includes('已注册')) {
      console.log('✓ 正确拒绝重复邮箱注册');
      results.push({
        name: '重复邮箱验证',
        passed: true,
        message: '正确拒绝了重复邮箱注册'
      });
    } else {
      throw new Error(`重复邮箱验证失败: 状态=${res.status}, 应为409`);
    }
  } catch (error: any) {
    console.error('✗ 重复邮箱验证失败:', error.message);
    results.push({
      name: '重复邮箱验证',
      passed: false,
      message: error.message,
      error
    });
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TCB 数据库连接与用户认证功能全栈测试                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 测试 1: TCB连接
  const dbConnected = await testTcbConnection();
  
  if (!dbConnected) {
    console.log('\n❌ 数据库连接失败，终止后续测试');
    printSummary();
    process.exit(1);
  }

  // 测试 2: 用户注册
  const credentials = await testUserRegistration();

  // 测试 3: 用户登录
  await testUserLogin(credentials);

  // 测试 4: 管理员数量限制
  await testAdminRegistrationLimit();

  // 测试 5: 重复邮箱验证
  if (credentials) {
    await testDuplicateEmailRegistration(credentials.email);
  }

  // 输出测试摘要
  printSummary();
}

function printSummary() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   测试摘要                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    const status = r.passed ? '通过' : '失败';
    console.log(`${icon} ${r.name}: ${status}`);
    console.log(`   ${r.message}`);
    if (r.error) {
      console.log(`   错误详情: ${r.error.message || r.error}`);
    }
    console.log('');
  });

  console.log('─────────────────────────────────────────────────────────────');
  console.log(`总计: ${passed}/${total} 通过 (${Math.round(passed/total*100)}%)`);
  console.log('─────────────────────────────────────────────────────────────\n');

  if (passed === total) {
    console.log('🎉 所有测试通过！TCB数据库连接和用户认证功能运行正常。\n');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败，请检查上述错误信息。\n');
    process.exit(1);
  }
}

// 运行所有测试
runAllTests().catch(err => {
  console.error('\n❌ 测试脚本执行失败:', err);
  console.error(err.stack);
  process.exit(1);
});
