'use strict';

/**
 * TCB API转换: 将Firebase云函数 'batchUpdateUsers' 转为API端点 '/api/v1/user/batchUpdateUsers'。
 * 输入: 用户ID列表和更新数据 (JSON body)。
 * 输出: 批量更新结果 (JSON)。
 * 集成: TCB SDK (db/auth), 无AI集成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 批量更新DB 'users' (e.g., set role/star/status for userIds)。输入: {userIds: [], updates: {role: 'creator'}}。输出: {updated: N}。PRD: 管理员批量管理。验证: 选2用户，检查DB变更。
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
    console.log(`开始处理batchUpdateUsers请求...`, { userId: user.uid, data: requestData });

    const result = await processBatchUpdateUsers(db, user, requestData);

    console.log(`✅ batchUpdateUsers处理完成`);

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
    console.error(`❌ batchUpdateUsers处理失败:`, error);

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
    // 检查必需字段：userIds, updates
    const requiredFields = ['userIds', 'updates'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证userIds是数组
    if (!Array.isArray(data.userIds) || data.userIds.length === 0) {
      return {
        valid: false,
        message: 'userIds必须是非空数组~',
        details: { invalidField: 'userIds' }
      };
    }

    // 验证updates是对象
    if (typeof data.updates !== 'object' || data.updates === null) {
      return {
        valid: false,
        message: 'updates必须是对象~',
        details: { invalidField: 'updates' }
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
 * 处理batchUpdateUsers的主要业务逻辑
 * TCB API: 批量更新DB 'users' (e.g., set role/star/status for userIds)。输入: {userIds: [], updates: {role: 'creator'}}。输出: {updated: N}。
 */
async function processBatchUpdateUsers(db, user, data) {
  try {
    const { userIds, updates } = data;

    // 添加更新时间戳
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid
    };

    // 批量更新用户
    const usersCollection = db.collection('users');
    let updatedCount = 0;

    // CloudBase不支持原生的批量更新，这里使用循环更新
    for (const userId of userIds) {
      try {
        const userRef = usersCollection.doc(userId);
        await userRef.update(updatesWithTimestamp);
        updatedCount++;
        console.log(`✅ 更新用户 ${userId} 成功`);
      } catch (updateError) {
        console.error(`❌ 更新用户 ${userId} 失败:`, updateError.message);
        // 继续处理其他用户，不因单个失败而中断
      }
    }

    // 记录批量操作日志
    await logBatchOperation(db, {
      operation: 'batchUpdateUsers',
      operatorId: user.uid,
      targetUserIds: userIds,
      updates: updatesWithTimestamp,
      updatedCount: updatedCount,
      totalRequested: userIds.length
    });

    return {
      updated: updatedCount,
      requested: userIds.length,
      failed: userIds.length - updatedCount,
      updates: updatesWithTimestamp
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`批量更新用户失败: ${error.message}`);
  }
}

/**
 * 调用无AI集成服务
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
 * 记录批量操作日志
 */
async function logBatchOperation(db, operationData) {
  try {
    const logsCollection = db.collection('batch_operation_logs');
    await logsCollection.add({
      ...operationData,
      timestamp: new Date().toISOString()
    });
    console.log('✅ 批量操作日志记录成功');
  } catch (error) {
    console.error('❌ 批量操作日志记录失败:', error.message);
    // 日志记录失败不影响主要业务流程
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;