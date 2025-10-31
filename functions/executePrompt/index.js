'use strict';

/**
 * TCB API转换: 将Firebase云函数 'executePrompt' 转为API端点 '/api/v1/core/executePrompt'。
 * 输入: 场景和用户参数 (JSON body)。
 * 输出: AI响应结果 (JSON)。
 * 集成: TCB SDK (db/auth), LiteLLM和积分系统。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 网关-扣积分 (DB 'users.points')，选模型/提示 (from 'prompts')，调用LiteLLM/Gemini。输入: {scenario, userId, promptVars}。输出: {response, cost}。PRD: 所有AI统一入口。验证: 积分-1，响应非空。
 */

const cloudbase = require('@cloudbase/node-sdk');
const OpenAI = require('openai');
const { wrapCloudFunctionHandler, initTCBApp } = require('../../scripts/tcb-cloud-function-utils');

exports.main = wrapCloudFunctionHandler(async (event, context) => {
  // 初始化TCB
  const app = initTCBApp();
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
      body: JSON.stringify({
        success: false,
        message: '请先登录哦~',
        error: 'UNAUTHORIZED'
      })
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
      body: JSON.stringify({
        success: false,
        message: '请求数据格式不正确呢~',
        error: 'INVALID_JSON'
      })
    };
  }

  // 验证输入数据
  const validation = validateInput(requestData);
  if (!validation.valid) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: validation.message || '输入数据有误哦~',
        error: 'VALIDATION_FAILED',
        details: validation.details
      })
    };
  }

  // 执行主要业务逻辑
  console.log(`开始处理executePrompt请求...`, { userId: user.uid, data: requestData });

  const result = await processExecutePrompt(db, user, requestData);

  console.log(`✅ executePrompt处理完成`);

  return {
    success: true,
    message: '操作成功啦~',
    data: result
  };
});/**
 * 验证输入数据
 */
function validateInput(data) {
  try {
    // 检查必需字段：scenario, userId, promptVars
    const requiredFields = ['scenario', 'userId', 'promptVars'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证promptVars是对象
    if (typeof data.promptVars !== 'object') {
      return {
        valid: false,
        message: 'promptVars必须是对象类型~',
        details: { invalidField: 'promptVars' }
      };
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
 * 处理executePrompt的主要业务逻辑
 * TCB API: 网关-扣积分 (DB 'users.points')，选模型/提示 (from 'prompts')，调用LiteLLM/Gemini。输入: {scenario, userId, promptVars}。输出: {response, cost}。
 */
async function processExecutePrompt(db, user, data) {
  try {
    const { scenario, userId, promptVars } = data;

    // 1. 验证用户积分是否足够
    const userPoints = await getUserPoints(db, userId);
    if (userPoints < 1) {
      throw new Error('积分不足，请先充值~');
    }

    // 2. 获取提示模板
    const promptTemplate = await getPromptTemplate(db, scenario);
    if (!promptTemplate) {
      throw new Error(`未找到场景 "${scenario}" 对应的提示模板`);
    }

    // 3. 选择AI模型和连接
    const aiConnection = await selectAIConnection(db);
    if (!aiConnection) {
      throw new Error('暂无可用的AI模型连接');
    }

    // 4. 构建完整提示
    const fullPrompt = buildPrompt(promptTemplate.template, promptVars);

    // 5. 调用AI服务
    const aiResult = await callAIService(aiConnection, fullPrompt);

    // 6. 扣除积分
    await deductUserPoints(db, userId, 1);

    // 7. 记录使用日志
    await logUsage(db, {
      userId,
      scenario,
      model: aiConnection.modelName,
      cost: 1,
      timestamp: new Date().toISOString()
    });

    // 8. 返回结果
    return {
      response: aiResult.response,
      cost: 1,
      model: aiConnection.modelName,
      scenario: scenario,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`执行提示失败: ${error.message}`);
  }
}

/**
 * 调用LiteLLM和积分系统服务
 */
async function callAILiteLLM和积分系统(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 获取用户积分
 */
async function getUserPoints(db, userId) {
  try {
    const usersCollection = db.collection('users');
    const userDoc = await usersCollection.doc(userId).get();

    if (!userDoc.data || userDoc.data.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userDoc.data[0] || userDoc.data;
    return user.points || 0;
  } catch (error) {
    console.error('获取用户积分失败:', error);
    throw new Error('无法获取用户积分信息');
  }
}

/**
 * 获取提示模板
 */
async function getPromptTemplate(db, scenario) {
  try {
    const promptsCollection = db.collection('prompts');
    const query = promptsCollection.where({
      scene: scenario,
      status: 'active'
    });

    const result = await query.get();

    if (!result.data || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  } catch (error) {
    console.error('获取提示模板失败:', error);
    throw new Error('无法获取提示模板');
  }
}

/**
 * 选择AI连接
 */
async function selectAIConnection(db) {
  try {
    const connectionsCollection = db.collection('llmConnections');
    const query = connectionsCollection.where({
      status: '活跃'
    }).orderBy('priority', 'desc').limit(1);

    const result = await query.get();

    if (!result.data || result.data.length === 0) {
      return null;
    }

    return result.data[0];
  } catch (error) {
    console.error('选择AI连接失败:', error);
    throw new Error('无法选择AI连接');
  }
}

/**
 * 构建完整提示
 */
function buildPrompt(template, variables) {
  let prompt = template;
  // 简单的变量替换
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    prompt = prompt.replace(regex, variables[key]);
  });
  return prompt;
}

/**
 * 调用AI服务
 */
async function callAIService(connection, prompt) {
  try {
    const liteLLMUrl = process.env.LITELLM_PROXY_URL || 'http://localhost:4000/v1';

    const client = new OpenAI({
      apiKey: connection.apiKey,
      baseURL: liteLLMUrl
    });

    const response = await client.chat.completions.create({
      model: connection.modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('AI服务未返回有效响应');
    }

    return {
      response: response.choices[0].message?.content || '',
      tokens: response.usage?.total_tokens || 0
    };

  } catch (error) {
    console.error('AI服务调用失败:', error);
    throw new Error(`AI调用失败: ${error.message}`);
  }
}

/**
 * 扣除用户积分
 */
async function deductUserPoints(db, userId, points) {
  try {
    const usersCollection = db.collection('users');
    const userRef = usersCollection.doc(userId);

    // 获取当前积分
    const userDoc = await userRef.get();
    if (!userDoc.data || userDoc.data.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userDoc.data[0] || userDoc.data;
    const currentPoints = user.points || 0;

    if (currentPoints < points) {
      throw new Error('积分不足');
    }

    // 更新积分
    await userRef.update({
      points: currentPoints - points,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('扣除积分失败:', error);
    throw new Error('积分扣除失败');
  }
}

/**
 * 记录使用日志
 */
async function logUsage(db, logData) {
  try {
    const logsCollection = db.collection('usage_logs');
    await logsCollection.add({
      ...logData,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('记录使用日志失败:', error);
    // 不抛出错误，因为日志失败不应该影响主要功能
  }
}


/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;