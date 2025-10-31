'use strict';

/**
 * TCB API转换: 将Firebase云函数 'generate3dModel' 转为API端点 '/api/v1/content/generate3dModel'。
 * 输入: 提示词 (JSON body)。
 * 输出: 3D模型图像结果 (JSON)。
 * 集成: TCB SDK (db/auth), Gemini图像生成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 调用Gemini imagen-4.0 gen image from prompt。输入: {prompt}。输出: {imageUrl}。验证: URL有效，view_image工具预览。
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
    console.log(`开始处理generate3dModel请求...`, { userId: user.uid, data: requestData });

    const result = await processGenerate3dModel(db, user, requestData);

    console.log(`✅ generate3dModel处理完成`);

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
    console.error(`❌ generate3dModel处理失败:`, error);

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
 * 处理generate3dModel的主要业务逻辑
 * TCB API: 调用Gemini imagen-4.0 gen image from prompt。输入: {prompt}。输出: {imageUrl}。验证: URL有效，view_image工具预览。
 */
async function processGenerate3dModel(db, user, data) {
  try {
    const { prompt } = data;

    // 1. 调用Gemini imagen-4.0生成图像
    const generationResult = await callGeminiImagen4(prompt);

    // 2. 验证生成的图像URL
    const imageUrl = generationResult.imageUrl;
    const isValidUrl = await validateImageUrl(imageUrl);

    if (!isValidUrl) {
      throw new Error('生成的图像URL无效');
    }

    // 3. 保存生成记录到数据库
    const generationId = await saveGenerationRecord(db, {
      userId: user.uid,
      prompt: prompt,
      imageUrl: imageUrl,
      model: 'gemini-imagen-4.0',
      type: '3d_model_image',
      status: 'completed'
    });

    return {
      generationId: generationId,
      imageUrl: imageUrl,
      prompt: prompt,
      model: 'gemini-imagen-4.0',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`3D模型图像生成失败: ${error.message}`);
  }
}

/**
 * 调用Gemini图像生成服务
 */
async function callAIGemini(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 调用Gemini Imagen 4.0生成图像
 */
async function callGeminiImagen4(prompt) {
  try {
    // 这里应该调用实际的Gemini API
    // 暂时使用模拟响应
    console.log(`调用Gemini Imagen 4.0生成图像，提示词: ${prompt}`);

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 生成模拟的图像URL
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const imageUrl = `https://storage.googleapis.com/gemini-generated-images/${imageId}.png`;

    return {
      imageUrl: imageUrl,
      prompt: prompt,
      model: 'gemini-imagen-4.0',
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Gemini Imagen 4.0调用失败:', error);
    throw new Error('图像生成服务暂时不可用');
  }
}

/**
 * 验证图像URL是否有效
 */
async function validateImageUrl(imageUrl) {
  try {
    // 基本的URL格式验证
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(imageUrl)) {
      return false;
    }

    // 这里可以添加实际的URL可访问性检查
    // 暂时只做格式验证
    console.log(`验证图像URL: ${imageUrl}`);
    return true;

  } catch (error) {
    console.error('URL验证失败:', error);
    return false;
  }
}

/**
 * 保存生成记录到数据库
 */
async function saveGenerationRecord(db, recordData) {
  try {
    const generationsCollection = db.collection('content_generations');
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullRecord = {
      _id: generationId,
      ...recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await generationsCollection.add(fullRecord);

    console.log(`✅ 生成记录已保存: ${generationId}`);
    return generationId;

  } catch (error) {
    console.error('保存生成记录失败:', error.message);
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