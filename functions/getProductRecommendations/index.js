'use strict';

/**
 * TCB API转换: 将Firebase云函数 'getProductRecommendations' 转为API端点 '/api/v1/business/getProductRecommendations'。
 * 输入: 用户ID和可选产品列表 (JSON body)。
 * 输出: 产品推荐结果 (JSON)。
 * 集成: TCB SDK (db/auth), AI推荐。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 调用generateUserProfile + AI推荐从DB 'products' 选3-5 ID (理由/分数)。输入: {userId, products: []?}。PRD: AI导购。输出: [{productId, score, reason}]。验证: 推荐>2，调用profile。
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
    console.log(`开始处理getProductRecommendations请求...`, { userId: user.uid, data: requestData });

    const result = await processGetProductRecommendations(db, user, requestData);

    console.log(`✅ getProductRecommendations处理完成`);

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
    console.error(`❌ getProductRecommendations处理失败:`, error);

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
    // 检查必需字段：userId
    const requiredFields = ['userId'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证userId是字符串
    if (typeof data.userId !== 'string' || data.userId.trim() === '') {
      return {
        valid: false,
        message: 'userId必须是非空字符串~',
        details: { invalidField: 'userId' }
      };
    }

    // 验证products是可选的数组
    if (data.products !== undefined && !Array.isArray(data.products)) {
      return {
        valid: false,
        message: 'products必须是数组~',
        details: { invalidField: 'products' }
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
 * 处理getProductRecommendations的主要业务逻辑
 * TCB API: 调用generateUserProfile + AI推荐从DB 'products' 选3-5 ID (理由/分数)。输入: {userId, products: []?}。PRD: AI导购。输出: [{productId, score, reason}]。验证: 推荐>2，调用profile。
 */
async function processGetProductRecommendations(db, user, data) {
  try {
    const { userId, products: excludedProducts = [] } = data;

    // 1. 获取用户档案信息
    const userProfile = await getUserProfile(db, userId);

    // 2. 获取产品列表（排除已指定的产品）
    const availableProducts = await getAvailableProducts(db, excludedProducts);

    // 3. 使用AI生成产品推荐
    const recommendations = await generateProductRecommendations(userProfile, availableProducts);

    // 4. 限制返回3-5个推荐
    const finalRecommendations = recommendations.slice(0, 5);

    return {
      userId: userId,
      recommendations: finalRecommendations,
      totalAvailable: availableProducts.length,
      recommendedCount: finalRecommendations.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`获取产品推荐失败: ${error.message}`);
  }
}

/**
 * 调用AI推荐服务
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
 * 获取用户档案信息
 */
async function getUserProfile(db, userId) {
  try {
    const usersCollection = db.collection('users');
    const userDoc = await usersCollection.doc(userId).get();

    if (!userDoc.data || userDoc.data.length === 0) {
      throw new Error('用户不存在');
    }

    const userData = userDoc.data[0];

    // 构建用户档案
    return {
      userId: userId,
      preferences: userData.preferences || [],
      purchaseHistory: userData.purchaseHistory || [],
      interests: userData.interests || [],
      budget: userData.budget || 'medium',
      category: userData.category || 'general'
    };

  } catch (error) {
    console.error('获取用户档案失败:', error);
    // 返回默认档案
    return {
      userId: userId,
      preferences: [],
      purchaseHistory: [],
      interests: [],
      budget: 'medium',
      category: 'general'
    };
  }
}

/**
 * 获取可用产品列表
 */
async function getAvailableProducts(db, excludedProducts = []) {
  try {
    const productsCollection = db.collection('products');

    // 获取所有活跃产品
    const query = productsCollection.where({
      status: 'active'
    });

    const productsResult = await query.get();
    const allProducts = productsResult.data || [];

    // 排除指定的产品
    const availableProducts = allProducts.filter(product =>
      !excludedProducts.includes(product._id)
    );

    return availableProducts.map(product => ({
      id: product._id,
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      tags: product.tags || []
    }));

  } catch (error) {
    console.error('获取产品列表失败:', error);
    return [];
  }
}

/**
 * 使用AI生成产品推荐
 */
async function generateProductRecommendations(userProfile, availableProducts) {
  try {
    // 如果产品太少，直接返回所有产品
    if (availableProducts.length <= 5) {
      return availableProducts.map(product => ({
        productId: product.id,
        score: 0.8,
        reason: '基于用户偏好推荐'
      }));
    }

    // 模拟AI推荐逻辑（实际应该调用executePrompt或其他AI服务）
    const recommendations = [];

    // 基于用户偏好和产品标签进行匹配
    for (const product of availableProducts) {
      let score = 0.5; // 基础分数
      let reasons = [];

      // 偏好匹配
      if (userProfile.preferences && userProfile.preferences.length > 0) {
        const preferenceMatch = product.tags.some(tag =>
          userProfile.preferences.includes(tag)
        );
        if (preferenceMatch) {
          score += 0.2;
          reasons.push('匹配用户偏好');
        }
      }

      // 兴趣匹配
      if (userProfile.interests && userProfile.interests.length > 0) {
        const interestMatch = product.tags.some(tag =>
          userProfile.interests.includes(tag)
        );
        if (interestMatch) {
          score += 0.15;
          reasons.push('符合用户兴趣');
        }
      }

      // 预算考虑
      if (userProfile.budget && product.price) {
        const price = parseFloat(product.price);
        if (userProfile.budget === 'low' && price < 100) {
          score += 0.1;
          reasons.push('符合预算范围');
        } else if (userProfile.budget === 'medium' && price >= 100 && price <= 500) {
          score += 0.1;
          reasons.push('符合预算范围');
        } else if (userProfile.budget === 'high' && price > 500) {
          score += 0.1;
          reasons.push('符合预算范围');
        }
      }

      // 类别匹配
      if (userProfile.category && product.category === userProfile.category) {
        score += 0.1;
        reasons.push('类别匹配');
      }

      recommendations.push({
        productId: product.id,
        score: Math.min(score, 1.0), // 最高1.0
        reason: reasons.length > 0 ? reasons.join('，') : '综合推荐'
      });
    }

    // 按分数降序排序
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;

  } catch (error) {
    console.error('AI推荐生成失败:', error);
    // 返回前3个产品作为fallback
    return availableProducts.slice(0, 3).map(product => ({
      productId: product.id,
      score: 0.5,
      reason: '系统推荐'
    }));
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;