#!/usr/bin/env node

/**
 * TCB API转换工具: 将Firebase云函数转为API端点
 * 用法: node scripts/convert-firebase-to-tcb-api.js <functionName> <category> <inputDesc> <outputDesc> [aiIntegration]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 4) {
  console.log('用法: node scripts/convert-firebase-to-tcb-api.js <functionName> <category> <inputDesc> <outputDesc> [aiIntegration]');
  console.log('示例: node scripts/convert-firebase-to-tcb-api.js recommendProducts shopping "用户偏好和预算" "产品推荐列表" "AI导购"');
  process.exit(1);
}

const [functionName, category, inputDesc, outputDesc, aiIntegration] = args;

console.log(`🔄 转换Firebase云函数 '${functionName}' 为TCB API端点...`);

// 工具函数：首字母大写
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 创建functions目录结构
const functionsDir = path.join(__dirname, '..', 'functions', functionName);
const functionsIndexPath = path.join(functionsDir, 'index.js');
const postmanTestPath = path.join(__dirname, `${functionName}-postman-test.json`);

// 确保functions目录存在
if (!fs.existsSync(path.join(__dirname, '..', 'functions'))) {
  fs.mkdirSync(path.join(__dirname, '..', 'functions'), { recursive: true });
}

if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir, { recursive: true });
}

// 生成云函数代码
const functionCode = `'use strict';

/**
 * TCB API转换: 将Firebase云函数 '${functionName}' 转为API端点 '/api/v1/${category}/${functionName}'。
 * 输入: ${inputDesc} (JSON body)。
 * 输出: ${outputDesc} (JSON)。
 * 集成: TCB SDK (db/auth)${aiIntegration ? `, ${aiIntegration}` : ''}。
 * PRD: 链接AI导购功能。
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
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

    // 验证输入数据
    const validation = validateInput(requestData);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: validation.message || '输入数据有误哦~',
          error: 'VALIDATION_FAILED',
          details: validation.details
        }),
      };
    }

    // 执行主要业务逻辑
    console.log(\`开始处理${functionName}请求...\`, { userId: user.uid, data: requestData });

    const result = await process${capitalizeFirst(functionName)}(db, user, requestData);

    console.log(\`✅ ${functionName}处理完成\`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '操作成功啦~',
        data: result
      }),
    };

  } catch (error) {
    console.error(\`❌ ${functionName}处理失败:\`, error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: error.message || '服务暂时不可用，请稍后再试哦~',
        error: 'INTERNAL_ERROR'
      }),
    };
  }
};

/**
 * 验证输入数据
 */
