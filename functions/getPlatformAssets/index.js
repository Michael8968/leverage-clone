'use strict';

/**
 * TCB API转换: 将Firebase云函数 'getPlatformAssets' 转为API端点 '/api/v1/admin/getPlatformAssets'。
 * 输入: 无输入参数 (JSON body)。
 * 输出: LLM厂商和模型列表 (JSON)。
 * 集成: TCB SDK (db/auth), 无AI集成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 返回硬编码LLM厂商/模型列表 (e.g., {providers: ['Tencent', 'OpenAI'], models: ['gpt-4', 'hunyuan-pro']})。无DB依赖。输出: JSON列表。验证: 响应包含至少5模型。
 */

const cloudbase = require('@cloudbase/node-sdk');
const { handleTCBError } = require('../../scripts/tcb-error-handler-simple');

// 硬编码的LLM厂商和模型列表
const PLATFORM_ASSETS = {
  providers: [
    'Tencent',
    'OpenAI',
    'Anthropic',
    'Google',
    'DeepSeek',
    'Baichuan',
    'Moonshot',
    'Alibaba',
    'Zhipu',
    '智谱GLM',
    'MiniMax',
    '阶跃星辰',
    '字节跳动',
    '讯飞星火',
    '百度文心一言',
    '华为云',
    'LiteLLM'
  ],
  models: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'hunyuan-standard',
    'hunyuan-pro',
    'hunyuan-lite',
    'hunyuan-turbo',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-latest',
    'deepseek-chat',
    'deepseek-coder',
    'Baichuan2-Turbo',
    'moonshot-v1-8k',
    'qwen-turbo',
    'qwen-plus',
    'glm-4',
    'glm-3-turbo',
    'abab6.5-chat',
    'step-1-8k',
    'Doubao-lite-4k',
    'general',
    'ernie-4.0',
    'mindstudio-v1.0'
  ]
};

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
    console.log(`开始处理getPlatformAssets请求...`, { userId: user.uid, data: requestData });

    const result = await processGetPlatformAssets(db, user, requestData);

    console.log(`✅ getPlatformAssets处理完成`);

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
    console.error(`❌ getPlatformAssets处理失败:`, error);

    // 使用简化错误处理（符合用户示例）
    const friendlyError = handleTCBError(error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify(friendlyError)
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
 * 处理getPlatformAssets的主要业务逻辑
 * TCB API: 返回硬编码LLM厂商/模型列表。无DB依赖。输出: JSON列表。验证: 响应包含至少5模型。
 */
async function processGetPlatformAssets(db, user, data) {
  try {
    // 返回硬编码的LLM厂商和模型列表，无需数据库查询
    return {
      providers: PLATFORM_ASSETS.providers,
      models: PLATFORM_ASSETS.models,
      totalProviders: PLATFORM_ASSETS.providers.length,
      totalModels: PLATFORM_ASSETS.models.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error('获取平台资产时出现错误，请稍后再试~');
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;