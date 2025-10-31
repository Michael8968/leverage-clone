'use strict';

/**
 * TCB API转换: 将Firebase云函数 'intelligentRoutingFlow' 转为API端点 '/api/v1/business/intelligentRoutingFlow'。
 * 输入: 路由请求信息 (JSON body)。
 * 输出: 路由分配结果 (JSON)。
 * 集成: TCB SDK (db/auth), AI路由。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 读DB 'routingStrategies' + designers status，AI决策分配 (weights: online 0.4等)。输入: {request: {urgency}}。PRD: 智能路由。输出: {assignedTo: 'designerId/ai'}。验证: 分配到在线者。
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
    console.log(`开始处理intelligentRoutingFlow请求...`, { userId: user.uid, data: requestData });

    const result = await processIntelligentRoutingFlow(db, user, requestData);

    console.log(`✅ intelligentRoutingFlow处理完成`);

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
    console.error(`❌ intelligentRoutingFlow处理失败:`, error);

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
    // 检查必需字段：request
    const requiredFields = ['request'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证request对象
    if (typeof data.request !== 'object' || !data.request.urgency) {
      return {
        valid: false,
        message: 'request必须是包含urgency字段的对象~',
        details: { invalidField: 'request' }
      };
    }

    // 验证urgency值
    const validUrgencies = ['low', 'normal', 'high', 'urgent'];
    if (!validUrgencies.includes(data.request.urgency)) {
      return {
        valid: false,
        message: 'urgency必须是: low, normal, high, urgent之一~',
        details: { invalidField: 'request.urgency' }
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
 * 处理intelligentRoutingFlow的主要业务逻辑
 * TCB API: 读DB 'routingStrategies' + designers status，AI决策分配 (weights: online 0.4等)。输入: {request: {urgency}}。PRD: 智能路由。输出: {assignedTo: 'designerId/ai'}。验证: 分配到在线者。
 */
async function processIntelligentRoutingFlow(db, user, data) {
  try {
    const { request } = data;

    // 1. 获取路由策略
    const routingStrategies = await getRoutingStrategies(db);

    // 2. 获取可用设计师列表
    const availableDesigners = await getAvailableDesigners(db);

    // 3. AI决策分配
    const assignmentResult = await performIntelligentAssignment(request, routingStrategies, availableDesigners);

    // 4. 记录路由决策
    await logRoutingDecision(db, {
      request: request,
      assignedTo: assignmentResult.assignedTo,
      assignmentType: assignmentResult.assignmentType,
      decisionFactors: assignmentResult.decisionFactors,
      timestamp: new Date().toISOString()
    });

    return {
      assignedTo: assignmentResult.assignedTo,
      assignmentType: assignmentResult.assignmentType, // 'designer' or 'ai'
      decisionFactors: assignmentResult.decisionFactors,
      urgency: request.urgency,
      availableDesignersCount: availableDesigners.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`智能路由失败: ${error.message}`);
  }
}

/**
 * 调用AI路由服务
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
 * 获取路由策略
 */
async function getRoutingStrategies(db) {
  try {
    const strategiesCollection = db.collection('routingStrategies');
    const strategiesResult = await strategiesCollection.get();
    const strategies = strategiesResult.data || [];

    // 默认路由策略
    const defaultStrategies = {
      weights: {
        online: 0.4,
        experience: 0.3,
        rating: 0.2,
        workload: 0.1
      },
      urgencyMultipliers: {
        low: 1.0,
        normal: 1.2,
        high: 1.5,
        urgent: 2.0
      },
      fallbackToAI: true
    };

    return strategies.length > 0 ? strategies[0] : defaultStrategies;

  } catch (error) {
    console.error('获取路由策略失败:', error);
    // 返回默认策略
    return {
      weights: {
        online: 0.4,
        experience: 0.3,
        rating: 0.2,
        workload: 0.1
      },
      urgencyMultipliers: {
        low: 1.0,
        normal: 1.2,
        high: 1.5,
        urgent: 2.0
      },
      fallbackToAI: true
    };
  }
}