function validateInput(data) {
  try {
    // TODO: 根据实际需求添加验证逻辑
    // 示例验证：检查必需字段
    const requiredFields = []; // 添加必需字段名

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: \`缺少必需字段: \${field}~\`,
          details: { missingField: field }
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: '数据验证失败~',
      details: { error: error.message }
    };
  }
}

/**
 * 处理${functionName}的主要业务逻辑
 */
async function process${capitalizeFirst(functionName)}(db, user, data) {
  try {
    // TODO: 实现具体的业务逻辑
    // 示例：查询数据库
    // const collection = db.collection('your_collection');
    // const result = await collection.where({ userId: user.uid }).get();

    // 示例：调用AI服务
    ${aiIntegration ? `// 集成${aiIntegration}服务
    // const aiResult = await callAI${capitalizeFirst(aiIntegration.replace(/[^a-zA-Z0-9]/g, ''))}(data);
    ` : ''}

    // 示例返回数据结构
    return {
      ${functionName}Id: \`temp_\${Date.now()}\`,
      userId: user.uid,
      timestamp: new Date().toISOString(),
      result: {
        message: '${outputDesc}',
        processed: true
      }
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error('处理请求时出现错误，请稍后再试~');
  }
}

${aiIntegration ? `/**
 * 调用${aiIntegration}服务
 */
async function callAI${capitalizeFirst(aiIntegration.replace(/[^a-zA-Z0-9]/g, ''))}(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}
` : ''}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;`;

// 生成Postman测试JSON
const postmanTest = {
  "info": {
    "name": `${functionName} API测试`,
    "description": `测试转换后的TCB API端点: /api/v1/${category}/${functionName}`,
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": `POST /api/v1/${category}/${functionName}`,
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer YOUR_JWT_TOKEN_HERE",
            "description": "替换为实际的JWT token"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": JSON.stringify({
            "exampleField": "示例值",
            "description": `${inputDesc}的示例数据`
          }, null, 2)
        },
        "url": {
          "raw": `{{baseUrl}}/api/v1/${category}/${functionName}`,
          "host": ["{{baseUrl}}"],
          "path": ["api", "v1", category, functionName]
        },
        "description": `测试${functionName}功能，输入: ${inputDesc}，输出: ${outputDesc}`
      },
      "response": [
        {
          "name": "成功响应",
          "originalRequest": {},
          "status": "OK",
          "code": 200,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "cookie": [],
          "body": JSON.stringify({
            "success": true,
            "message": "操作成功啦~",
            "data": {
              "exampleOutput": `${outputDesc}的示例数据`,
              "timestamp": "2025-10-31T12:00:00.000Z"
            }
          }, null, 2)
        },
        {
          "name": "未授权",
          "originalRequest": {},
          "status": "Unauthorized",
          "code": 401,
          "_postman_previewlanguage": "json",
          "header": [],
          "cookie": [],
          "body": JSON.stringify({
            "success": false,
            "message": "请先登录哦~",
            "error": "UNAUTHORIZED"
          }, null, 2)
        },
        {
          "name": "验证失败",
          "originalRequest": {},
          "status": "Bad Request",
          "code": 400,
          "_postman_previewlanguage": "json",
          "header": [],
          "cookie": [],
          "body": JSON.stringify({
            "success": false,
            "message": "输入数据有误哦~",
            "error": "VALIDATION_FAILED"
          }, null, 2)
        }
      ]
    },
    {
      "name": `OPTIONS /api/v1/${category}/${functionName} (CORS)`,
      "request": {
        "method": "OPTIONS",
        "header": [
          {
            "key": "Origin",
            "value": "http://localhost:3000"
          },
          {
            "key": "Access-Control-Request-Method",
            "value": "POST"
          },
          {
            "key": "Access-Control-Request-Headers",
            "value": "Content-Type, Authorization"
          }
        ],
        "url": {
          "raw": `{{baseUrl}}/api/v1/${category}/${functionName}`,
          "host": ["{{baseUrl}}"],
          "path": ["api", "v1", category, functionName]
        },
        "description": "测试CORS预检请求"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-tcb-domain.com",
      "type": "string",
      "description": "替换为实际的TCB域名"
    }
  ]
};

// 写入文件
fs.writeFileSync(functionsIndexPath, functionCode, 'utf8');
fs.writeFileSync(postmanTestPath, JSON.stringify(postmanTest, null, 2), 'utf8');

console.log(`✅ 转换完成！`);
console.log(`📁 云函数文件: functions/${functionName}/index.js`);
console.log(`🧪 Postman测试: scripts/${functionName}-postman-test.json`);
console.log('');
console.log('📋 下一步操作:');
console.log(`1. 编辑 functions/${functionName}/index.js 中的业务逻辑`);
console.log(`2. 更新 cloudbaserc.json 添加函数配置`);
console.log(`3. 部署到腾讯云Base: tcb functions:deploy ${functionName}`);
console.log(`4. 使用Postman测试API端点`);
console.log('');
console.log('🔗 API端点:');
console.log(`   POST https://your-domain.com/api/v1/${category}/${functionName}`);
console.log(`   输入: ${inputDesc} (JSON body)`);
console.log(`   输出: ${outputDesc} (JSON)`);
console.log(`   认证: Bearer Token (JWT)`);
console.log(`   CORS: 已启用`);