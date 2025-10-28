/**
 * 测试脚本：验证平台管理员注册功能
 * 1. 测试成功注册平台管理员
 * 2. 测试管理员数量限制（最多10个）
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

async function testAdminRegistration() {
  console.log('开始测试平台管理员注册功能...\n');

  // Test 1: 检查当前管理员数量
  try {
    const res = await fetch(`${BASE_URL}/api/users?role=admin&limit=100`);
    const data = await res.json();
    const adminCount = data.items?.length || data.total || 0;
    
    console.log(`✓ 当前平台管理员数量: ${adminCount}/10`);
    results.push({
      name: '获取当前管理员数量',
      passed: true,
      message: `当前有 ${adminCount} 个平台管理员`
    });

    // Test 2: 如果未达上限，测试注册新管理员
    if (adminCount < 10) {
      const testEmail = `admin-test-${Date.now()}@example.com`;
      const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'test123456',
          name: '测试管理员',
          role: 'admin'
        })
      });

      const registerData = await registerRes.json();

      if (registerRes.ok) {
        console.log('✓ 成功注册新的平台管理员');
        results.push({
          name: '注册新管理员',
          passed: true,
          message: `成功注册管理员账号: ${testEmail}`
        });
      } else {
        console.log(`✗ 注册失败: ${registerData.error}`);
        results.push({
          name: '注册新管理员',
          passed: false,
          message: registerData.error || '注册失败'
        });
      }
    } else {
      console.log('⊘ 跳过注册测试（已达上限）');
      
      // Test 3: 验证达到上限时的拒绝逻辑
      const testEmail = `admin-limit-test-${Date.now()}@example.com`;
      const limitRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'test123456',
          name: '超限测试管理员',
          role: 'admin'
        })
      });

      const limitData = await limitRes.json();

      if (limitRes.status === 403 && limitData.error?.includes('上限')) {
        console.log('✓ 正确拒绝了超出上限的管理员注册');
        results.push({
          name: '管理员数量限制验证',
          passed: true,
          message: '正确拒绝了超出上限的注册请求'
        });
      } else {
        console.log(`✗ 上限验证失败: 状态=${limitRes.status}, 消息=${limitData.error}`);
        results.push({
          name: '管理员数量限制验证',
          passed: false,
          message: '未正确拒绝超出上限的注册'
        });
      }
    }

  } catch (error: any) {
    console.error('✗ 测试过程中发生错误:', error.message);
    results.push({
      name: '整体测试流程',
      passed: false,
      message: error.message
    });
  }

  // 输出测试摘要
  console.log('\n=== 测试摘要 ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    console.log(`${icon} ${r.name}: ${r.message}`);
  });

  console.log(`\n总计: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('\n🎉 所有测试通过！');
    process.exit(0);
  } else {
    console.log('\n❌ 部分测试失败');
    process.exit(1);
  }
}

// 运行测试
testAdminRegistration().catch(err => {
  console.error('测试脚本执行失败:', err);
  process.exit(1);
});
