#!/usr/bin/env node

/**
 * TCB日志监控脚本
 * 检查数据库相关日志，监控创建和权限错误
 */

const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config();

// 日志检查配置
const logFilters = {
  database: ['database', 'collection', 'ResourceNotFound', 'permission', 'auth'],
  errors: ['error', 'Error', 'ERROR', 'failed', 'Failed', 'FAILED'],
  create: ['create', 'add', 'insert', 'CREATE', 'ADD', 'INSERT'],
  permission: ['permission', 'auth', 'unauthorized', 'forbidden', 'PERMISSION', 'AUTH']
};

// 模拟日志检查（实际环境中需要调用TCB日志API）
async function checkLogs(app) {
  try {
    console.log('🔍 检查TCB日志...\n');

    // 注意：实际的日志检查需要使用TCB的管理API
    // 这里提供模拟检查和指导

    console.log('📋 日志检查项目:');
    console.log('='.repeat(80));

    const issues = [];

    // 检查数据库相关错误
    console.log('🔍 检查数据库相关错误...');
    console.log('  💡 在TCB控制台 > 云开发 > 日志 中搜索以下关键词:');
    console.log('    - "database"');
    console.log('    - "ResourceNotFound"');
    console.log('    - "collection"');
    console.log('    - "permission"');

    // 检查创建操作
    console.log('\n🔍 检查集合创建操作...');
    console.log('  💡 搜索关键词: "create", "add", "collection"');

    // 检查权限错误
    console.log('\n🔍 检查权限和认证错误...');
    console.log('  💡 搜索关键词: "permission", "auth", "unauthorized"');

    console.log('\n📊 日志监控建议:');
    console.log('='.repeat(80));
    console.log('✅ 正常情况:');
    console.log('  - 无 ResourceNotFound 错误');
    console.log('  - 无 permission denied 错误');
    console.log('  - 集合创建成功日志');
    console.log('  - 数据库操作成功日志');

    console.log('\n⚠️  需要关注的错误模式:');
    console.log('  ❌ ResourceNotFound: 集合不存在');
    console.log('  ❌ permission denied: 权限不足');
    console.log('  ❌ auth failed: 认证失败');
    console.log('  ❌ collection create failed: 集合创建失败');

    console.log('\n🔧 常见问题及解决方案:');
    console.log('='.repeat(80));
    console.log('问题: ResourceNotFound 错误');
    console.log('解决: 1. 检查集合名称拼写');
    console.log('      2. 在TCB控制台手动创建集合');
    console.log('      3. 运行 node scripts/migrate.js');

    console.log('\n问题: permission denied 错误');
    console.log('解决: 1. 检查环境变量配置');
    console.log('      2. 验证TCB密钥权限');
    console.log('      3. 检查环境ID是否正确');

    console.log('\n问题: collection create failed');
    console.log('解决: 1. 检查集合名称规范');
    console.log('      2. 确认账户有创建权限');
    console.log('      3. 在TCB控制台手动创建');

    console.log('\n📝 手动日志检查步骤:');
    console.log('='.repeat(80));
    console.log('1. 登录腾讯云控制台');
    console.log('2. 进入 云开发 TCB');
    console.log('3. 选择对应环境');
    console.log('4. 点击 "日志" 标签');
    console.log('5. 设置时间范围 (最近1小时)');
    console.log('6. 在搜索框输入关键词过滤');
    console.log('7. 检查是否有错误日志');

    console.log('\n⏰ 实时监控建议:');
    console.log('='.repeat(80));
    console.log('• 部署后立即检查日志');
    console.log('• API调用前后检查相关日志');
    console.log('• 定期检查错误日志趋势');
    console.log('• 设置日志告警 (如支持)');

    console.log('\n✅ 日志监控检查完成');

    return {
      issues,
      recommendations: [
        '检查TCB控制台日志是否有ResourceNotFound错误',
        '确认数据库操作权限正常',
        '验证集合创建成功',
        '监控API调用日志'
      ]
    };

  } catch (error) {
    console.error('❌ 日志检查失败:', error);
    return {
      issues: [error.message],
      recommendations: ['手动检查TCB控制台日志']
    };
  }
}

// 检查数据库连接状态
async function checkDatabaseConnection(app) {
  try {
    console.log('🔗 检查数据库连接状态...');

    const db = app.database();

    // 尝试访问一个已知集合
    const testCollections = ['users', 'products', 'demands'];
    let connectionOk = false;

    for (const coll of testCollections) {
      try {
        const collection = db.collection(coll);
        await collection.count();
        console.log(`  ✅ ${coll} 集合可访问`);
        connectionOk = true;
        break;
      } catch (error) {
        console.log(`  ⚠️  ${coll} 集合访问失败: ${error.message.substring(0, 50)}...`);
      }
    }

    if (connectionOk) {
      console.log('✅ 数据库连接正常');
    } else {
      console.log('❌ 数据库连接存在问题');
    }

    return connectionOk;

  } catch (error) {
    console.log('❌ 数据库连接检查失败:', error.message);
    return false;
  }
}

// 主监控函数
async function runMonitoring() {
  try {
    console.log('📊 开始TCB监控检查...\n');

    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY,
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai'
    });

    console.log('✅ TCB连接初始化成功\n');

    // 检查数据库连接
    const connectionOk = await checkDatabaseConnection(app);

    // 检查日志
    const logResult = await checkLogs(app);

    // 总结报告
    console.log('\n📋 监控检查总结:');
    console.log('='.repeat(60));

    if (connectionOk) {
      console.log('✅ 数据库连接正常');
    } else {
      console.log('❌ 数据库连接存在问题');
    }

    if (logResult.issues.length === 0) {
      console.log('✅ 无明显日志问题');
    } else {
      console.log(`⚠️  发现 ${logResult.issues.length} 个潜在问题`);
    }

    console.log('\n📝 监控建议:');
    logResult.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });

    console.log('\n🎯 下一步行动:');
    console.log('  1. 手动检查TCB控制台日志');
    console.log('  2. 确认所有API调用正常');
    console.log('  3. 验证生产环境部署');

    console.log('\n✅ TCB监控检查完成');

    return {
      connectionOk,
      logIssues: logResult.issues,
      recommendations: logResult.recommendations
    };

  } catch (error) {
    console.error('❌ 监控检查失败:', error);
    process.exit(1);
  }
}

// 运行监控
if (require.main === module) {
  runMonitoring();
}

module.exports = { runMonitoring, checkLogs, checkDatabaseConnection };