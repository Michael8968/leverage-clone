#!/usr/bin/env node

/**
 * 数据库迁移验证流程主脚本
 * 按照标准步骤执行完整的数据库迁移和验证流程
 */

const { checkDatabaseStatus } = require('./db-check');
const { runMigration } = require('./migrate');
const { runApiTests } = require('./api-test');
const { runMonitoring } = require('./monitor');
const fs = require('fs');
const path = require('path');

// Firebase备份文件路径
const FIREBASE_BACKUP_PATH = path.join(__dirname, '..', 'firebase-backup.json');

// 流程步骤定义
const workflowSteps = [
  {
    id: 'db-check',
    name: '运行检查',
    command: 'node db-check.js',
    description: '表格全\'OK\'，数据>0',
    function: checkDatabaseStatus,
    critical: true
  },
  {
    id: 'migrate',
    name: '修复不齐',
    command: 'Copilot gen fix代码，node migrate.js',
    description: 'TCB控制台>数据库>刷新集合',
    function: runMigration,
    critical: true
  },
  {
    id: 'api-test',
    name: '全测试',
    command: 'Postman调用API如getDesigners (query users role=\'creator\')',
    description: '返回预期数据，无ResourceNotFound',
    function: runApiTests,
    critical: true
  },
  {
    id: 'monitor',
    name: '监控',
    command: 'TCB日志过滤\'database\'',
    description: '无创建/权限错',
    function: runMonitoring,
    critical: false
  }
];

// 执行单个步骤
async function executeStep(step) {
  console.log(`\n▶️  执行步骤: ${step.name}`);
  console.log(`📝 描述: ${step.description}`);
  console.log(`💻 命令: ${step.command}`);
  console.log('-'.repeat(60));

  try {
    const result = await step.function();

    if (step.id === 'db-check') {
      const allOk = result.allOk;
      const criticalOk = result.criticalOk;
      console.log(`\n📊 结果: ${allOk ? '✅ 通过' : '❌ 失败'}`);
      console.log(`🎯 关键集合: ${criticalOk ? '✅ OK' : '❌ 失败'}`);
      return { success: allOk, critical: criticalOk, result };
    }

    if (step.id === 'migrate') {
      const criticalOk = result.criticalOk;
      console.log(`\n📊 结果: 应用了 ${result.fixesApplied} 个修复`);
      console.log(`🎯 关键集合: ${criticalOk ? '✅ OK' : '❌ 失败'}`);
      return { success: criticalOk, critical: criticalOk, result };
    }

    if (step.id === 'import-firebase') {
      const criticalOk = result.criticalOk;
      console.log(`\n📊 结果: 导入 ${result.totalSuccess} 条记录`);
      console.log(`🎯 关键集合: ${criticalOk ? '✅ OK' : '❌ 失败'}`);
      return { success: result.totalSuccess > 0, critical: criticalOk, result };
    }

    if (step.id === 'api-test') {
      const allPass = result.allTestsPass;
      const criticalPass = result.criticalTestsPass;
      console.log(`\n📊 结果: ${allPass ? '✅ 通过' : '❌ 失败'}`);
      console.log(`🎯 关键API: ${criticalPass ? '✅ OK' : '❌ 失败'}`);
      return { success: allPass, critical: criticalPass, result };
    }

    if (step.id === 'monitor') {
      console.log(`\n📊 结果: 监控检查完成`);
      return { success: true, critical: true, result };
    }

    return { success: true, critical: true, result };

  } catch (error) {
    console.log(`\n❌ 步骤执行失败: ${error.message}`);
    return { success: false, critical: false, error: error.message };
  }
}

