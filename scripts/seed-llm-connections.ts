#!/usr/bin/env tsx

/**
 * 初始化LLM连接数据脚本
 */

import { getTcbDb } from '../src/lib/tcb.js';
import * as fs from 'fs';
import * as path from 'path';

async function seedLlmConnections() {
  console.log('🌱 初始化LLM连接数据...\n');

  // 首先尝试写入本地JSON文件
  const dataDir = path.join(process.cwd(), 'data');
  const llmFile = path.join(dataDir, 'llm_connections.json');

  const llmConnections = [
    {
      provider: 'Tencent',
      modelName: 'hunyuan-standard',
      apiKey: process.env.HUNYUAN_API_KEY || 'your-hunyuan-api-key',
      priority: 1,
      status: '活跃',
      scope: '通用',
      category: '文本',
      lastTestStatus: 'untested',
      createdAt: new Date().toISOString()
    },
    {
      provider: 'Tencent',
      modelName: 'hunyuan-pro',
      apiKey: process.env.HUNYUAN_API_KEY || 'your-hunyuan-api-key',
      priority: 2,
      status: '活跃',
      scope: '通用',
      category: '文本',
      lastTestStatus: 'untested',
      createdAt: new Date().toISOString()
    },
    {
      provider: 'OpenAI',
      modelName: 'gpt-4o',
      apiKey: 'your-openai-api-key',
      priority: 10,
      status: '活跃',
      scope: '通用',
      category: '文本',
      lastTestStatus: 'untested',
      createdAt: new Date().toISOString()
    },
    {
      provider: 'DeepSeek',
      modelName: 'deepseek-chat',
      apiKey: 'your-deepseek-api-key',
      priority: 20,
      status: '活跃',
      scope: '通用',
      category: '文本',
      lastTestStatus: 'untested',
      createdAt: new Date().toISOString()
    }
  ];

  // 写入本地文件
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(llmFile, JSON.stringify(llmConnections, null, 2), 'utf-8');
    console.log('✅ 已创建本地LLM连接文件:', llmFile);
  } catch (error: any) {
    console.error('❌ 创建本地文件失败:', error.message);
  }

  // 尝试写入远程数据库
  try {
    const db = getTcbDb();
    console.log('✓ 数据库连接成功，尝试写入远程数据库...\n');

    // 检查是否已有LLM连接
    const existing = await db.collection('llm_connections').get();
    if (existing.data && existing.data.length > 0) {
      console.log(`⚠️  远程数据库已存在 ${existing.data.length} 个LLM连接，跳过初始化`);
      return;
    }

    console.log(`📝 将添加 ${llmConnections.length} 个LLM连接到远程数据库:\n`);

    for (const connection of llmConnections) {
      console.log(`  • ${connection.modelName} (${connection.provider}) - 优先级: ${connection.priority}`);
    }

    console.log('\n🔄 开始添加数据...\n');

    for (const connection of llmConnections) {
      try {
        const result = await db.collection('llm_connections').add(connection);
        console.log(`✅ 已添加: ${connection.modelName} (${connection.provider})`);
      } catch (error: any) {
        console.error(`❌ 添加失败: ${connection.modelName} - ${error.message}`);
      }
    }

    console.log('\n🎉 远程数据库LLM连接初始化完成！');

  } catch (error: any) {
    console.log('⚠️  远程数据库写入失败，使用本地数据');
    console.log('💡 本地开发时会自动使用本地JSON文件');
    console.log('💡 生产环境请在TCB控制台创建llm_connections集合并导入数据');
  }

  console.log('\n📋 下一步操作:');
  console.log('1. 在管理员面板中检查LLM连接是否显示');
  console.log('2. 更新API密钥为有效的密钥');
  console.log('3. 点击"可用性测试"按钮测试连接');
}

seedLlmConnections().catch(console.error);