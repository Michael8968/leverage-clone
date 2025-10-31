'use strict';

/**
 * TCB API转换: 将Firebase云函数 'getUploadUrlForMediaAsset' 转为API端点 '/api/v1/multimodal/getUploadUrlForMediaAsset'。
 * 输入: 文件名和类型 (JSON body)。
 * 输出: 上传URL和资源ID (JSON)。
 * 集成: TCB SDK (db/auth), COS上传URL生成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: Gen Signed URL for COS upload，预创DB 'media_assets'记录。输入: {fileName, type}。输出: {uploadUrl, assetId}。验证: URL时效<1h，上传成功。
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
    console.log(`开始处理getUploadUrlForMediaAsset请求...`, { userId: user.uid, data: requestData });

    const result = await processGetUploadUrlForMediaAsset(db, user, requestData);

    console.log(`✅ getUploadUrlForMediaAsset处理完成`);

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
    console.error(`❌ getUploadUrlForMediaAsset处理失败:`, error);

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
    // 检查必需字段：fileName, type
    const requiredFields = ['fileName', 'type'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证fileName是字符串
    if (typeof data.fileName !== 'string' || data.fileName.trim() === '') {
      return {
        valid: false,
        message: 'fileName必须是非空字符串~',
        details: { invalidField: 'fileName' }
      };
    }

    // 验证fileName长度和格式
    if (data.fileName.length > 255) {
      return {
        valid: false,
        message: 'fileName长度不能超过255字符~',
        details: { invalidField: 'fileName' }
      };
    }

    // 验证type是有效的媒体类型
    const validTypes = ['image', 'video', 'audio', 'document'];
    if (!validTypes.includes(data.type)) {
      return {
        valid: false,
        message: `type必须是以下之一: ${validTypes.join(', ')}~`,
        details: { invalidField: 'type' }
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
 * 处理getUploadUrlForMediaAsset的主要业务逻辑
 * TCB API: Gen Signed URL for COS upload，预创DB 'media_assets'记录。输入: {fileName, type}。输出: {uploadUrl, assetId}。验证: URL时效<1h，上传成功。
 */
async function processGetUploadUrlForMediaAsset(db, user, data) {
  try {
    const { fileName, type } = data;

    // 1. 生成唯一的资源ID
    const assetId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 2. 预创建媒体资源记录
    await createMediaAssetRecord(db, assetId, user.uid, fileName, type);

    // 3. 生成COS签名上传URL
    const uploadUrl = await generateCOSSignedUrl(assetId, fileName, type);

    return {
      assetId: assetId,
      uploadUrl: uploadUrl,
      fileName: fileName,
      type: type,
      expiresIn: 3600, // 1小时
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`获取上传URL失败: ${error.message}`);
  }
}

/**
 * 调用COS上传URL生成服务
 */
async function callAICOSURL(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 预创建媒体资源记录
 */
async function createMediaAssetRecord(db, assetId, userId, fileName, type) {
  try {
    const mediaAssetsCollection = db.collection('media_assets');

    const assetRecord = {
      _id: assetId,
      userId: userId,
      fileName: fileName,
      type: type,
      status: 'pending_upload', // pending_upload, uploaded, processing, analyzed, failed
      uploadUrl: null,
      publicUrl: null,
      fileSize: null,
      mimeType: null,
      analysis: null, // 分析结果将存储在这里
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1小时后过期
    };

    await mediaAssetsCollection.add(assetRecord);

    console.log(`✅ 媒体资源记录已创建: ${assetId}`);
    return assetId;

  } catch (error) {
    console.error('创建媒体资源记录失败:', error);
    throw new Error('创建资源记录失败');
  }
}

/**
 * 生成COS签名上传URL
 */
async function generateCOSSignedUrl(assetId, fileName, type) {
  try {
    console.log(`生成COS签名URL: ${assetId}, ${fileName}, ${type}`);

    // 这里应该调用实际的COS SDK生成签名URL
    // 暂时使用模拟URL
    const bucketName = process.env.COS_BUCKET_NAME || 'leverage-media-assets';
    const region = process.env.COS_REGION || 'ap-shanghai';
    const cosBaseUrl = `https://${bucketName}.cos.${region}.myqcloud.com`;

    // 生成对象键
    const objectKey = `media/${assetId}/${fileName}`;
    const signedUrl = `${cosBaseUrl}/${objectKey}?signature=mock_signature&expires=3600`;

    console.log(`✅ COS签名URL已生成: ${signedUrl}`);
    return signedUrl;

  } catch (error) {
    console.error('生成COS签名URL失败:', error);
    throw new Error('生成上传URL失败');
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;