/**
 * 获取可用设计师列表
 */
async function getAvailableDesigners(db) {
  try {
    const usersCollection = db.collection('users');

    // 获取所有设计师用户
    const designersQuery = usersCollection.where({
      role: 'designer'
    });

    const designersResult = await designersQuery.get();
    const allDesigners = designersResult.data || [];

    // 筛选在线设计师
    const availableDesigners = allDesigners.filter(designer =>
      designer.status === 'online' || designer.status === 'available'
    );

    return availableDesigners.map(designer => ({
      id: designer._id,
      name: designer.name || designer.displayName || '未知',
      status: designer.status,
      experience: designer.experience || 0,
      rating: designer.rating || 0,
      currentWorkload: designer.currentWorkload || 0,
      skills: designer.skills || [],
      lastActive: designer.lastActive
    }));

  } catch (error) {
    console.error('获取可用设计师失败:', error);
    return [];
  }
}

/**
 * 执行智能分配
 */
async function performIntelligentAssignment(request, strategies, availableDesigners) {
  try {
    const { urgency } = request;
    const { weights, urgencyMultipliers } = strategies;

    // 如果没有可用设计师，分配给AI
    if (availableDesigners.length === 0) {
      return {
        assignedTo: 'ai_assistant',
        assignmentType: 'ai',
        decisionFactors: {
          reason: 'no_available_designers',
          urgency: urgency
        }
      };
    }

    // 计算每个设计师的分数
    const scoredDesigners = availableDesigners.map(designer => {
      let score = 0;
      const factors = {};

      // 在线状态权重 (0.4)
      const onlineScore = designer.status === 'online' ? 1.0 : 0.5;
      score += onlineScore * weights.online;
      factors.online = onlineScore;

      // 经验权重 (0.3)
      const experienceScore = Math.min(designer.experience / 10.0, 1.0); // 10年以上满分
      score += experienceScore * weights.experience;
      factors.experience = experienceScore;

      // 评分权重 (0.2)
      const ratingScore = designer.rating / 5.0; // 假设评分为0-5
      score += ratingScore * weights.rating;
      factors.rating = ratingScore;

      // 工作负载权重 (0.1) - 负载越低分数越高
      const workloadScore = Math.max(0, 1.0 - (designer.currentWorkload / 10.0)); // 假设最大负载10
      score += workloadScore * weights.workload;
      factors.workload = workloadScore;

      // 紧急程度倍数
      score *= urgencyMultipliers[urgency] || 1.0;

      return {
        ...designer,
        score: score,
        factors: factors
      };
    });

    // 按分数降序排序
    scoredDesigners.sort((a, b) => b.score - a.score);

    // 选择最高分的设计师
    const selectedDesigner = scoredDesigners[0];

    return {
      assignedTo: selectedDesigner.id,
      assignmentType: 'designer',
      decisionFactors: {
        score: selectedDesigner.score,
        factors: selectedDesigner.factors,
        urgencyMultiplier: urgencyMultipliers[urgency],
        totalCandidates: availableDesigners.length
      }
    };

  } catch (error) {
    console.error('智能分配失败:', error);
    // 分配给AI作为fallback
    return {
      assignedTo: 'ai_assistant',
      assignmentType: 'ai',
      decisionFactors: {
        reason: 'assignment_error',
        error: error.message
      }
    };
  }
}

/**
 * 记录路由决策
 */
async function logRoutingDecision(db, decisionData) {
  try {
    const routingLogsCollection = db.collection('routing_decision_logs');
    await routingLogsCollection.add({
      ...decisionData,
      loggedAt: new Date().toISOString()
    });
    console.log('✅ 路由决策已记录');
  } catch (error) {
    console.error('记录路由决策失败:', error.message);
    // 日志失败不影响主要流程
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;