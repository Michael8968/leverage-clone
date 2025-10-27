const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n=== Next.js 构建诊断工具 ===\n');

// 诊断结果收集
const diagnostics = {
  timestamp: new Date().toISOString(),
  issues: [],
  recommendations: [],
  fixed: [],
};

// 1. 检查关键文件
console.log('[1/6] 检查项目结构...');
const criticalFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  '.next',
  'node_modules',
  'src/app',
];

criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  if (!exists && file !== '.next') {
    diagnostics.issues.push(`缺失关键文件: ${file}`);
  }
});

// 2. 检查已卸载依赖的残留引用
console.log('\n[2/6] 检查废弃依赖引用...');
const deprecatedPackages = [
  '@cloudbase/node-sdk',
  'tencentcloud-sdk-nodejs-hunyuan',
];

const searchPatterns = [
  'require(\'@cloudbase/node-sdk\')',
  'require("@cloudbase/node-sdk")',
  'from \'@cloudbase/node-sdk\'',
  'from "@cloudbase/node-sdk"',
  'getHunyuanClient',
  'tencentcloud-sdk-nodejs',
];

let foundDeprecatedRefs = false;
try {
  const flowsDir = path.join(process.cwd(), 'src/ai/flows');
  if (fs.existsSync(flowsDir)) {
    const files = fs.readdirSync(flowsDir);
    files.forEach(file => {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8');
        searchPatterns.forEach(pattern => {
          if (content.includes(pattern)) {
            console.log(`  ⚠️  ${file}: 发现 "${pattern}"`);
            diagnostics.issues.push(`${file} 引用了废弃模块: ${pattern}`);
            foundDeprecatedRefs = true;
          }
        });
      }
    });
  }
  
  if (!foundDeprecatedRefs) {
    console.log('  ✓ 未发现废弃依赖引用');
  }
} catch (err) {
  console.log(`  ⚠️  检查失败: ${err.message}`);
}

// 3. 检查 package.json 中的依赖
console.log('\n[3/6] 检查 package.json 依赖...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  
  deprecatedPackages.forEach(pkg => {
    if (allDeps[pkg]) {
      console.log(`  ⚠️  发现废弃依赖: ${pkg}@${allDeps[pkg]}`);
      diagnostics.issues.push(`package.json 仍包含 ${pkg}`);
      diagnostics.recommendations.push(`运行: npm uninstall ${pkg}`);
    } else {
      console.log(`  ✓ ${pkg} 已移除`);
    }
  });
  
  // 检查关键依赖
  const keyDeps = ['next', '@swc/core', 'react', 'typescript'];
  console.log('\n  关键依赖版本:');
  keyDeps.forEach(dep => {
    if (allDeps[dep]) {
      console.log(`    - ${dep}: ${allDeps[dep]}`);
    }
  });
} catch (err) {
  console.log(`  ⚠️  读取 package.json 失败: ${err.message}`);
}

// 4. 检查构建缓存
console.log('\n[4/6] 检查构建缓存...');
const cachePaths = [
  '.next/cache',
  '.next/trace',
  'node_modules/.cache',
];

let cacheSize = 0;
cachePaths.forEach(cachePath => {
  const fullPath = path.join(process.cwd(), cachePath);
  if (fs.existsSync(fullPath)) {
    try {
      const stats = fs.statSync(fullPath);
      console.log(`  ⚠️  ${cachePath} 存在`);
      cacheSize++;
    } catch {}
  }
});

if (cacheSize > 0) {
  diagnostics.recommendations.push('清理构建缓存: npm run diagnose');
  console.log(`\n  建议清理 ${cacheSize} 个缓存目录`);
}

