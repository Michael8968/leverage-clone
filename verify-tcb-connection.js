#!/usr/bin/env node

/**
 * TCB 数据库连接验证脚本
 * 用于在 Docker 容器内或生产环境验证数据库配置
 */

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

console.log(`${BLUE}=== TCB 数据库连接验证 ===${RESET}\n`);

let allPassed = true;

// 检查 1: 环境变量
console.log(`${YELLOW}检查 1/4: 环境变量${RESET}`);
const requiredEnvVars = [
  'TCB_ENV_ID',
  'CLOUDBASE_SECRET_ID',
  'CLOUDBASE_SECRET_KEY'
];

const optionalEnvVars = [
  'CLOUDBASE_ENV_ID',
  'TENCENTCLOUD_SECRET_ID',
  'TENCENTCLOUD_SECRET_KEY'
];

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (value) {
    // 脱敏显示
    const masked = value.length > 8 
      ? value.substring(0, 8) + '***' 
      : '***';
    console.log(`  ${GREEN}✓${RESET} ${envVar}: ${masked}`);
  } else {
    console.log(`  ${RED}✗${RESET} ${envVar}: 未设置`);
    allPassed = false;
  }
}

for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  if (value) {
    const masked = value.length > 8 
      ? value.substring(0, 8) + '***' 
      : '***';
    console.log(`  ${GREEN}✓${RESET} ${envVar}: ${masked} (可选)`);
  }
}

console.log();

// 检查 2: @cloudbase/node-sdk 模块
console.log(`${YELLOW}检查 2/4: @cloudbase/node-sdk 模块${RESET}`);
let tcbModule;
try {
  tcbModule = require('@cloudbase/node-sdk');
  const version = require('@cloudbase/node-sdk/package.json').version;
  console.log(`  ${GREEN}✓${RESET} @cloudbase/node-sdk 已安装 (版本 ${version})`);
} catch (err) {
  console.log(`  ${RED}✗${RESET} @cloudbase/node-sdk 未找到`);
  console.log(`  错误: ${err.message}`);
  allPassed = false;
}

console.log();

// 检查 3: TCB 初始化
console.log(`${YELLOW}检查 3/4: TCB 应用初始化${RESET}`);
if (tcbModule && process.env.TCB_ENV_ID && process.env.CLOUDBASE_SECRET_ID && process.env.CLOUDBASE_SECRET_KEY) {
  try {
    const app = tcbModule.init({
      env: process.env.TCB_ENV_ID,
      secretId: process.env.CLOUDBASE_SECRET_ID,
      secretKey: process.env.CLOUDBASE_SECRET_KEY,
      region: process.env.CLOUDBASE_REGION || process.env.TCB_REGION || 'ap-shanghai'
    });
    console.log(`  ${GREEN}✓${RESET} TCB 应用初始化成功`);
    
    // 检查 4: 数据库连接
    console.log();
    console.log(`${YELLOW}检查 4/4: 数据库连接测试${RESET}`);
    
    const db = app.database();
    console.log(`  ${GREEN}✓${RESET} 数据库实例创建成功`);
    
    // 尝试查询 users 集合
    (async () => {
      try {
        const result = await db.collection('users').limit(1).get();
        console.log(`  ${GREEN}✓${RESET} 数据库查询成功`);
        console.log(`  ${BLUE}ℹ${RESET} users 集合记录数: ${result.data ? result.data.length : 0}`);
        
        console.log();
        console.log(`${GREEN}========================================${RESET}`);
        console.log(`${GREEN}✅ 所有检查通过!${RESET}`);
        console.log(`${GREEN}TCB 数据库连接正常,可以使用真实数据库${RESET}`);
        console.log(`${GREEN}========================================${RESET}`);
        process.exit(0);
      } catch (err) {
        console.log(`  ${RED}✗${RESET} 数据库查询失败`);
        console.log(`  错误: ${err.message}`);
        console.log();
        console.log(`${RED}========================================${RESET}`);
        console.log(`${RED}❌ 数据库连接失败${RESET}`);
        console.log(`${YELLOW}请检查:${RESET}`);
        console.log(`  1. TCB 环境 ID 是否正确`);
        console.log(`  2. Secret ID/Key 是否有效`);
        console.log(`  3. 数据库是否已创建 users 集合`);
        console.log(`  4. 网络连接是否正常`);
        console.log(`${RED}========================================${RESET}`);
        process.exit(1);
      }
    })();
    
  } catch (err) {
    console.log(`  ${RED}✗${RESET} TCB 应用初始化失败`);
    console.log(`  错误: ${err.message}`);
    allPassed = false;
  }
} else {
  console.log(`  ${YELLOW}⚠${RESET} 跳过(缺少必需的环境变量或模块)`);
  allPassed = false;
}

if (!allPassed) {
  console.log();
  console.log(`${RED}========================================${RESET}`);
  console.log(`${RED}❌ 检查未通过${RESET}`);
  console.log(`${YELLOW}系统将使用本地 mock 数据库${RESET}`);
  console.log(`${YELLOW}用户注册不会写入真实 TCB 数据库${RESET}`);
  console.log(`${RED}========================================${RESET}`);
  process.exit(1);
}
