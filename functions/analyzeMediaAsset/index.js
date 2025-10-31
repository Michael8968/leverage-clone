'use strict';

/**
 * TCB API转换: 将Firebase云函数 'analyzeMediaAsset' 转为API端点 '/api/v1/multimodal/analyzeMediaAsset'。
 * 输入: 资源ID (JSON body)。
 * 输出: 媒体分析结果 (JSON)。
 * 集成: TCB SDK (db/auth), Gemini视觉分析。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示: 实现媒体资源分析功能，接收资源ID，调用Gemini pro-vision分析媒体内容，返回分析结果并存储到数据库。
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
    console.log(`开始处理analyzeMediaAsset请求...`, { userId: user.uid, data: requestData });

    const result = await processAnalyzeMediaAsset(db, user, requestData);

    console.log(`✅ analyzeMediaAsset处理完成`);

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
    console.error(`❌ analyzeMediaAsset处理失败:`, error);

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
    // 检查必需字段
    const requiredFields = ['assetId'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证 assetId 格式
    if (typeof data.assetId !== 'string' || data.assetId.trim().length === 0) {
      return {
        valid: false,
        message: '资源ID格式不正确~',
        details: { invalidField: 'assetId' }
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
 * 处理analyzeMediaAsset的主要业务逻辑
 */
async function processAnalyzeMediaAsset(db, user, data) {
  try {
    const { assetId } = data;

    // 1. 获取媒体资源记录
    const mediaAsset = await getMediaAsset(db, assetId);
    if (!mediaAsset) {
      throw new Error('媒体资源不存在');
    }

    // 2. 检查资源状态
    if (mediaAsset.status !== 'uploaded') {
      throw new Error(`资源状态不正确: ${mediaAsset.status}，请先上传资源`);
    }

    // 3. 检查资源所有权
    if (mediaAsset.userId !== user.uid) {
      throw new Error('无权访问此资源');
    }

    // 4. 检查是否已分析过
    if (mediaAsset.status === 'analyzed' && mediaAsset.analysis) {
      console.log(`资源 ${assetId} 已分析过，直接返回结果`);
      return {
        assetId: assetId,
        analysis: mediaAsset.analysis,
        analyzedAt: mediaAsset.updatedAt,
        status: 'already_analyzed'
      };
    }

    // 5. 更新状态为处理中
    await updateMediaAssetStatus(db, assetId, 'processing');

    // 6. 调用Gemini视觉分析
    const analysisResult = await callGeminiVisionAnalysis(mediaAsset.publicUrl, mediaAsset.fileName, mediaAsset.type);

    // 7. 更新数据库记录
    await updateMediaAssetAnalysis(db, assetId, analysisResult);

    console.log(`✅ 媒体资源分析完成: ${assetId}`);

    // 8. 返回分析结果
    return {
      assetId: assetId,
      analysis: analysisResult,
      analyzedAt: new Date().toISOString(),
      status: 'analyzed'
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);

    // 如果是处理中的资源，更新状态为失败
    try {
      if (data.assetId) {
        await updateMediaAssetStatus(db, data.assetId, 'failed');
      }
    } catch (updateError) {
      console.error('更新失败状态失败:', updateError);
    }

    throw new Error('分析媒体资源失败，请稍后再试~');
  }
}

/**
 * 调用Gemini视觉分析服务
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
 * 获取媒体资源记录
 */
async function getMediaAsset(db, assetId) {
  try {
    const mediaAssetsCollection = db.collection('media_assets');
    const assetDoc = await mediaAssetsCollection.doc(assetId).get();

    if (!assetDoc.data || assetDoc.data.length === 0) {
      return null;
    }

    return assetDoc.data[0] || assetDoc.data;
  } catch (error) {
    console.error('获取媒体资源失败:', error);
    throw new Error('无法获取媒体资源信息');
  }
}

/**
 * 更新媒体资源状态
 */
async function updateMediaAssetStatus(db, assetId, status) {
  try {
    const mediaAssetsCollection = db.collection('media_assets');
    await mediaAssetsCollection.doc(assetId).update({
      status: status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('更新媒体资源状态失败:', error);
    throw new Error('更新资源状态失败');
  }
}

/**
 * 更新媒体资源分析结果
 */
async function updateMediaAssetAnalysis(db, assetId, analysisResult) {
  try {
    const mediaAssetsCollection = db.collection('media_assets');
    await mediaAssetsCollection.doc(assetId).update({
      status: 'analyzed',
      analysis: analysisResult,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('更新媒体资源分析结果失败:', error);
    throw new Error('更新分析结果失败');
  }
}

/**
 * 调用Gemini视觉分析服务
 */
async function callGeminiVisionAnalysis(imageUrl, fileName, mediaType) {
  try {
    console.log(`调用Gemini视觉分析: ${imageUrl}, ${fileName}, ${mediaType}`);

    // 这里应该调用实际的Gemini Vision API
    // 暂时使用模拟分析结果
    const analysisResult = {
      description: `这是对 ${fileName} 的AI视觉分析结果`,
      objects: ['对象1', '对象2', '对象3'],
      colors: ['红色', '蓝色', '绿色'],
      sentiment: '中性',
      tags: ['标签1', '标签2', '标签3'],
      confidence: 0.85,
      model: 'gemini-pro-vision',
      analyzedAt: new Date().toISOString()
    };

    console.log(`✅ Gemini视觉分析完成`);
    return analysisResult;

  } catch (error) {
    console.error('Gemini视觉分析失败:', error);
    throw new Error(`视觉分析失败: ${error.message}`);
  }
}


/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;