// 主流程执行
async function runFullWorkflow() {
  console.log('🚀 开始数据库迁移验证流程\n');
  console.log('按照标准步骤执行完整验证:\n');

  // 显示流程概览
  console.log('📋 流程步骤:');
  console.log('='.repeat(80));
  workflowSteps.forEach((step, index) => {
    const status = step.critical ? '🔴' : '🟡';
    const condition = step.condition ? (step.condition() ? '✅' : '⏭️') : '✅';
    console.log(`${(index + 1).toString().padStart(2)}. ${status} ${step.name.padEnd(12)} ${condition} ${step.description}`);
  });
  console.log('='.repeat(80));
  console.log();

  const results = [];
  let workflowSuccess = true;
  let criticalSuccess = true;

  // 执行每个步骤
  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];

    // 检查条件（例如Firebase备份是否存在）
    if (step.condition && !step.condition()) {
      console.log(`\n⏭️  跳过步骤: ${step.name} (条件不满足)`);
      results.push({
        step: step.id,
        skipped: true,
        reason: '条件不满足'
      });
      continue;
    }

    const stepResult = await executeStep(step);
    results.push({
      step: step.id,
      ...stepResult
    });

    if (!stepResult.success) {
      workflowSuccess = false;
    }

    if (step.critical && !stepResult.critical) {
      criticalSuccess = false;
    }

    // 如果是关键步骤失败，可能需要停止流程
    if (step.critical && !stepResult.success) {
      console.log(`\n⚠️  关键步骤 "${step.name}" 失败，建议修复后重新执行`);
      break;
    }
  }

  // 最终总结
  console.log('\n' + '='.repeat(80));
  console.log('📊 流程执行总结:');
  console.log('='.repeat(80));

  results.forEach((result, index) => {
    const step = workflowSteps.find(s => s.id === result.step);
    const status = result.skipped ? '⏭️' :
                  (result.success ? '✅' : '❌');
    const critical = step.critical ? '🔴' : '🟡';
    console.log(`${(index + 1).toString().padStart(2)}. ${status} ${critical} ${step.name}`);
  });

  console.log('\n🎯 关键指标:');
  const criticalSteps = results.filter(r => workflowSteps.find(s => s.id === r.step)?.critical && !r.skipped);
  const criticalPassed = criticalSteps.filter(r => r.critical).length;
  console.log(`  关键步骤通过: ${criticalPassed}/${criticalSteps.length}`);

  if (workflowSuccess && criticalSuccess) {
    console.log('\n🎉 数据库迁移验证流程完全成功！');
    console.log('✅ 所有检查通过，数据库已准备好用于生产环境。');
    console.log('🚀 可以进行最终部署和上线。');
  } else {
    console.log('\n⚠️  流程执行完成，但存在问题需要修复。');

    if (!criticalSuccess) {
      console.log('🚨 关键步骤失败，影响系统正常运行！');
    }

    console.log('\n💡 修复建议:');
    console.log('  1. 检查失败的步骤并修复问题');
    console.log('  2. 重新运行完整流程: node scripts/run-workflow.js');
    console.log('  3. 或单独运行失败的步骤');
    console.log('  4. 检查TCB控制台和日志');
  }

  console.log('\n✅ 数据库迁移验证流程执行完毕');

  return {
    workflowSuccess,
    criticalSuccess,
    results
  };
}

// 显示帮助信息
function showHelp() {
  console.log('数据库迁移验证流程脚本');
  console.log('用法: node scripts/run-workflow.js [选项]');
  console.log('');
  console.log('选项:');
  console.log('  --help, -h     显示帮助信息');
  console.log('  --step <id>    只执行指定步骤');
  console.log('  --list         列出所有步骤');
  console.log('');
  console.log('步骤ID:');
  workflowSteps.forEach(step => {
    console.log(`  ${step.id.padEnd(15)} ${step.name}`);
  });
  console.log('');
  console.log('示例:');
  console.log('  node scripts/run-workflow.js              # 执行完整流程');
  console.log('  node scripts/run-workflow.js --step db-check  # 只执行数据库检查');
  console.log('  node scripts/run-workflow.js --list       # 列出步骤');
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--list')) {
    console.log('可用步骤:');
    workflowSteps.forEach((step, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${step.id.padEnd(15)} ${step.name}`);
      console.log(`    ${step.description}`);
      console.log(`    命令: ${step.command}`);
      console.log();
    });
    process.exit(0);
  }

  const stepIndex = args.indexOf('--step');
  if (stepIndex !== -1 && args[stepIndex + 1]) {
    const stepId = args[stepIndex + 1];
    const step = workflowSteps.find(s => s.id === stepId);

    if (step) {
      console.log(`执行单个步骤: ${step.name}`);
      executeStep(step).then(() => process.exit(0));
      return;
    } else {
      console.error(`未知步骤ID: ${stepId}`);
      console.log('使用 --list 查看可用步骤');
      process.exit(1);
    }
  }

  // 默认执行完整流程
  runFullWorkflow().then(() => process.exit(0));
}

// 运行脚本
if (require.main === module) {
  parseArgs();
}

module.exports = { runFullWorkflow, executeStep, workflowSteps };