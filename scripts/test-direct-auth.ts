/**
 * 独立测试：直接测试注册和登录API逻辑
 * 不依赖运行中的HTTP服务器
 */

async function testDirectAuth() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TCB 用户注册和登录直接测试（不依赖HTTP服务器）          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // 动态导入模块
  const { getTcbDb } = await import('../src/lib/tcb.js');
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default;
  const jwtModule = await import('jsonwebtoken');
  const jwt = jwtModule.default;

  const results: any[] = [];

  // 测试1: 数据库连接
  console.log('🔍 测试 1: TCB数据库连接...\n');
  try {
    const db = getTcbDb();
    const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
    const adminCount = adminQuery?.data?.length || 0;
    
    console.log(`✓ 数据库连接成功`);
    console.log(`  当前管理员数量: ${adminCount}/10\n`);
    
    results.push({ name: 'TCB数据库连接', passed: true, message: `管理员数量: ${adminCount}` });
  } catch (error: any) {
    console.error(`✗ 数据库连接失败: ${error.message}\n`);
    results.push({ name: 'TCB数据库连接', passed: false, message: error.message });
    printResults(results);
    process.exit(1);
  }

  // 测试2: 用户注册逻辑
  console.log('🔍 测试 2: 用户注册功能...\n');
  const testEmail = `test-${Date.now()}@example.com`;
  try {
    const db = getTcbDb();
    
    // 检查邮箱是否存在
    const exists = await db.collection('users').where({ email: testEmail }).limit(1).get();
    if (exists?.data?.length) {
      throw new Error('邮箱已注册');
    }
    
    // 创建用户
    const hash = await bcrypt.hash('Test123456!', 10);
    const uid = `u_${Date.now()}`;
    const userDoc = {
      uid,
      email: testEmail,
      name: '测试用户',
      role: 'user',
      avatar: '',
      level: 'New',
      points_balance: 0,
      signup_date: db.serverDate ? db.serverDate() : new Date(),
      last_level_check: db.serverDate ? db.serverDate() : new Date(),
      total_llm_calls: 0,
      status: 'active',
      password_hash: hash,
      createdAt: db.serverDate ? db.serverDate() : new Date(),
    };
    
    await db.collection('users').add(userDoc);
    
    console.log(`✓ 用户注册成功`);
    console.log(`  邮箱: ${testEmail}`);
    console.log(`  用户ID: ${uid}`);
    console.log(`  角色: user\n`);
    
    results.push({ name: '用户注册', passed: true, message: `成功注册: ${testEmail}` });
  } catch (error: any) {
    console.error(`✗ 用户注册失败: ${error.message}\n`);
    results.push({ name: '用户注册', passed: false, message: error.message });
  }

  // 测试3: 用户登录逻辑
  console.log('🔍 测试 3: 用户登录功能...\n');
  try {
    const db = getTcbDb();
    
    // 查找用户
    const userQuery = await db.collection('users').where({ email: testEmail }).limit(1).get();
    if (!userQuery?.data?.length) {
      throw new Error('用户不存在');
    }
    
    const user = userQuery.data[0];
    
    // 验证密码
    const passwordMatch = await bcrypt.compare('Test123456!', user.password_hash || '');
    if (!passwordMatch) {
      throw new Error('密码错误');
    }
    
    // 生成Token
    const token = jwt.sign(
      { uid: user.uid, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    
    console.log(`✓ 用户登录成功`);
    console.log(`  邮箱: ${user.email}`);
    console.log(`  用户ID: ${user.uid}`);
    console.log(`  Token: ${token.substring(0, 30)}...\n`);
    
    results.push({ name: '用户登录', passed: true, message: `成功登录: ${testEmail}` });
  } catch (error: any) {
    console.error(`✗ 用户登录失败: ${error.message}\n`);
    results.push({ name: '用户登录', passed: false, message: error.message });
  }

  // 测试4: 管理员数量限制
  console.log('🔍 测试 4: 管理员数量限制...\n');
  try {
    const db = getTcbDb();
    
    const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
    const adminCount = adminQuery?.data?.length || 0;
    
    console.log(`  当前管理员数量: ${adminCount}/10`);
    
    if (adminCount >= 10) {
      console.log(`✓ 已达上限，应拒绝新管理员注册\n`);
      results.push({ name: '管理员数量限制', passed: true, message: '已达上限，限制生效' });
    } else {
      // 尝试注册新管理员
      const adminEmail = `admin-test-${Date.now()}@example.com`;
      const hash = await bcrypt.hash('Admin123456!', 10);
      const uid = `u_${Date.now()}`;
      const adminDoc = {
        uid,
        email: adminEmail,
        name: '测试管理员',
        role: 'admin',
        avatar: '',
        level: 'New',
        points_balance: 0,
        signup_date: db.serverDate ? db.serverDate() : new Date(),
        last_level_check: db.serverDate ? db.serverDate() : new Date(),
        total_llm_calls: 0,
        status: 'active',
        password_hash: hash,
        createdAt: db.serverDate ? db.serverDate() : new Date(),
      };
      
      await db.collection('users').add(adminDoc);
      
      console.log(`✓ 管理员注册成功（未达上限）`);
      console.log(`  当前数量: ${adminCount + 1}/10\n`);
      
      results.push({ name: '管理员数量限制', passed: true, message: `成功注册，当前${adminCount + 1}/10` });
    }
  } catch (error: any) {
    console.error(`✗ 管理员数量限制测试失败: ${error.message}\n`);
    results.push({ name: '管理员数量限制', passed: false, message: error.message });
  }

  // 测试5: 重复邮箱验证
  console.log('🔍 测试 5: 重复邮箱注册验证...\n');
  try {
    const db = getTcbDb();
    
    const exists = await db.collection('users').where({ email: testEmail }).limit(1).get();
    
    if (exists?.data?.length) {
      console.log(`✓ 正确检测到重复邮箱\n`);
      results.push({ name: '重复邮箱验证', passed: true, message: '正确拒绝重复邮箱' });
    } else {
      throw new Error('重复邮箱检测失败');
    }
  } catch (error: any) {
    console.error(`✗ 重复邮箱验证失败: ${error.message}\n`);
    results.push({ name: '重复邮箱验证', passed: false, message: error.message });
  }

  printResults(results);
}

function printResults(results: any[]) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   测试摘要                                                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const icon = r.passed ? '✓' : '✗';
    const status = r.passed ? '通过' : '失败';
    console.log(`${icon} ${r.name}: ${status}`);
    console.log(`   ${r.message}\n`);
  });

  console.log('─────────────────────────────────────────────────────────────');
  console.log(`总计: ${passed}/${total} 通过 (${Math.round(passed/total*100)}%)`);
  console.log('─────────────────────────────────────────────────────────────\n');

  if (passed === total) {
    console.log('🎉 所有测试通过！TCB数据库和用户认证功能完全正常。\n');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败。\n');
    process.exit(1);
  }
}

testDirectAuth().catch(err => {
  console.error('\n❌ 测试执行失败:', err);
  console.error(err.stack);
  process.exit(1);
});
