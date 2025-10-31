'use strict';

/**
 * TCB API转换: 将Firebase云函数 'recommendProducts' 转为API端点 '/api/v1/shopping/recommendProducts'。
 * 输入: 用户偏好和预算信息 (JSON body)。
 * 输出: 个性化产品推荐列表 (JSON)。
 * 集成: TCB SDK (db/auth), AI导购。
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
    console.log(`开始处理recommendProducts请求...`, { userId: user.uid, data: requestData });

    const result = await processRecommendProducts(db, user, requestData);

    console.log(`✅ recommendProducts处理完成`);

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
    console.error(`❌ recommendProducts处理失败:`, error);

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
          message: `缺少必需字段: ${field}~`,
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
 * 处理recommendProducts的主要业务逻辑
 */
async function processRecommendProducts(db, user, data) {
  try {
    // TODO: 实现具体的业务逻辑
    // 示例：查询数据库
    // const collection = db.collection('your_collection');
    // const result = await collection.where({ userId: user.uid }).get();

    // 示例：调用AI服务
    // 集成AI导购服务
    // const aiResult = await callAIAI(data);
    

    // 示例返回数据结构
    return {
      recommendProductsId: `temp_${Date.now()}`,
      userId: user.uid,
      timestamp: new Date().toISOString(),
      result: {
        message: '个性化产品推荐列表',
        processed: true
      }
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error('处理请求时出现错误，请稍后再试~');
  }
}

/**
 * 调用AI导购服务
 */
async function callAIAI(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}


/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;