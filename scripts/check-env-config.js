#!/usr/bin/env node

/**
 * 环境变量配置检查脚本
 * 验证所有必需的环境变量是否已正确配置
 */

require('dotenv').config({ path: '.env.local' });

const envConfig = {
  critical: [
    { key: 'TCB_ENV_ID', desc: 'TCB 环境 ID' },
    { key: 'TCB_SECRET_ID', desc: 'TCB Secret ID' },
    { key: 'TCB_SECRET_KEY', desc: 'TCB Secret Key' },
    { key: 'JWT_SECRET', desc: 'JWT 密钥' }
  ],
  important: [
    { key: 'HUNYUAN_API_KEY', desc: 'Hunyuan AI API Key' },
    { key: 'HUNYUAN_BASE_URL', desc: 'Hunyuan 基础 URL' },
    { key: 'TENCENTCLOUD_REGION', desc: '腾讯云区域' }
  ],
  optional: [
    { key: 'OPENAI_API_KEY', desc: 'OpenAI API Key (可选)' },
    { key: 'GEMINI_API_KEY', desc: 'Gemini API Key (可选 - 3D)' },
    { key: 'TRIPO3D_API_KEY', desc: 'Tripo3D API Key (可选 - 3D)' },
    { key: 'COS_BUCKET', desc: 'COS 存储桶 (可选)' },
    { key: 'LITELLM_PROXY_URL', desc: 'LiteLLM 代理 URL (可选)' }
  ]
};

function checkEnvConfig() {
  console.log('🔍 环境变量配置检查\n');
  console.log('='.repeat(70));

  let allCriticalOk = true;
  let importantIssues = [];

  // 检查关键环境变量
  console.log('\n🚨 关键配置 (必需):');
  envConfig.critical.forEach(({ key, desc }) => {
    const value = process.env[key];
    if (value) {
      const maskedValue = key.includes('SECRET') || key.includes('KEY') 
        ? '*'.repeat(Math.min(value.length, 20)) 
        : value.substring(0, 30) + '...';
      console.log(`  ✅ ${desc.padEnd(25)} ${maskedValue}`);
    } else {
      console.log(`  ❌ ${desc.padEnd(25)} 未设置`);
      allCriticalOk = false;
    }
  });

  // 检查重要环境变量
  console.log('\n⚠️  重要配置 (强烈推荐):');
  envConfig.important.forEach(({ key, desc }) => {
    const value = process.env[key];
    if (value) {
      const maskedValue = key.includes('KEY') 
        ? '*'.repeat(Math.min(value.length, 20)) 
        : value.substring(0, 30) + '...';
      console.log(`  ✅ ${desc.padEnd(25)} ${maskedValue}`);
    } else {
      console.log(`  ⚠️  ${desc.padEnd(25)} 未设置`);
      importantIssues.push(key);
    }
  });

  // 检查可选环境变量
  console.log('\n📋 可选配置:');
  let optionalCount = 0;
  envConfig.optional.forEach(({ key, desc }) => {
    const value = process.env[key];
    if (value) {
      const maskedValue = key.includes('KEY') 
        ? '*'.repeat(Math.min(value.length, 20)) 
        : value.substring(0, 30) + '...';
      console.log(`  ✅ ${desc.padEnd(30)} ${maskedValue}`);
      optionalCount++;
    } else {
      console.log(`  ○  ${desc.padEnd(30)} 未设置`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 配置检查总结:');
  
  if (allCriticalOk) {
    console.log('  ✅ 所有关键配置已设置');
  } else {
    console.log('  ❌ 部分关键配置缺失，应用可能无法正常运行');
  }

  if (importantIssues.length === 0) {
    console.log('  ✅ 所有重要配置已设置');
  } else {
    console.log(`  ⚠️  ${importantIssues.length} 个重要配置缺失: ${importantIssues.join(', ')}`);
    console.log('     某些 AI 功能可能受限');
  }

  console.log(`  📋 ${optionalCount}/${envConfig.optional.length} 个可选配置已设置`);

  console.log('\n💡 建议:');
  if (!allCriticalOk) {
    console.log('  1. 请在 .env.local 文件中补充缺失的关键配置');
    console.log('  2. 关键配置缺失将导致应用无法启动或核心功能失效');
  }
  if (importantIssues.length > 0) {
    console.log('  1. 考虑配置 Hunyuan API 以启用完整的 AI 功能');
    console.log('  2. 检查腾讯云控制台获取 API Key');
  }
  if (allCriticalOk && importantIssues.length === 0) {
    console.log('  ✨ 配置完善！应用已准备好部署。');
  }

  return {
    allCriticalOk,
    importantIssues,
    optionalCount
  };
}

if (require.main === module) {
  const result = checkEnvConfig();
  process.exit(result.allCriticalOk ? 0 : 1);
}

module.exports = { checkEnvConfig };
