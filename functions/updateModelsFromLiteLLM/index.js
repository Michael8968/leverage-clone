'use strict';

/**
 * TCB API转换: 将Firebase云函数 'updateModelsFromLiteLLM' 转为API端点 '/api/v1/admin/updateModelsFromLiteLLM'。
 * 输入: 无输入参数 (JSON body)。
 * 输出: 模型更新结果 (JSON)。
 * 集成: TCB SDK (db/auth), LiteLLM。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 调用LiteLLM /models API，比较DB 'llmModels'，添加新模型 (e.g., {name, provider})。输出: {added: N, total: M}。验证: 手动加1新模型，检查DB增长。
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
    console.log(`开始处理updateModelsFromLiteLLM请求...`, { userId: user.uid, data: requestData });

    const result = await processUpdateModelsFromLiteLLM(db, user, requestData);

    console.log(`✅ updateModelsFromLiteLLM处理完成`);

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
    console.error(`❌ updateModelsFromLiteLLM处理失败:`, error);

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
 * 处理updateModelsFromLiteLLM的主要业务逻辑
 * TCB API: 调用LiteLLM /models API，比较DB 'llmModels'，添加新模型 (e.g., {name, provider})。输出: {added: N, total: M}。
 */
async function processUpdateModelsFromLiteLLM(db, user, data) {
  try {
    // 1. 调用LiteLLM /models API
    const liteLLMModels = await fetchLiteLLMModels();

    if (!liteLLMModels || liteLLMModels.length === 0) {
      throw new Error('无法从LiteLLM获取模型列表');
    }

    // 2. 获取现有模型列表
    const existingModels = await getExistingModels(db);

    // 3. 找出新模型
    const existingModelNames = new Set(existingModels.map(m => m.name));
    const newModels = liteLLMModels.filter(model =>
      !existingModelNames.has(model.name)
    );

    // 4. 添加新模型到数据库
    let added = 0;
    if (newModels.length > 0) {
      const modelsCollection = db.collection('llmModels');

      // 批量添加新模型
      const addPromises = newModels.map(model =>
        modelsCollection.add({
          name: model.name,
          provider: model.provider || 'LiteLLM',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(addPromises);
      added = newModels.length;
    }

    // 5. 返回结果
    return {
      added: added,
      total: liteLLMModels.length,
      existing: existingModels.length,
      newModels: newModels.map(m => m.name),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`更新模型失败: ${error.message}`);
  }
}

/**
 * 调用LiteLLM服务
 */
async function callAILiteLLM(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 从LiteLLM获取模型列表
 */
async function fetchLiteLLMModels() {
  try {
    const liteLLMUrl = process.env.LITELLM_PROXY_URL || 'http://localhost:4000';
    const modelsUrl = `${liteLLMUrl}/v1/models`;

    const response = await fetch(modelsUrl);
    if (!response.ok) {
      throw new Error(`LiteLLM API请求失败: ${response.status}`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('LiteLLM返回的数据格式不正确');
    }

    // 转换格式
    return data.data.map(model => ({
      name: model.id,
      provider: model.id.split('/')[0] || 'LiteLLM'
    }));

  } catch (error) {
    console.error('获取LiteLLM模型失败:', error);
    throw new Error(`无法获取模型列表: ${error.message}`);
  }
}

/**
 * 获取数据库中现有的模型
 */
async function getExistingModels(db) {
  try {
    const modelsCollection = db.collection('llmModels');
    const result = await modelsCollection.get();

    return result.data || [];
  } catch (error) {
    console.error('获取现有模型失败:', error);
    return [];
  }
}


/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;