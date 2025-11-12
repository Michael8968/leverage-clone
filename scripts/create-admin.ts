/**
 * 创建管理员账户脚本
 * 
 * 使用方法：
 * npx tsx scripts/create-admin.ts --email admin@example.com --password yourpassword --name "管理员姓名"
 * 
 * 或使用环境变量：
 * ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword ADMIN_NAME="管理员" npx tsx scripts/create-admin.ts
 */

import bcrypt from 'bcryptjs';
import { initTcbApp, getTcbDb } from '../src/lib/tcb';

interface AdminData {
  email: string;
  password: string;
  name: string;
}

async function parseArgs(): Promise<AdminData> {
  const args = process.argv.slice(2);
  const data: Partial<AdminData> = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      data.email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      data.password = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      data.name = args[i + 1];
      i++;
    }
  }

  // Check environment variables as fallback
  const email = data.email || process.env.ADMIN_EMAIL;
  const password = data.password || process.env.ADMIN_PASSWORD;
  const name = data.name || process.env.ADMIN_NAME || '平台管理员';

  if (!email || !password) {
    console.error('❌ 错误: 必须提供邮箱和密码');
    console.log('\n使用方法:');
    console.log('  npx tsx scripts/create-admin.ts --email admin@example.com --password yourpassword --name "管理员姓名"');
    console.log('\n或使用环境变量:');
    console.log('  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourpassword npx tsx scripts/create-admin.ts');
    process.exit(1);
  }

  return { email, password, name };
}

async function createAdmin() {
  try {
    console.log('🚀 开始创建管理员账户...\n');

    const { email, password, name } = await parseArgs();

    // Initialize TCB
    console.log('📡 连接到腾讯云数据库...');
    initTcbApp();
    const db = getTcbDb();

    if (!db) {
      throw new Error('无法连接到数据库，请检查环境变量配置');
    }

    // Check if admin already exists
    console.log('🔍 检查管理员是否已存在...');
    const existingAdmin = await db
      .collection('users')
      .where({ email })
      .get();

    if (existingAdmin.data && existingAdmin.data.length > 0) {
      const user = existingAdmin.data[0];
      if (user.role === 'admin') {
        console.log('⚠️  该邮箱已注册为管理员账户');
        process.exit(0);
      } else {
        console.log('⚠️  该邮箱已被注册（非管理员账户）');
        console.log('   如需将其升级为管理员，请使用: scripts/upgrade-to-admin.ts');
        process.exit(1);
      }
    }

    // Hash password
    console.log('🔐 加密密码...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    console.log('✍️  创建管理员账户...');
    const result = await db.collection('users').add({
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      gender: 'other',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (result.id) {
      console.log('\n✅ 管理员账户创建成功！');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📧 邮箱: ${email}`);
      console.log(`👤 姓名: ${name}`);
      console.log(`🆔 用户ID: ${result.id}`);
      console.log(`🔑 角色: 平台管理员`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 提示: 请使用此邮箱和密码登录系统');
    } else {
      throw new Error('创建管理员失败：未返回用户ID');
    }

  } catch (error) {
    console.error('\n❌ 创建管理员失败:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the script
createAdmin();
