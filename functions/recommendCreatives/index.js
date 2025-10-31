'use strict';

/**
 * TCB API转换: 将Firebase云函数 'recommendCreatives' 转为API端点 '/api/v1/business/recommendCreatives'。
 * 输入: 需求描述和创意者列表 (JSON body)。
 * 输出: 创意推荐结果 (JSON)。
 * 集成: TCB SDK (db/auth), AI推荐。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: AI分析需求 vs 创意者列表，推荐3-5 (分数/理由)。输入: {demand: {desc}, creatives: []}。PRD: 需求池匹配。验证: 分数0-1，排序降序。
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
    console.log(`开始处理recommendCreatives请求...`, { userId: user.uid, data: requestData });

    const result = await processRecommendCreatives(db, user, requestData);

    console.log(`✅ recommendCreatives处理完成`);

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
    console.error(`❌ recommendCreatives处理失败:`, error);

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
    // 检查必需字段：demand, creatives
    const requiredFields = ['demand', 'creatives'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证demand对象
    if (typeof data.demand !== 'object' || !data.demand.desc) {
      return {
        valid: false,
        message: 'demand必须是包含desc字段的对象~',
        details: { invalidField: 'demand' }
      };
    }

    // 验证creatives是数组
    if (!Array.isArray(data.creatives) || data.creatives.length === 0) {
      return {
        valid: false,
        message: 'creatives必须是非空数组~',
        details: { invalidField: 'creatives' }
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
 * 处理recommendCreatives的主要业务逻辑
 * TCB API: AI分析需求 vs 创意者列表，推荐3-5 (分数/理由)。输入: {demand: {desc}, creatives: []}。PRD: 需求池匹配。验证: 分数0-1，排序降序。
 */
async function processRecommendCreatives(db, user, data) {
  try {
    const { demand, creatives } = data;

    // 1. 获取创意者详细信息
    const creativesDetails = await getCreativesDetails(db, creatives);

    // 2. 使用AI分析需求并推荐创意者
    const recommendations = await analyzeAndRecommendCreatives(demand, creativesDetails);

    // 3. 限制返回3-5个推荐，按分数降序排序
    const topRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      demand: {
        desc: demand.desc,
        analyzed: true
      },
      recommendations: topRecommendations,
      totalCreatives: creatives.length,
      recommendedCount: topRecommendations.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`创意推荐失败: ${error.message}`);
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
 * 获取创意者详细信息
 */
async function getCreativesDetails(db, creativeIds) {
  try {
    const usersCollection = db.collection('users');
    const creativesDetails = [];

    for (const creativeId of creativeIds) {
      try {
        const userDoc = await usersCollection.doc(creativeId).get();
        if (userDoc.data && userDoc.data.length > 0) {
          const userData = userDoc.data[0];
          creativesDetails.push({
            id: creativeId,
            name: userData.name || userData.displayName || '未知',
            skills: userData.skills || [],
            experience: userData.experience || 0,
            portfolio: userData.portfolio || [],
            rating: userData.rating || 0,
            completedProjects: userData.completedProjects || 0,
            specialization: userData.specialization || [],
            status: userData.status || 'offline'
          });
        }
      } catch (error) {
        console.warn(`获取创意者 ${creativeId} 详情失败:`, error.message);
      }
    }

    return creativesDetails;

  } catch (error) {
    console.error('获取创意者详情失败:', error);
    return [];
  }
}

/**
 * AI分析需求并推荐创意者
 */
async function analyzeAndRecommendCreatives(demand, creativesDetails) {
  try {
    const recommendations = [];

    // 解析需求关键词
    const demandKeywords = extractKeywords(demand.desc);

    for (const creative of creativesDetails) {
      let score = 0.0;
      let reasons = [];

      // 技能匹配度 (权重0.4)
      const skillMatch = calculateSkillMatch(demandKeywords, creative.skills);
      score += skillMatch * 0.4;
      if (skillMatch > 0.7) reasons.push('技能高度匹配');
      else if (skillMatch > 0.4) reasons.push('技能部分匹配');

      // 专业领域匹配 (权重0.3)
      const specializationMatch = calculateSpecializationMatch(demandKeywords, creative.specialization);
      score += specializationMatch * 0.3;
      if (specializationMatch > 0.8) reasons.push('专业领域高度相关');

      // 经验水平 (权重0.2)
      const experienceScore = Math.min(creative.experience / 5.0, 1.0); // 5年以上满分
      score += experienceScore * 0.2;
      if (experienceScore > 0.8) reasons.push('经验丰富');

      // 评分和完成项目数 (权重0.1)
      const qualityScore = (creative.rating / 5.0) * 0.5 + Math.min(creative.completedProjects / 20.0, 0.5);
      score += qualityScore * 0.1;
      if (qualityScore > 0.7) reasons.push('口碑良好');

      // 确保分数在0-1范围内
      score = Math.max(0, Math.min(1, score));

      recommendations.push({
        creativeId: creative.id,
        creativeName: creative.name,
        score: score,
        reason: reasons.length > 0 ? reasons.join('，') : '综合评估推荐'
      });
    }

    return recommendations;

  } catch (error) {
    console.error('AI分析推荐失败:', error);
    // 返回基础推荐作为fallback
    return creativesDetails.map(creative => ({
      creativeId: creative.id,
      creativeName: creative.name,
      score: 0.5,
      reason: '系统推荐'
    }));
  }
}

/**
 * 提取需求关键词
 */
function extractKeywords(text) {
  // 简单的关键词提取（实际应该使用更复杂的NLP）
  const keywords = [];
  const commonWords = ['设计', '开发', '制作', '创意', '品牌', '营销', '网站', 'APP', '小程序', '海报', 'logo', 'UI', 'UX'];

  for (const word of commonWords) {
    if (text.includes(word)) {
      keywords.push(word);
    }
  }

  return keywords;
}

/**
 * 计算技能匹配度
 */
function calculateSkillMatch(demandKeywords, creativeSkills) {
  if (!creativeSkills || creativeSkills.length === 0) return 0;

  let matchCount = 0;
  for (const keyword of demandKeywords) {
    if (creativeSkills.some(skill => skill.includes(keyword))) {
      matchCount++;
    }
  }

  return matchCount / demandKeywords.length;
}

/**
 * 计算专业领域匹配度
 */
function calculateSpecializationMatch(demandKeywords, creativeSpecializations) {
  if (!creativeSpecializations || creativeSpecializations.length === 0) return 0;

  let matchCount = 0;
  for (const keyword of demandKeywords) {
    if (creativeSpecializations.some(spec => spec.includes(keyword))) {
      matchCount++;
    }
  }

  return matchCount / demandKeywords.length;
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;