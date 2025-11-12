/**
 * 将现有用户升级为管理员脚本
 * 
 * 使用方法：
 * npx tsx scripts/upgrade-to-admin.ts --email user@example.com
 * 
 * 或使用环境变量：
 * USER_EMAIL=user@example.com npx tsx scripts/upgrade-to-admin.ts
 */

import { initTcbApp, getTcbDb } from '../src/lib/tcb';

async function parseEmail(): Promise<string> {
  const args = process.argv.slice(2);
  let email = '';

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      break;
    }
  }

  // Check environment variable as fallback
  email = email || process.env.USER_EMAIL || '';

  if (!email) {
    console.error('❌ 错误: 必须提供用户邮箱');
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/upgrade-to-admin.ts --email user@example.com');
    console.log('\n或使用环境变量:');
    console.log('  USER_EMAIL=user@example.com npx tsx scripts/upgrade-to-admin.ts');
    process.exit(1);
  }

  return email;
}

async function upgradeToAdmin() {
  try {
    console.log('🚀 开始升级用户为管理员...\n');

    const email = await parseEmail();

    // Initialize TCB
    console.log('📡 连接到腾讯云数据库...');
    initTcbApp();
    const db = getTcbDb();

    if (!db) {
      throw new Error('无法连接到数据库，请检查环境变量配置');
    }

    // Find user
    console.log('🔍 查找用户...');
    const users = await db
      .collection('users')
      .where({ email })
      .get();

    if (!users.data || users.data.length === 0) {
      console.error(`❌ 未找到邮箱为 ${email} 的用户`);
      process.exit(1);
    }

    const user = users.data[0];

    if (user.role === 'admin') {
      console.log('ℹ️  该用户已经是管理员');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 邮箱: ${user.email}`);
      console.log(`👤 姓名: ${user.name}`);
      console.log(`🆔 用户ID: ${user._id}`);
      console.log(`🔑 角色: ${user.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      process.exit(0);
    }

    // Upgrade to admin
    console.log(`✍️  将用户 ${user.name} (${user.email}) 升级为管理员...`);
    await db
      .collection('users')
      .doc(user._id)
      .update({
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });

    console.log('\n✅ 用户已成功升级为管理员！');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 邮箱: ${user.email}`);
    console.log(`👤 姓名: ${user.name}`);
    console.log(`🆔 用户ID: ${user._id}`);
    console.log(`🔑 旧角色: ${user.role}`);
    console.log(`🔑 新角色: admin (平台管理员)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ 升级管理员失败:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
upgradeToAdmin();
