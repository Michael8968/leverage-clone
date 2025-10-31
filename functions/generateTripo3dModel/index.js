'use strict';

/**
 * TCB API转换: 将Firebase云函数 'generateTripo3dModel' 转为API端点 '/api/v1/content/generateTripo3dModel'。
 * 输入: 提示词和可选图像URL (JSON body)。
 * 输出: Tripo3D任务ID (JSON)。
 * 集成: TCB SDK (db/auth), Tripo3D代理。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 代理Tripo3D API创建任务。输入: {prompt, imageUrl?}。输出: {taskId}。验证: taskId非空，后续status调用。
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
    console.log(`开始处理generateTripo3dModel请求...`, { userId: user.uid, data: requestData });

    const result = await processGenerateTripo3dModel(db, user, requestData);

    console.log(`✅ generateTripo3dModel处理完成`);

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
    console.error(`❌ generateTripo3dModel处理失败:`, error);

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
    // 检查必需字段：prompt
    const requiredFields = ['prompt'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证prompt是字符串
    if (typeof data.prompt !== 'string' || data.prompt.trim() === '') {
      return {
        valid: false,
        message: 'prompt必须是非空字符串~',
        details: { invalidField: 'prompt' }
      };
    }

    // 验证prompt长度
    if (data.prompt.length > 1000) {
      return {
        valid: false,
        message: 'prompt长度不能超过1000字符~',
        details: { invalidField: 'prompt' }
      };
    }

    // 验证可选的imageUrl
    if (data.imageUrl !== undefined) {
      if (typeof data.imageUrl !== 'string') {
        return {
          valid: false,
          message: 'imageUrl必须是字符串~',
          details: { invalidField: 'imageUrl' }
        };
      }

      // 验证URL格式
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(data.imageUrl)) {
        return {
          valid: false,
          message: 'imageUrl必须是有效的HTTP/HTTPS URL~',
          details: { invalidField: 'imageUrl' }
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
 * 处理generateTripo3dModel的主要业务逻辑
 * TCB API: 代理Tripo3D API创建任务。输入: {prompt, imageUrl?}。输出: {taskId}。验证: taskId非空，后续status调用。
 */
async function processGenerateTripo3dModel(db, user, data) {
  try {
    const { prompt, imageUrl } = data;

    // 1. 调用Tripo3D API创建任务
    const tripoResult = await callTripo3DCreateTask(prompt, imageUrl);

    // 2. 验证返回的taskId
    if (!tripoResult.taskId || typeof tripoResult.taskId !== 'string') {
      throw new Error('Tripo3D API返回的任务ID无效');
    }

    // 3. 保存任务记录到数据库
    const taskRecordId = await saveTripoTaskRecord(db, {
      userId: user.uid,
      taskId: tripoResult.taskId,
      prompt: prompt,
      imageUrl: imageUrl,
      status: 'processing',
      type: '3d_model_generation'
    });

    return {
      taskId: tripoResult.taskId,
      prompt: prompt,
      imageUrl: imageUrl,
      status: 'processing',
      estimatedTime: tripoResult.estimatedTime || '5-10分钟',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`Tripo3D任务创建失败: ${error.message}`);
  }
}

/**
 * 调用Tripo3D代理服务
 */
async function callAITripo3D(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 调用Tripo3D API创建任务
 */
async function callTripo3DCreateTask(prompt, imageUrl) {
  try {
    console.log(`调用Tripo3D API创建任务，提示词: ${prompt}, 图像URL: ${imageUrl || '无'}`);

    // 这里应该调用实际的Tripo3D API
    // 暂时使用模拟响应
    const taskId = `tripo_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      taskId: taskId,
      status: 'processing',
      estimatedTime: '5-10分钟',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Tripo3D API调用失败:', error);
    throw new Error('3D模型生成服务暂时不可用');
  }
}

/**
 * 保存Tripo任务记录到数据库
 */
async function saveTripoTaskRecord(db, recordData) {
  try {
    const tripoTasksCollection = db.collection('tripo_3d_tasks');
    const recordId = `tripo_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullRecord = {
      _id: recordId,
      ...recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await tripoTasksCollection.add(fullRecord);

    console.log(`✅ Tripo任务记录已保存: ${recordId}`);
    return recordId;

  } catch (error) {
    console.error('保存Tripo任务记录失败:', error.message);
    // 不抛出错误，允许主要功能继续
    return null;
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;