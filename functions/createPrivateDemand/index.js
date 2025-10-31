'use strict';

/**
 * TCB API转换: 将Firebase云函数 'createPrivateDemand' 转为API端点 '/api/v1/business/createPrivateDemand'。
 * 输入: 用户ID、设计师ID和需求描述 (JSON body)。
 * 输出: 私有需求创建结果 (JSON)。
 * 集成: TCB SDK (db/auth), 无AI集成。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 创建DB 'demands' (private) + 'chats'，基于designer status决定初始msg (AI/本人)。输入: {userId, designerId, desc}。PRD: 智能分诊。验证: demand/chat记录创建。
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
    console.log(`开始处理createPrivateDemand请求...`, { userId: user.uid, data: requestData });

    const result = await processCreatePrivateDemand(db, user, requestData);

    console.log(`✅ createPrivateDemand处理完成`);

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
    console.error(`❌ createPrivateDemand处理失败:`, error);

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
    // 检查必需字段：userId, designerId, desc
    const requiredFields = ['userId', 'designerId', 'desc'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证字段类型
    if (typeof data.userId !== 'string' || data.userId.trim() === '') {
      return {
        valid: false,
        message: 'userId必须是非空字符串~',
        details: { invalidField: 'userId' }
      };
    }

    if (typeof data.designerId !== 'string' || data.designerId.trim() === '') {
      return {
        valid: false,
        message: 'designerId必须是非空字符串~',
        details: { invalidField: 'designerId' }
      };
    }

    if (typeof data.desc !== 'string' || data.desc.trim() === '') {
      return {
        valid: false,
        message: 'desc必须是非空字符串~',
        details: { invalidField: 'desc' }
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
 * 处理createPrivateDemand的主要业务逻辑
 * TCB API: 创建DB 'demands' (private) + 'chats'，基于designer status决定初始msg (AI/本人)。输入: {userId, designerId, desc}。PRD: 智能分诊。验证: demand/chat记录创建。
 */
async function processCreatePrivateDemand(db, user, data) {
  try {
    const { userId, designerId, desc } = data;

    // 1. 检查设计师状态
    const designerStatus = await getDesignerStatus(db, designerId);

    // 2. 创建私有需求记录
    const demandId = await createPrivateDemand(db, userId, designerId, desc);

    // 3. 创建聊天记录
    const chatId = await createDemandChat(db, demandId, userId, designerId, desc, designerStatus);

    // 4. 发送初始消息
    const initialMessage = await sendInitialMessage(db, chatId, userId, designerId, desc, designerStatus);

    return {
      demandId: demandId,
      chatId: chatId,
      userId: userId,
      designerId: designerId,
      status: 'created',
      initialMessageSent: true,
      designerStatus: designerStatus,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`创建私有需求失败: ${error.message}`);
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
 * 获取设计师状态
 */
async function getDesignerStatus(db, designerId) {
  try {
    const usersCollection = db.collection('users');
    const designerDoc = await usersCollection.doc(designerId).get();

    if (!designerDoc.data || designerDoc.data.length === 0) {
      throw new Error('设计师不存在');
    }

    const designerData = designerDoc.data[0];
    return designerData.status || 'offline'; // online/offline/busy等

  } catch (error) {
    console.error('获取设计师状态失败:', error);
    return 'offline'; // 默认离线
  }
}

/**
 * 创建私有需求记录
 */
async function createPrivateDemand(db, userId, designerId, desc) {
  try {
    const demandsCollection = db.collection('demands');
    const demandId = `demand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const demandData = {
      _id: demandId,
      userId: userId,
      designerId: designerId,
      desc: desc,
      type: 'private',
      status: 'pending', // pending/accepted/completed/cancelled
      priority: 'normal', // low/normal/high/urgent
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      budget: null,
      deadline: null
    };

    await demandsCollection.add(demandData);

    console.log(`✅ 私有需求创建成功: ${demandId}`);
    return demandId;

  } catch (error) {
    console.error('创建私有需求失败:', error);
    throw new Error('创建需求记录失败');
  }
}

/**
 * 创建需求聊天记录
 */
async function createDemandChat(db, demandId, userId, designerId, desc, designerStatus) {
  try {
    const chatsCollection = db.collection('chats');
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const chatData = {
      _id: chatId,
      demandId: demandId,
      participants: [userId, designerId],
      type: 'demand_private',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      messageCount: 0
    };

    await chatsCollection.add(chatData);

    console.log(`✅ 需求聊天创建成功: ${chatId}`);
    return chatId;

  } catch (error) {
    console.error('创建需求聊天失败:', error);
    throw new Error('创建聊天记录失败');
  }
}

/**
 * 发送初始消息
 */
async function sendInitialMessage(db, chatId, userId, designerId, desc, designerStatus) {
  try {
    const messagesCollection = db.collection('messages');
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 根据设计师状态决定初始消息内容
    let initialMessage = '';
    let senderId = '';
    let senderType = '';

    if (designerStatus === 'online') {
      // 设计师在线，由设计师发送欢迎消息
      initialMessage = `您好！我收到了您的需求："${desc}"。我很乐意为您提供帮助，请详细描述一下您的具体需求和期望。`;
      senderId = designerId;
      senderType = 'designer';
    } else {
      // 设计师离线，由AI助手发送消息
      initialMessage = `您好！您的需求："${desc}" 已提交。我们会尽快安排设计师与您联系。请稍等片刻。`;
      senderId = 'ai_assistant';
      senderType = 'ai';
    }

    const messageData = {
      _id: messageId,
      chatId: chatId,
      senderId: senderId,
      senderType: senderType,
      content: initialMessage,
      type: 'text',
      timestamp: new Date().toISOString(),
      readBy: [senderId] // 发送者已读
    };

    await messagesCollection.add(messageData);

    // 更新聊天记录的最后消息时间和消息数量
    const chatsCollection = db.collection('chats');
    await chatsCollection.doc(chatId).update({
      lastMessageAt: new Date().toISOString(),
      messageCount: 1,
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ 初始消息发送成功: ${messageId}`);
    return {
      messageId: messageId,
      content: initialMessage,
      senderType: senderType
    };

  } catch (error) {
    console.error('发送初始消息失败:', error);
    throw new Error('发送初始消息失败');
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;