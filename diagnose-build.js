#!/usr/bin/env node
/**
 * diagnose-build.js
 * 构建诊断工具 - 自动检测并修复常见构建卡点
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('=== Next.js 构建诊断工具 ===\n');

// 1. 检查关键文件
console.log('[1/5] 检查项目文件...');
const criticalFiles = [
  'package.json',
  'next.config.js',
  '.next',
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
});

// 2. 检查 node_modules
console.log('\n[2/5] 检查依赖安装...');
const hasNodeModules = fs.existsSync('node_modules');
const hasNextDist = fs.existsSync('node_modules/next/dist');
console.log(`  ${hasNodeModules ? '✓' : '✗'} node_modules 存在`);
console.log(`  ${hasNextDist ? '✓' : '✗'} Next.js 已安装`);

if (!hasNodeModules || !hasNextDist) {
  console.log('\n⚠ 依赖缺失，执行安装...');
  spawnSync('npm', ['install'], { stdio: 'inherit', shell: true });
}

// 3. 清理旧构建缓存
console.log('\n[3/5] 清理构建缓存...');
const cacheDirs = ['.next/cache', '.next/trace'];
let cleaned = 0;
cacheDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✓ 已删除 ${dir}`);
      cleaned++;
    } catch (e) {
      console.log(`  ⚠ 无法删除 ${dir}: ${e.message}`);
    }
  }
});
console.log(`  清理了 ${cleaned} 个缓存目录`);

// 4. 备份配置并切换到调试模式
console.log('\n[4/5] 准备调试配置...');
const configFile = 'next.config.js';
const debugConfigFile = 'next.config.debug.js';
const backupFile = 'next.config.js.backup';

if (fs.existsSync(debugConfigFile)) {
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(configFile, backupFile);
    console.log('  ✓ 已备份原配置到 next.config.js.backup');
  }
  
  console.log('\n  是否使用调试配置？(禁用优化以诊断卡点)');
  console.log('  手动执行: copy next.config.debug.js next.config.js');
  console.log('  恢复原配置: copy next.config.js.backup next.config.js');
} else {
  console.log('  ⚠ next.config.debug.js 不存在');
}

// 5. 分析常见问题
console.log('\n[5/5] 构建卡点诊断建议：');
console.log('\n常见卡点及解决方案：');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const issues = [
  {
    name: 'Terser 压缩卡住',
    symptoms: '构建卡在 "Creating an optimized production build"',
    solutions: [
      '在 next.config.js 添加: swcMinify: false',
      '或增加 Node 内存: set NODE_OPTIONS=--max-old-space-size=4096',
    ]
  },
  {
    name: 'SWC 编译错误',
    symptoms: '报错 "SWC failed to compile" 或卡在编译阶段',
    solutions: [
      '降级 @swc/core: npm install @swc/core@1.3.100',
      '或禁用 SWC: swcMinify: false',
    ]
  },
  {
    name: 'CSS 优化卡住',
    symptoms: '卡在 "Finalizing page optimization"',
    solutions: [
      '禁用 CSS 优化: experimental: { optimizeCss: false }',
      '检查 critters 依赖是否安装',
    ]
  },
  {
    name: '模块未找到',
    symptoms: 'Cannot find module "@cloudbase/node-sdk" 等',
    solutions: [
      '已卸载的依赖仍被引用，检查 src/ai/flows/*.js',
      '运行: npm run clean-deps',
    ]
  },
  {
    name: '内存不足',
    symptoms: 'JavaScript heap out of memory',
    solutions: [
      'set NODE_OPTIONS=--max-old-space-size=8192',
      '关闭其他程序释放内存',
    ]
  },
];

issues.forEach((issue, i) => {
  console.log(`\n${i + 1}. ${issue.name}`);
  console.log(`   症状: ${issue.symptoms}`);
  console.log('   解决方案:');
  issue.solutions.forEach(sol => console.log(`     • ${sol}`));
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n推荐操作：');
console.log('1. 使用调试配置构建:');
console.log('   copy next.config.debug.js next.config.js');
console.log('   npm run build');
console.log('\n2. 如果仍然卡住，增加内存并禁用优化:');
console.log('   set NODE_OPTIONS=--max-old-space-size=8192');
console.log('   npm run build');
console.log('\n3. 构建成功后恢复原配置:');
console.log('   copy next.config.js.backup next.config.js');

console.log('\n=== 诊断完成 ===\n');
