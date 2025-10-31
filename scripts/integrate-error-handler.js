#!/usr/bin/env node

/**
 * TCB错误处理批量集成脚本
 * 自动为所有云函数添加错误处理集成
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(__dirname, '..', 'functions');
const ERROR_HANDLER_PATH = path.join(__dirname, 'tcb-error-handler.js');

// 需要集成的函数列表
const FUNCTIONS_TO_INTEGRATE = [
  'getPlatformAssets',
  'getPrompts',
  'executePrompt',
  'batchUpdateUsers',
  'getProductRecommendations',
  'recommendCreatives',
  'createPrivateDemand',
  'clarifyDemandDetails',
  'intelligentRoutingFlow',
  'evaluateSellerData',
  'generate3dModel',
  'generateTripo3dModel',
  'getTripo3dModelStatus',
  'generateNanoBananaImage',
  'getUploadUrlForMediaAsset',
  'analyzeMediaAsset',
  'testLlmConnection',
  'updateModelsFromLiteLLM'
];

class ErrorHandlerIntegrator {
  constructor() {
    this.stats = {
      processed: 0,
      integrated: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * 检查文件是否已经集成
   */
  isAlreadyIntegrated(content) {
    return content.includes("require('../../scripts/tcb-error-handler')") ||
           content.includes('errorHandler.wrapAsync');
  }

  /**
   * 集成错误处理到单个函数
   */
  integrateFunction(functionName) {
    const functionPath = path.join(FUNCTIONS_DIR, functionName, 'index.js');

    try {
      console.log(`📂 处理函数: ${functionName}`);

      // 检查文件是否存在
      if (!fs.existsSync(functionPath)) {
        console.log(`  ⚠️  跳过: 文件不存在 ${functionPath}`);
        this.stats.skipped++;
        return;
      }

      // 读取文件内容
      let content = fs.readFileSync(functionPath, 'utf8');

      // 检查是否已经集成
      if (this.isAlreadyIntegrated(content)) {
        console.log(`  ⏭️  跳过: 已经集成 ${functionName}`);
        this.stats.skipped++;
        return;
      }

      // 添加导入语句
      const importStatement = "const { errorHandler } = require('../../scripts/tcb-error-handler');\n";
      const cloudbaseImportIndex = content.indexOf("const cloudbase = require('@cloudbase/node-sdk');");

      if (cloudbaseImportIndex !== -1) {
        content = content.slice(0, cloudbaseImportIndex) +
                 importStatement +
                 content.slice(cloudbaseImportIndex);
      } else {
        // 如果没有找到cloudbase导入，在文件开头添加
        content = importStatement + content;
      }

      // 查找并替换exports.main函数
      const mainFunctionRegex = /exports\.main\s*=\s*async\s*\(event,\s*context\)\s*=>\s*\{[\s\S]*?\n\};/;
      const mainFunctionMatch = content.match(mainFunctionRegex);

      if (!mainFunctionMatch) {
        console.log(`  ❌ 错误: 无法找到exports.main函数 ${functionName}`);
        this.stats.errors++;
        return;
      }

      const originalMainFunction = mainFunctionMatch[0];

      // 构建新的main函数
      const newMainFunction = this.buildNewMainFunction(originalMainFunction);

      // 替换内容
      content = content.replace(originalMainFunction, newMainFunction);

      // 写回文件
      fs.writeFileSync(functionPath, content, 'utf8');

      console.log(`  ✅ 成功集成: ${functionName}`);
      this.stats.integrated++;
      this.stats.processed++;

    } catch (error) {
      console.log(`  ❌ 错误: 处理 ${functionName} 时出错:`, error.message);
      this.stats.errors++;
      this.stats.processed++;
    }
  }

  /**
   * 构建新的main函数
   */
  buildNewMainFunction(originalFunction) {
    // 提取函数体内容
    const functionBodyMatch = originalFunction.match(/exports\.main\s*=\s*async\s*\(event,\s*context\)\s*=>\s*\{([\s\S]*)\n\};/);

    if (!functionBodyMatch) {
      throw new Error('无法解析函数体');
    }

    const functionBody = functionBodyMatch[1];

    // 查找CORS headers定义
    const corsHeadersMatch = functionBody.match(/const\s+corsHeaders\s*=\s*\{[\s\S]*?\};/);
    const corsHeaders = corsHeadersMatch ? corsHeadersMatch[0] : `const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };`;

    // 构建新的函数体
    const newFunctionBody = `
  // CORS预检处理
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: {'Access-Control-Allow-Origin': '*'} };

  ${corsHeaders}

  // 使用错误处理模块包装主要业务逻辑
  return await errorHandler.wrapAsync(async () => {
    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY,
    });

    const db = app.database();
    const auth = app.auth();

    // Auth check
    let user = null;
    try {
      const ticket = event.headers.authorization || event.headers.Authorization;
      if (ticket) {
        user = await auth.getUserInfo(ticket.replace('Bearer ', ''));
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    if (!user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: '请先登录哦~',
          error: 'UNAUTHORIZED'
        }),
      };
    }

    // 解析请求体
    let requestData = {};
    try {
      if (event.body) {
        requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      }
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: '请求数据格式不正确呢~',
          error: 'INVALID_JSON'
        }),
      };
    }

    // 验证输入数据（如果有的话）
    // const validation = validateInput(requestData);
    // if (!validation.valid) { ... }

    // 执行主要业务逻辑
    console.log(\`开始处理${originalFunction.includes('getPlatformAssets') ? 'getPlatformAssets' : '请求'}...\`, { userId: user.uid, data: requestData });

    const result = await processBusinessLogic(db, user, requestData);

    console.log(\`✅ 处理完成\`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '操作成功啦~',
        data: result
      }),
    };

  }, corsHeaders);
`;

    return `exports.main = async (event, context) => {${newFunctionBody}\n};`;
  }

  /**
   * 验证语法
   */
  validateSyntax(functionName) {
    const functionPath = path.join(FUNCTIONS_DIR, functionName, 'index.js');

    try {
      const { execSync } = require('child_process');
      execSync(`node -c "${functionPath}"`, { stdio: 'pipe' });
      console.log(`  ✅ 语法验证通过: ${functionName}`);
      return true;
    } catch (error) {
      console.log(`  ❌ 语法错误: ${functionName} - ${error.message}`);
      return false;
    }
  }

  /**
   * 运行集成
   */
  async run() {
    console.log('🚀 开始批量集成TCB错误处理模块...\n');

    for (const functionName of FUNCTIONS_TO_INTEGRATE) {
      this.integrateFunction(functionName);

      // 验证语法
      if (!this.validateSyntax(functionName)) {
        this.stats.errors++;
      }
    }

    // 输出统计信息
    console.log('\n📊 集成完成统计:');
    console.log(`  📂 处理的函数: ${this.stats.processed}`);
    console.log(`  ✅ 成功集成: ${this.stats.integrated}`);
    console.log(`  ⏭️  跳过: ${this.stats.skipped}`);
    console.log(`  ❌ 错误: ${this.stats.errors}`);

    if (this.stats.errors === 0) {
      console.log('\n🎉 所有函数集成完成！请运行测试验证功能。');
    } else {
      console.log('\n⚠️  部分函数集成失败，请检查错误日志。');
    }
  }
}

// 运行集成
if (require.main === module) {
  const integrator = new ErrorHandlerIntegrator();
  integrator.run().catch(console.error);
}

module.exports = ErrorHandlerIntegrator;