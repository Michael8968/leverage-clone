#!/usr/bin/env node

/**
 * API测试脚本
 * 模拟Postman调用，测试关键API端点
 */

const cloudbase = require('@cloudbase/node-sdk');
require('dotenv').config();

// API测试用例
const apiTests = [
  {
    name: 'getDesigners (查询users role=creator)',
    description: '获取设计师列表 - AI flows测试必需',
    collection: 'users',
    query: { role: 'creator' },
    expectedMinResults: 1,
    critical: true
  },
  {
    name: 'getUsers (查询所有users)',
    description: '获取所有用户',
    collection: 'users',
    query: {},
    expectedMinResults: 1,
    critical: true
  },
  {
    name: 'getDemands (查询所有demands)',
    description: '获取需求列表 - AI flows测试必需',
    collection: 'demands',
    query: {},
    expectedMinResults: 1,
    critical: true
  },
  {
    name: 'getProducts (查询所有products)',
    description: '获取产品列表',
    collection: 'products',
    query: {},
    expectedMinResults: 1,
    critical: false
  },
  {
    name: 'getSuppliers (查询所有suppliers)',
    description: '获取供应商列表',
    collection: 'suppliers',
    query: {},
    expectedMinResults: 1,
    critical: false
  },
  {
    name: 'getPrompts (查询所有prompts)',
    description: '获取提示模板',
    collection: 'prompts',
    query: {},
    expectedMinResults: 1,
    critical: false
  }
];

// 模拟API调用
async function simulateApiCall(db, testCase) {
  try {
    const collection = db.collection(testCase.collection);

    let query = collection;
    if (Object.keys(testCase.query).length > 0) {
      // 构建查询条件
      for (const [field, value] of Object.entries(testCase.query)) {
        query = query.where({ [field]: value });
      }
    }

    const result = await query.limit(10).get();

    return {
      success: true,
      data: result.data || [],
      count: result.data ? result.data.length : 0,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      data: [],
      count: 0,
      error: error.message
    };
  }
}

// 运行API测试
async function runApiTests() {
  try {
    console.log('🧪 开始API测试 (模拟Postman调用)...\n');

    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID || process.env.TENCENTCLOUD_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY || process.env.TENCENTCLOUD_SECRET_KEY,
      region: process.env.TENCENTCLOUD_REGION || 'ap-shanghai'
    });

    const db = app.database();

    console.log('📋 API测试结果:');
    console.log('='.repeat(100));
    console.log('API端点'.padEnd(30) + '状态'.padEnd(8) + '数据量'.padEnd(8) + '期望'.padEnd(8) + '关键'.padEnd(6) + '描述');
    console.log('='.repeat(100));

    let allTestsPass = true;
    let criticalTestsPass = true;
    const results = [];

    for (const testCase of apiTests) {
      const result = await simulateApiCall(db, testCase);

      let status = 'PASS';
      let statusIcon = '✅';

      if (!result.success) {
        status = 'ERROR';
        statusIcon = '❌';
        allTestsPass = false;
        if (testCase.critical) criticalTestsPass = false;
      } else if (result.count < testCase.expectedMinResults) {
        status = 'WARN';
        statusIcon = '⚠️';
        allTestsPass = false;
        if (testCase.critical) criticalTestsPass = false;
      }

      const expected = `≥${testCase.expectedMinResults}`;
      const critical = testCase.critical ? '是' : '否';

      console.log(
        testCase.name.padEnd(30) +
        statusIcon.padEnd(8) +
        result.count.toString().padEnd(8) +
        expected.padEnd(8) +
        critical.padEnd(6) +
        testCase.description
      );

      results.push({
        ...testCase,
        status,
        actualResults: result.count,
        success: result.success,
        error: result.error
      });

      // 显示详细错误信息
      if (!result.success) {
        console.log(`    ❌ 错误: ${result.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('='.repeat(100));

    // 关键API测试总结
    console.log('\n🎯 关键API测试 (AI flows测试必需):');
    const criticalTests = results.filter(r => r.critical);
    criticalTests.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      const statusText = result.status === 'PASS' ? '通过' : result.status === 'ERROR' ? '错误' : '警告';
      console.log(`  ${statusIcon} ${result.name}: ${statusText} (${result.actualResults} 条数据)`);
    });

    // 最终结果
    console.log('\n📊 测试总结:');
    if (allTestsPass) {
      console.log('🎉 所有API测试通过！数据库API工作正常。');
      console.log('✅ 可以进行下一步：部署验证和监控。');
    } else {
      console.log('⚠️  部分API测试失败：');
      const errors = results.filter(r => r.status === 'ERROR');
      const warnings = results.filter(r => r.status === 'WARN');

      if (errors.length > 0) {
        console.log(`  ❌ ${errors.length} 个API调用出错 (ResourceNotFound等)`);
      }
      if (warnings.length > 0) {
        console.log(`  ⚠️  ${warnings.length} 个API返回数据不足`);
      }

      console.log('\n💡 修复建议:');
      console.log('  1. 检查数据库集合是否存在');
      console.log('  2. 运行: node scripts/db-check.js');
      console.log('  3. 运行: node scripts/migrate.js');
      console.log('  4. 检查TCB控制台 > 云函数日志');
    }

    // 关键API状态
    if (!criticalTestsPass) {
      console.log('\n🚨 警告: 关键API (getDesigners/getDemands) 存在问题，将影响AI flows测试！');
    }

    console.log('\n✅ API测试完成');

    return {
      allTestsPass,
      criticalTestsPass,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'PASS').length,
        warnings: results.filter(r => r.status === 'WARN').length,
        errors: results.filter(r => r.status === 'ERROR').length
      }
    };

  } catch (error) {
    console.error('❌ API测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runApiTests();
}

module.exports = { runApiTests, apiTests };