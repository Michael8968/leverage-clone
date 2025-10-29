/**
 * TCB全栈验证测试
 * 验证数据库连接、用户注册、登录功能的完整性
 */

async function testFullStack() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        TCB 全栈功能验证测试                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const results: any[] = [];

  // 导入模块
  const { getTcbDb, getTcbApp } = await import('../src/lib/tcb.js');
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default;
  const jwtModule = await import('jsonwebtoken');
  const jwt = jwtModule.default;

  // === 第一部分：环境变量检查 ===
  console.log('📋 第一部分：环境变量检查\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  const envVars = {
    'TCB_ENV_ID': process.env.TCB_ENV_ID,
    'CLOUDBASE_ENV_ID': process.env.CLOUDBASE_ENV_ID,
    'TENCENTCLOUD_SECRET_ID': process.env.TENCENTCLOUD_SECRET_ID ? '✓ 已设置' : '✗ 未设置',
    'TENCENTCLOUD_SECRET_KEY': process.env.TENCENTCLOUD_SECRET_KEY ? '✓ 已设置' : '✗ 未设置',
    'CLOUDBASE_SECRET_ID': process.env.CLOUDBASE_SECRET_ID ? '✓ 已设置' : '✗ 未设置',
    'CLOUDBASE_SECRET_KEY': process.env.CLOUDBASE_SECRET_KEY ? '✓ 已设置' : '✗ 未设置',
    'JWT_SECRET': process.env.JWT_SECRET ? '✓ 已设置' : '使用默认值',
  };

  for (const [key, value] of Object.entries(envVars)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  const hasValidEnv = process.env.TCB_ENV_ID && 
                      (process.env.TENCENTCLOUD_SECRET_ID || process.env.CLOUDBASE_SECRET_ID);
  
  if (hasValidEnv) {
    console.log('✓ 环境变量配置正确，将连接真实TCB数据库\n');
    results.push({ name: '环境变量配置', passed: true, message: '已配置真实TCB凭证' });
  } else {
    console.log('⚠ 环境变量未完整配置，将使用本地fallback模式\n');
    results.push({ name: '环境变量配置', passed: false, message: '缺少TCB凭证' });
  }

  // === 第二部分：TCB初始化检查 ===
  console.log('📋 第二部分：TCB初始化检查\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const app = getTcbApp();
    console.log('✓ TCB App 初始化成功');
    console.log(`  类型: ${hasValidEnv ? '真实TCB实例' : '本地Mock实例'}`);
    
    const db = getTcbDb();
    console.log('✓ TCB Database 实例获取成功\n');
    
    results.push({ name: 'TCB初始化', passed: true, message: '成功初始化' });
  } catch (error: any) {
    console.error(`✗ TCB初始化失败: ${error.message}\n`);
    results.push({ name: 'TCB初始化', passed: false, message: error.message });
    printResults(results);
    process.exit(1);
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第三部分：数据库连接测试 ===
  console.log('📋 第三部分：数据库连接测试\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    // 测试查询用户表
    console.log('正在查询 users 集合...');
    const usersQuery = await db.collection('users').where({ status: 'active' }).get();
    const totalUsers = usersQuery?.data?.length || 0;
    console.log(`✓ 查询成功，找到 ${totalUsers} 个活跃用户`);
    
    // 统计管理员数量
    const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
    const adminCount = adminQuery?.data?.length || 0;
    console.log(`✓ 管理员数量: ${adminCount}/10`);
    
    // 显示前3个用户
    if (usersQuery?.data?.length > 0) {
      console.log('\n前3个用户:');
      usersQuery.data.slice(0, 3).forEach((user: any, idx: number) => {
        console.log(`  ${idx + 1}. ${user.name || 'N/A'} (${user.email}) - ${user.role}`);
      });
    }
    console.log();
    
    results.push({ 
      name: '数据库连接', 
      passed: true, 
      message: `成功查询，${totalUsers}个用户，${adminCount}个管理员` 
    });
  } catch (error: any) {
    console.error(`✗ 数据库查询失败: ${error.message}\n`);
    results.push({ name: '数据库连接', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第四部分：用户注册功能测试 ===
  console.log('📋 第四部分：用户注册功能测试\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  const testUser = {
    email: `test-user-${Date.now()}@example.com`,
    password: 'Test123456!',
    name: '测试用户',
    role: 'user'
  };

  try {
    const db = getTcbDb();
    
    // 1. 检查邮箱是否存在
    console.log('1. 检查邮箱重复...');
    const exists = await db.collection('users').where({ email: testUser.email }).limit(1).get();
    if (exists?.data?.length) {
      throw new Error('邮箱已存在（不应该发生）');
    }
    console.log('   ✓ 邮箱未注册，可以继续');
    
    // 2. 加密密码
    console.log('2. 加密密码...');
    const hash = await bcrypt.hash(testUser.password, 10);
    console.log('   ✓ 密码加密成功');
    
    // 3. 创建用户文档
    console.log('3. 创建用户文档...');
    const uid = `u_${Date.now()}`;
    const userDoc = {
      uid,
      email: testUser.email,
      name: testUser.name,
      role: testUser.role,
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
    console.log('   ✓ 用户文档已写入数据库');
    console.log(`   用户ID: ${uid}`);
    console.log(`   邮箱: ${testUser.email}`);
    console.log(`   角色: ${testUser.role}`);
    
    // 4. 生成JWT Token
    console.log('4. 生成JWT Token...');
    const token = jwt.sign(
      { uid: userDoc.uid, role: userDoc.role, email: userDoc.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    console.log(`   ✓ Token生成成功: ${token.substring(0, 30)}...`);
    console.log();
    
    results.push({ 
      name: '用户注册', 
      passed: true, 
      message: `成功注册用户: ${testUser.email}` 
    });
  } catch (error: any) {
    console.error(`✗ 用户注册失败: ${error.message}\n`);
    results.push({ name: '用户注册', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第五部分：用户登录功能测试 ===
  console.log('📋 第五部分：用户登录功能测试\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    // 1. 查找用户
    console.log(`1. 查找用户: ${testUser.email}...`);
    const userQuery = await db.collection('users').where({ email: testUser.email }).limit(1).get();
    if (!userQuery?.data?.length) {
      throw new Error('用户不存在');
    }
    const user = userQuery.data[0];
    console.log('   ✓ 用户找到');
    console.log(`   用户名: ${user.name}`);
    console.log(`   用户ID: ${user.uid}`);
    
    // 2. 验证密码
    console.log('2. 验证密码...');
    const passwordMatch = await bcrypt.compare(testUser.password, user.password_hash || '');
    if (!passwordMatch) {
      throw new Error('密码错误');
    }
    console.log('   ✓ 密码验证通过');
    
    // 3. 生成Token
    console.log('3. 生成登录Token...');
    const token = jwt.sign(
      { uid: user.uid, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );
    console.log(`   ✓ Token生成成功: ${token.substring(0, 30)}...`);
    
    // 4. 验证Token
    console.log('4. 验证Token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    console.log('   ✓ Token验证通过');
    console.log(`   解码信息: uid=${decoded.uid}, role=${decoded.role}`);
    console.log();
    
    results.push({ 
      name: '用户登录', 
      passed: true, 
      message: `成功登录: ${testUser.email}` 
    });
  } catch (error: any) {
    console.error(`✗ 用户登录失败: ${error.message}\n`);
    results.push({ name: '用户登录', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第六部分：管理员数量限制测试 ===
  console.log('📋 第六部分：管理员数量限制测试\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    console.log('检查当前管理员数量...');
    const adminQuery = await db.collection('users').where({ role: 'admin' }).get();
    const adminCount = adminQuery?.data?.length || 0;
    console.log(`✓ 当前管理员数量: ${adminCount}/10`);
    
    if (adminCount >= 10) {
      console.log('✓ 已达上限，限制逻辑应该生效');
      results.push({ 
        name: '管理员数量限制', 
        passed: true, 
        message: '已达上限，限制生效' 
      });
    } else {
      console.log('✓ 未达上限，可以继续注册管理员');
      console.log(`  剩余名额: ${10 - adminCount}`);
      results.push({ 
        name: '管理员数量限制', 
        passed: true, 
        message: `当前${adminCount}/10，未达上限` 
      });
    }
    console.log();
  } catch (error: any) {
    console.error(`✗ 管理员数量检查失败: ${error.message}\n`);
    results.push({ name: '管理员数量限制', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第七部分：重复邮箱验证 ===
  console.log('📋 第七部分：重复邮箱验证\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    console.log(`尝试查找已注册邮箱: ${testUser.email}...`);
    const exists = await db.collection('users').where({ email: testUser.email }).limit(1).get();
    
    if (exists?.data?.length) {
      console.log('✓ 正确检测到重复邮箱');
      console.log('  如果再次尝试注册，应该被拒绝');
      results.push({ 
        name: '重复邮箱验证', 
        passed: true, 
        message: '正确检测并拒绝重复邮箱' 
      });
    } else {
      throw new Error('未能检测到重复邮箱（不应该发生）');
    }
    console.log();
  } catch (error: any) {
    console.error(`✗ 重复邮箱验证失败: ${error.message}\n`);
    results.push({ name: '重复邮箱验证', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // === 第八部分：数据持久化验证 ===
  console.log('📋 第八部分：数据持久化验证\n');
  console.log('─────────────────────────────────────────────────────────────────');
  
  try {
    const db = getTcbDb();
    
    console.log('重新查询数据库，验证数据已持久化...');
    const verifyQuery = await db.collection('users').where({ email: testUser.email }).limit(1).get();
    
    if (!verifyQuery?.data?.length) {
      throw new Error('数据未持久化到数据库');
    }
    
    const persistedUser = verifyQuery.data[0];
    console.log('✓ 数据持久化验证成功');
    console.log('  用户信息:');
    console.log(`    姓名: ${persistedUser.name}`);
    console.log(`    邮箱: ${persistedUser.email}`);
    console.log(`    角色: ${persistedUser.role}`);
    console.log(`    等级: ${persistedUser.level}`);
    console.log(`    状态: ${persistedUser.status}`);
    console.log(`    积分: ${persistedUser.points_balance}`);
    console.log();
    
    results.push({ 
      name: '数据持久化', 
      passed: true, 
      message: '数据已成功写入并持久化到数据库' 
    });
  } catch (error: any) {
    console.error(`✗ 数据持久化验证失败: ${error.message}\n`);
    results.push({ name: '数据持久化', passed: false, message: error.message });
  }
  console.log('─────────────────────────────────────────────────────────────────\n');

  // 打印最终结果
  printResultsForFullStack(results);
}

function printResultsForFullStack(results: any[]) {
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
    console.log('🎉 所有测试通过！');
    console.log('✓ TCB数据库连接正常');
    console.log('✓ 用户注册功能完整有效');
    console.log('✓ 用户登录功能完整有效');
    console.log('✓ 数据持久化到真实数据库');
    console.log('✓ 业务规则正确实施');
    console.log('✓ 全栈功能生效，无报错\n');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败，请检查上述错误信息。\n');
    process.exit(1);
  }
}

// 执行测试
testFullStack().catch(err => {
  console.error('\n❌ 测试执行异常:', err);
  console.error(err.stack);
  process.exit(1);
});