// 5. 分析 next.config.js
console.log('\n[5/6] 分析 Next.js 配置...');
try {
  const configPath = path.join(process.cwd(), 'next.config.js');
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // 检查优化配置
    const checks = [
      { key: 'swcMinify: false', safe: true, desc: '使用 Terser（较慢但稳定）' },
      { key: 'swcMinify: true', safe: false, desc: '使用 SWC（快速但可能卡住）' },
      { key: 'optimizeCss: false', safe: true, desc: 'CSS 优化已禁用' },
      { key: 'optimizeCss: true', safe: false, desc: 'CSS 优化启用（可能卡住）' },
      { key: 'turbo: false', safe: true, desc: 'Turbopack 已禁用' },
      { key: 'turbo: true', safe: false, desc: 'Turbopack 启用（实验性）' },
    ];
    
    checks.forEach(check => {
      if (configContent.includes(check.key)) {
        const icon = check.safe ? '✓' : '⚠️';
        console.log(`  ${icon} ${check.key} - ${check.desc}`);
        if (!check.safe) {
          diagnostics.issues.push(`配置可能导致卡顿: ${check.key}`);
        }
      }
    });
    
    // 检查是否存在 webpack 配置
    if (configContent.includes('webpack:')) {
      console.log('  ✓ 包含自定义 webpack 配置');
    }
  }
} catch (err) {
  console.log(`  ⚠️  读取配置失败: ${err.message}`);
}

// 6. 生成修复建议
console.log('\n[6/6] 生成修复建议...\n');

const commonIssues = [
  {
    symptom: '构建卡在 "Creating an optimized production build" > 3 分钟',
    cause: 'Terser minify 卡住（Windows 常见）',
    solution: [
      '1. 应用调试配置：copy debug-next.config.js next.config.js',
      '2. 或手动添加到 next.config.js: swcMinify: false',
      '3. 增加内存：$env:NODE_OPTIONS="--max-old-space-size=8192"',
    ],
  },
  {
    symptom: '报错 "SWC failed to compile" 或 "Segmentation fault"',
    cause: 'SWC 编译器崩溃',
    solution: [
      '1. 降级 SWC：npm install @swc/core@1.3.100',
      '2. 或禁用：next.config.js 添加 swcMinify: false',
      '3. 使用调试配置：npm run build:debug',
    ],
  },
  {
    symptom: '卡在 "Finalizing page optimization"',
    cause: 'Critters CSS 优化卡住',
    solution: [
      '1. 禁用 CSS 优化：experimental: { optimizeCss: false }',
      '2. 或使用调试配置：copy debug-next.config.js next.config.js',
    ],
  },
  {
    symptom: 'Cannot find module "@cloudbase/node-sdk"',
    cause: '代码仍引用已卸载的依赖',
    solution: [
      '1. 删除旧 .js 文件：Remove-Item src/ai/flows/*.js',
      '2. 修复 TypeScript 文件中的 require() 调用',
      '3. 运行：npm run clean-deps',
    ],
  },
  {
    symptom: 'JavaScript heap out of memory',
    cause: 'Node.js 内存不足',
    solution: [
      '1. 临时：$env:NODE_OPTIONS="--max-old-space-size=8192"',
      '2. 永久：系统环境变量添加 NODE_OPTIONS=--max-old-space-size=8192',
      '3. 禁用优化减少内存使用',
    ],
  },
];

console.log('📋 常见构建问题诊断:\n');
commonIssues.forEach((issue, index) => {
  console.log(`${index + 1}. ${issue.symptom}`);
  console.log(`   原因: ${issue.cause}`);
  console.log('   解决方案:');
  issue.solution.forEach(step => console.log(`     ${step}`));
  console.log('');
});

// 输出当前问题汇总
if (diagnostics.issues.length > 0) {
  console.log('⚠️  发现的问题:');
  diagnostics.issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. ${issue}`);
  });
  console.log('');
}

if (diagnostics.recommendations.length > 0) {
  console.log('💡 推荐操作:');
  diagnostics.recommendations.forEach((rec, i) => {
    console.log(`  ${i + 1}. ${rec}`);
  });
  console.log('');
}

// 快速修复命令
console.log('🚀 快速修复命令:\n');
console.log('# 方案 A：使用调试配置（最安全）');
console.log('copy debug-next.config.js next.config.js');
console.log('npm run build');
console.log('');
console.log('# 方案 B：清理缓存 + 增加内存');
console.log('Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue');
console.log('$env:NODE_OPTIONS="--max-old-space-size=8192"');
console.log('npm run build');
console.log('');
console.log('# 方案 C：完全重置');
console.log('npm run clean-deps');
console.log('Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue');
console.log('copy debug-next.config.js next.config.js');
console.log('npm ci');
console.log('npm run build');
console.log('');

// 保存诊断报告
const reportPath = path.join(process.cwd(), 'build-diagnosis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(diagnostics, null, 2));
console.log(`✅ 诊断报告已保存: ${reportPath}\n`);
