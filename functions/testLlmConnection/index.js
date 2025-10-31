'use strict';

/**
 * TCB API转换: 将Firebase云函数 'testLlmConnection' 转为API端点 '/api/v1/admin/testLlmConnection'。
 * 输入: connectionId (JSON body)。
 * 输出: 连接测试结果 (JSON)。
 * 集成: TCB SDK (db/auth), LiteLLM。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 从DB 'llmConnections' 读ID配置，调用LiteLLM测试请求 (prompt: 'Hello')，写回'status: success/fail'。输入: {connectionId}。输出: {result: 'pass', details}。验证: 模拟API密钥，检查DB更新。
 */

const cloudbase = require('@cloudbase/node-sdk');
const OpenAI = require('openai');

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
    console.log(`开始处理testLlmConnection请求...`, { userId: user.uid, data: requestData });

    const result = await processTestLlmConnection(db, user, requestData);

    console.log(`✅ testLlmConnection处理完成`);

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
    console.error(`❌ testLlmConnection处理失败:`, error);

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
    // 检查必需字段：connectionId
    const requiredFields = ['connectionId'];

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
 * 处理testLlmConnection的主要业务逻辑
 * TCB API: 从DB 'llmConnections' 读ID配置，调用LiteLLM测试请求 (prompt: 'Hello')，写回'status: success/fail'。
 * 输入: {connectionId}。输出: {result: 'pass', details}。
 */
async function processTestLlmConnection(db, user, data) {
  try {
    const { connectionId } = data;

    // 1. 从DB 'llmConnections' 读取配置
    const connectionRef = db.collection('llmConnections').doc(connectionId);
    const connectionDoc = await connectionRef.get();

    if (!connectionDoc.data || connectionDoc.data.length === 0) {
      throw new Error('未找到指定的LLM连接配置');
    }

    const connection = connectionDoc.data[0] || connectionDoc.data;

    // 2. 验证配置完整性
    if (!connection.apiKey || !connection.modelName) {
      throw new Error('连接配置不完整，缺少API密钥或模型名称');
    }

    // 3. 调用LiteLLM测试请求
    const testResult = await testWithLiteLLM(connection);

    // 4. 写回测试状态到数据库
    const updateData = {
      lastTestStatus: testResult.success ? 'success' : 'fail',
      lastTestTime: new Date().toISOString(),
      lastTestDetails: testResult.details
    };

    await connectionRef.update(updateData);

    // 5. 返回测试结果
    return {
      result: testResult.success ? 'pass' : 'fail',
      details: testResult.details,
      connectionId: connectionId,
      modelName: connection.modelName,
      provider: connection.provider,
      testedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`测试连接失败: ${error.message}`);
  }
}

/**
 * 调用LiteLLM服务进行连接测试
 */
async function testWithLiteLLM(connection) {
  try {
    // 使用LiteLLM代理URL
    const liteLLMUrl = process.env.LITELLM_PROXY_URL || 'http://localhost:4000/v1';

    // 初始化OpenAI客户端连接到LiteLLM
    const client = new OpenAI({
      apiKey: connection.apiKey,
      baseURL: liteLLMUrl
    });

    // 发送测试请求
    const testPrompt = 'Hello';
    const response = await client.chat.completions.create({
      model: connection.modelName,
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50,
      temperature: 0.1
    });

    // 检查响应
    if (response.choices && response.choices.length > 0) {
      const reply = response.choices[0].message?.content || '';
      return {
        success: true,
        details: {
          response: reply.substring(0, 100), // 只返回前100个字符
          tokens_used: response.usage?.total_tokens || 0,
          model: connection.modelName,
          provider: connection.provider
        }
      };
    } else {
      return {
        success: false,
        details: {
          error: 'No response from LiteLLM',
          model: connection.modelName
        }
      };
    }

  } catch (error) {
    console.error('LiteLLM测试失败:', error);
    return {
      success: false,
      details: {
        error: error.message,
        model: connection.modelName,
        provider: connection.provider
      }
    };
  }
}


/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;