'use strict';

/**
 * TCB API转换: 将Firebase云函数 'getPrompts' 转为API端点 '/api/v1/admin/getPrompts'。
 * 输入: 无输入参数 (JSON body)。
 * 输出: 提示模板列表 (JSON)。
 * 集成: TCB SDK (db/auth), 无AI集成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 查询DB 'prompts' where status='active'。输出: [{id, template, scene}]。PRD: 用于AI场景下拉。验证: 返回>0条，过滤'inactive'。
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  // CORS预检处理
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: {'Access-Control-Allow-Origin': '*'} };

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

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
    console.log(`开始处理getPrompts请求...`, { userId: user.uid, data: requestData });

    const result = await processGetPrompts(db, user, requestData);

    console.log(`✅ getPrompts处理完成`);

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
    console.error(`❌ getPrompts处理失败:`, error);

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
 * 处理getPrompts的主要业务逻辑
 * TCB API: 查询DB 'prompts' where status='active'。输出: [{id, template, scene}]。PRD: 用于AI场景下拉。
 */
async function processGetPrompts(db, user, data) {
  try {
    // 查询DB 'prompts' 表，条件是 status='active'
    const promptsCollection = db.collection('prompts');
    const query = promptsCollection.where({
      status: 'active'
    });

    const result = await query.get();

    if (!result.data || result.data.length === 0) {
      return {
        prompts: [],
        total: 0,
        message: '暂无活跃的提示模板'
      };
    }

    // 格式化输出：[{id, template, scene}]
    const prompts = result.data.map(prompt => ({
      id: prompt._id || prompt.id,
      template: prompt.template || prompt.content || '',
      scene: prompt.scene || prompt.category || 'general'
    }));

    return {
      prompts: prompts,
      total: prompts.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error('获取提示模板失败，请稍后再试~');
  }
}

/**
 * 调用无AI集成服务
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