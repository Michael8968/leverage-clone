#!/usr/bin/env node

/**
 * 快速 TCB 连接测试脚本
 */

const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config({ path: '.env.local' });

async function quickTest() {
  console.log('🔍 TCB 快速连接测试...\n');

  console.log('📋 环境变量检查:');
  console.log('  TCB_ENV_ID:', process.env.TCB_ENV_ID || '❌ 未设置');
  console.log('  TCB_SECRET_ID:', process.env.TCB_SECRET_ID ? '✅ 已设置' : '❌ 未设置');
  console.log('  TCB_SECRET_KEY:', process.env.TCB_SECRET_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('  TENCENTCLOUD_REGION:', process.env.TENCENTCLOUD_REGION || '❌ 未设置');
  console.log();

  try {
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY,
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai'
    });

    const db = app.database();
    console.log('✅ TCB SDK 初始化成功\n');

    // 测试 users 集合
    console.log('📊 测试 users 集合...');
    const usersResult = await db.collection('users').limit(1).get();
    console.log(`  ✅ users 集合可访问 (${usersResult.data.length} 条记录)\n`);

    // 测试 products 集合
    console.log('📊 测试 products 集合...');
    const productsResult = await db.collection('products').limit(1).get();
    console.log(`  ✅ products 集合可访问 (${productsResult.data.length} 条记录)\n`);

    // 测试 demands 集合
    console.log('📊 测试 demands 集合...');
    const demandsResult = await db.collection('demands').limit(1).get();
    console.log(`  ✅ demands 集合可访问 (${demandsResult.data.length} 条记录)\n`);

    console.log('🎉 所有测试通过！TCB 连接正常。');
    return true;

  } catch (error) {
    console.error('\n❌ TCB 连接测试失败:');
    console.error('  错误信息:', error.message);
    console.error('  完整错误:', error);
    return false;
  }
}

if (require.main === module) {
  quickTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { quickTest };
