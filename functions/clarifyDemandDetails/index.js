'use strict';

/**
 * TCB API转换: 将Firebase云函数 'clarifyDemandDetails' 转为API端点 '/api/v1/business/clarifyDemandDetails'。
 * 输入: 聊天ID (JSON body)。
 * 输出: 需求澄清问题列表 (JSON)。
 * 集成: TCB SDK (db/auth), AI澄清。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 读chat上下文，调用executePrompt生成问题，若关键词则路由到intelligentRoutingFlow。输入: {chatId}。输出: {questions: []}。验证: 问题生成，检测'escalate'触发路由。
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
    console.log(`开始处理clarifyDemandDetails请求...`, { userId: user.uid, data: requestData });

    const result = await processClarifyDemandDetails(db, user, requestData);

    console.log(`✅ clarifyDemandDetails处理完成`);

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
    console.error(`❌ clarifyDemandDetails处理失败:`, error);

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
    // 检查必需字段：chatId
    const requiredFields = ['chatId'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证chatId是字符串
    if (typeof data.chatId !== 'string' || data.chatId.trim() === '') {
      return {
        valid: false,
        message: 'chatId必须是非空字符串~',
        details: { invalidField: 'chatId' }
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
 * 处理clarifyDemandDetails的主要业务逻辑
 * TCB API: 读chat上下文，调用executePrompt生成问题，若关键词则路由到intelligentRoutingFlow。输入: {chatId}。输出: {questions: []}。验证: 问题生成，检测'escalate'触发路由。
 */
async function processClarifyDemandDetails(db, user, data) {
  try {
    const { chatId } = data;

    // 1. 获取聊天上下文
    const chatContext = await getChatContext(db, chatId);

    // 2. 调用AI生成澄清问题
    const clarificationResult = await generateClarificationQuestions(chatContext);

    // 3. 检查是否需要升级路由
    const needsRouting = checkForEscalationKeywords(clarificationResult.questions);

    // 4. 如果需要升级，触发智能路由
    let routingResult = null;
    if (needsRouting) {
      console.log('检测到升级关键词，触发智能路由流程');
      routingResult = await triggerIntelligentRouting(db, chatId, chatContext);
    }

    return {
      chatId: chatId,
      questions: clarificationResult.questions,
      needsRouting: needsRouting,
      routingTriggered: !!routingResult,
      routingResult: routingResult,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`需求澄清失败: ${error.message}`);
  }
}

/**
 * 调用AI澄清服务
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
 * 获取聊天上下文
 */
async function getChatContext(db, chatId) {
  try {
    const chatsCollection = db.collection('chats');
    const chatDoc = await chatsCollection.doc(chatId).get();

    if (!chatDoc.data || chatDoc.data.length === 0) {
      throw new Error('聊天记录不存在');
    }

    const chatData = chatDoc.data[0];

    // 获取最近的消息（限制数量以避免上下文过长）
    const messagesCollection = db.collection('messages');
    const messagesQuery = messagesCollection
      .where({ chatId: chatId })
      .orderBy('timestamp', 'desc')
      .limit(20); // 最近20条消息

    const messagesResult = await messagesQuery.get();
    const messages = messagesResult.data || [];

    // 反转消息顺序（从旧到新）
    messages.reverse();

    return {
      chatId: chatId,
      demandId: chatData.demandId,
      participants: chatData.participants,
      messages: messages.map(msg => ({
        senderId: msg.senderId,
        senderType: msg.senderType,
        content: msg.content,
        timestamp: msg.timestamp
      }))
    };

  } catch (error) {
    console.error('获取聊天上下文失败:', error);
    throw new Error('无法获取聊天上下文');
  }
}

/**
 * 生成澄清问题
 */
async function generateClarificationQuestions(chatContext) {
  try {
    // 构建AI提示
    const conversationText = chatContext.messages
      .map(msg => `${msg.senderType === 'user' ? '用户' : '设计师'}: ${msg.content}`)
      .join('\n');

    const prompt = `基于以下对话内容，生成3-5个澄清问题来帮助更好地理解用户需求：

对话内容：
${conversationText}

请生成具体的问题列表，帮助设计师更好地理解需求细节。问题应该：
1. 针对需求的具体方面
2. 帮助确定项目范围和复杂度
3. 了解用户的期望和偏好
4. 确定时间和预算要求

请以JSON格式返回：
{
  "questions": ["问题1", "问题2", "问题3"]
}`;

    // 这里应该调用executePrompt或其他AI服务
    // 暂时使用模拟响应
    const mockQuestions = [
      "您的项目预算大概是多少？",
      "您期望什么时候完成这个项目？",
      "您对设计风格有什么特别偏好吗？",
      "这个项目需要包含哪些具体功能或元素？",
      "您之前有类似项目的经验吗？"
    ];

    // 检查是否包含升级关键词
    const hasEscalationKeywords = checkForEscalationKeywords(mockQuestions);

    return {
      questions: mockQuestions,
      hasEscalationKeywords: hasEscalationKeywords
    };

  } catch (error) {
    console.error('生成澄清问题失败:', error);
    // 返回默认问题
    return {
      questions: [
        "请详细描述一下您的需求",
        "您的预算范围是多少？",
        "期望什么时候完成？"
      ],
      hasEscalationKeywords: false
    };
  }
}

/**
 * 检查升级关键词
 */
function checkForEscalationKeywords(questions) {
  const escalationKeywords = ['紧急', 'urgent', '加急', '立即', '马上', 'escalate', '复杂', '困难'];

  const questionsText = questions.join(' ').toLowerCase();

  return escalationKeywords.some(keyword =>
    questionsText.includes(keyword.toLowerCase())
  );
}

/**
 * 触发智能路由
 */
async function triggerIntelligentRouting(db, chatId, chatContext) {
  try {
    // 这里应该调用intelligentRoutingFlow函数
    // 暂时记录路由触发日志
    console.log(`触发智能路由: chatId=${chatId}, demandId=${chatContext.demandId}`);

    // 记录路由触发事件
    const routingLogsCollection = db.collection('routing_logs');
    await routingLogsCollection.add({
      chatId: chatId,
      demandId: chatContext.demandId,
      triggeredAt: new Date().toISOString(),
      reason: 'escalation_keywords_detected',
      status: 'triggered'
    });

    return {
      triggered: true,
      reason: 'escalation_keywords_detected',
      logged: true
    };

  } catch (error) {
    console.error('触发智能路由失败:', error);
    return {
      triggered: false,
      error: error.message
    };
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;