#!/usr/bin/env node

/**
 * 数据库状态检查脚本
 * 检查所有集合状态，确保数据完整性和对齐
 */

const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config();

// 数据库结构定义
const databaseSchema = {
  users: {
    required: true,
    minRecords: 1,
    critical: true,
    description: '用户数据 - AI flows测试必需'
  },
  products: {
    required: true,
    minRecords: 1,
    critical: false,
    description: '产品数据'
  },
  demands: {
    required: true,
    minRecords: 1,
    critical: true,
    description: '需求数据 - AI flows测试必需'
  },
  suppliers: {
    required: true,
    minRecords: 1,
    critical: false,
    description: '供应商数据'
  },
  prompts: {
    required: true,
    minRecords: 1,
    critical: false,
    description: '提示模板数据'
  },
  chats: {
    required: false,
    minRecords: 0,
    critical: false,
    description: '聊天记录 (可选)'
  },
  llm_connections: {
    required: false,
    minRecords: 0,
    critical: false,
    description: 'LLM连接配置 (可选)'
  },
  ai_scenarios: {
    required: false,
    minRecords: 0,
    critical: false,
    description: 'AI场景配置 (可选)'
  },
  intelligent_routing_strategy: {
    required: false,
    minRecords: 0,
    critical: false,
    description: '智能路由策略 (可选)'
  },
  resources: {
    required: false,
    minRecords: 0,
    critical: false,
    description: '资源库 (可选)'
  },
  availabilities: {
    required: false,
    minRecords: 0,
    critical: false,
    description: '可用性时间表 (可选)'
  },
  appointments: {
    required: false,
    minRecords: 0,
    critical: false,
    description: '预约记录 (可选)'
  }
};

async function checkDatabaseStatus() {
  try {
    console.log('🔍 开始数据库状态检查...\n');

    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY,
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai'
    });

    const db = app.database();

    console.log('📊 集合状态检查结果:');
    console.log('='.repeat(100));
    console.log('集合名称'.padEnd(25) + '状态'.padEnd(8) + '数据量'.padEnd(10) + '要求'.padEnd(8) + '关键'.padEnd(6) + '描述');
    console.log('='.repeat(100));

    let allOk = true;
    let criticalOk = true;
    const results = [];

    for (const [collectionName, config] of Object.entries(databaseSchema)) {
      try {
        const collection = db.collection(collectionName);
        const countResult = await collection.count();
        const recordCount = countResult.total || 0;

        // 检查状态
        let status = 'OK';
        let statusIcon = '✅';

        if (config.required && recordCount === 0) {
          status = 'ERROR';
          statusIcon = '❌';
          allOk = false;
          if (config.critical) criticalOk = false;
        } else if (recordCount < config.minRecords) {
          status = 'WARN';
          statusIcon = '⚠️';
          allOk = false;
        }

        const required = config.required ? '必需' : '可选';
        const critical = config.critical ? '是' : '否';

        console.log(
          collectionName.padEnd(25) +
          statusIcon.padEnd(8) +
          recordCount.toString().padEnd(10) +
          required.padEnd(8) +
          critical.padEnd(6) +
          config.description
        );

        results.push({
          collection: collectionName,
          status,
          recordCount,
          required: config.required,
          critical: config.critical,
          description: config.description
        });

      } catch (error) {
        console.log(
          collectionName.padEnd(25) +
          '❌'.padEnd(8) +
          'N/A'.padEnd(10) +
          (config.required ? '必需' : '可选').padEnd(8) +
          (config.critical ? '是' : '否').padEnd(6) +
          `集合不存在: ${error.message.substring(0, 30)}...`
        );

        if (config.required) {
          allOk = false;
          if (config.critical) criticalOk = false;
        }

        results.push({
          collection: collectionName,
          status: 'MISSING',
          recordCount: 0,
          required: config.required,
          critical: config.critical,
          error: error.message
        });
      }

      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('='.repeat(100));

    // 关键集合检查
    console.log('\n🎯 关键集合状态 (AI flows测试必需):');
    const criticalCollections = results.filter(r => r.critical);
    criticalCollections.forEach(result => {
      const statusIcon = result.status === 'OK' ? '✅' : '❌';
      console.log(`  ${statusIcon} ${result.collection}: ${result.recordCount} 条数据`);
    });

    // 最终结果
    console.log('\n📋 检查总结:');
    if (allOk) {
      console.log('🎉 所有集合状态正常！数据库已完全对齐。');
      console.log('✅ 可以进行下一步：API测试和部署验证。');
    } else {
      console.log('⚠️  发现问题需要修复：');
      const errors = results.filter(r => r.status === 'ERROR' || r.status === 'MISSING');
      const warnings = results.filter(r => r.status === 'WARN');

      if (errors.length > 0) {
        console.log(`  ❌ ${errors.length} 个集合存在错误 (必需集合缺失或无数据)`);
      }
      if (warnings.length > 0) {
        console.log(`  ⚠️  ${warnings.length} 个集合存在警告 (数据量不足)`);
      }

      console.log('\n💡 修复建议:');
      console.log('  1. 运行: node scripts/migrate.js');
      console.log('  2. 检查TCB控制台 > 数据库 > 刷新集合');
      console.log('  3. 如有Firebase备份，运行数据导入');
    }

    // 关键集合状态
    if (!criticalOk) {
      console.log('\n🚨 警告: 关键集合 (users/demands) 存在问题，将影响AI flows测试！');
    }

    console.log('\n✅ 数据库状态检查完成');

    // 返回检查结果
    return {
      allOk,
      criticalOk,
      results,
      summary: {
        total: results.length,
        ok: results.filter(r => r.status === 'OK').length,
        warnings: results.filter(r => r.status === 'WARN').length,
        errors: results.filter(r => r.status === 'ERROR' || r.status === 'MISSING').length
      }
    };

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  checkDatabaseStatus();
}

module.exports = { checkDatabaseStatus, databaseSchema };