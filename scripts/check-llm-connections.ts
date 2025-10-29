#!/usr/bin/env tsx

/**
 * 检查LLM连接状态脚本
 */

import { getTcbDb } from '../src/lib/tcb.js';

async function checkLlmConnections() {
  console.log('🔍 检查LLM连接状态...\n');

  // 检查环境变量，决定使用本地还是远程数据库
  const hasRemoteCreds = process.env.TCB_ENV_ID && process.env.CLOUDBASE_SECRET_ID && process.env.CLOUDBASE_SECRET_KEY;

  if (!hasRemoteCreds) {
    console.log('📍 使用本地数据库模式\n');
  }

  try {
    const db = getTcbDb();
    console.log('✓ 数据库连接成功\n');

    // 获取所有LLM连接
    const result = await db.collection('llm_connections').get();
    const connections = result.data || [];

    console.log(`📊 找到 ${connections.length} 个LLM连接\n`);

    if (connections.length === 0) {
      console.log('❌ 没有找到任何LLM连接！');
      console.log('💡 请运行以下命令初始化LLM连接:');
      console.log('   npx tsx scripts/seed-llm-connections.ts');
      return;
    }

    // 统计状态
    const activeConnections = connections.filter((c: any) => c.status === '活跃');
    const inactiveConnections = connections.filter((c: any) => c.status === '已禁用');

    console.log(`✅ 活跃连接: ${activeConnections.length}`);
    console.log(`⏸️  已禁用连接: ${inactiveConnections.length}\n`);

    // 显示活跃连接详情
    if (activeConnections.length > 0) {
      console.log('📋 活跃连接详情:');
      activeConnections.forEach((conn: any, index: number) => {
        console.log(`  ${index + 1}. ${conn.modelName} (${conn.provider})`);
        console.log(`     优先级: ${conn.priority}`);
        console.log(`     类别: ${conn.category}`);
        console.log(`     范围: ${conn.scope}`);
        console.log(`     最后测试: ${conn.lastTestStatus || '未测试'}\n`);
      });
    }

    // 检查是否有活跃连接
    if (activeConnections.length === 0) {
      console.log('❌ 没有活跃的LLM连接！');
      console.log('💡 请在管理员面板中激活至少一个LLM连接。');
    } else {
      console.log('✅ 发现活跃的LLM连接，下拉菜单应该正常显示。');
      if (!hasRemoteCreds) {
        console.log('💡 本地开发环境: LLM连接数据已准备就绪');
      } else {
        console.log('💡 生产环境: 请确保生产数据库中也有相应的LLM连接数据');
      }
    }

  } catch (error: any) {
    console.error('❌ 检查失败:', error.message);
    if (error.message.includes('ResourceNotFound') || error.message.includes('not exist')) {
      console.log('\n💡 解决方案:');
      console.log('1. 本地开发: 运行 npx tsx scripts/seed-llm-connections.ts');
      console.log('2. 生产环境: 在TCB控制台创建llm_connections集合并导入数据');
    } else {
      console.log('💡 请确保数据库连接正常。');
    }
  }
}

checkLlmConnections().catch(console.error);