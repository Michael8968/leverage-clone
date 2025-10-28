/**
 * 简单的TCB连接测试
 */

async function testConnection() {
  console.log('Testing TCB connection...\n');
  
  // 动态导入以避免在模块加载时就连接数据库
  const { getTcbDb, getTcbApp } = await import('../src/lib/tcb.js');
  
  try {
    console.log('Environment variables:');
    console.log('  TCB_ENV_ID:', process.env.TCB_ENV_ID || '(not set)');
    console.log('  CLOUDBASE_SECRET_ID:', process.env.CLOUDBASE_SECRET_ID ? '✓ set' : '✗ not set');
    console.log('  CLOUDBASE_SECRET_KEY:', process.env.CLOUDBASE_SECRET_KEY ? '✓ set' : '✗ not set');
    console.log('');
    
    const app = getTcbApp();
    console.log('✓ TCB App initialized');
    
    const db = getTcbDb();
    console.log('✓ TCB Database instance obtained');
    console.log('');
    
    // 测试查询用户集合
    console.log('Testing users collection query...');
    const result = await db.collection('users').where({ role: 'admin' }).get();
    console.log('✓ Query successful');
    console.log(`  Admin users found: ${result?.data?.length || 0}`);
    
    if (result?.data?.length > 0) {
      console.log('\nFirst admin user:');
      const user = result.data[0];
      console.log('  Name:', user.name);
      console.log('  Email:', user.email);
      console.log('  UID:', user.uid);
    }
    
    console.log('\n✅ TCB connection test passed!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ TCB connection test failed:');
    console.error('  Error:', error.message);
    console.error('  Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
