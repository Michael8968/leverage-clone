'use strict';

/**
 * CloudBase 云函数：createPrivateDemand
 * 创建私有需求 - 智能分诊系统，创建需求和聊天记录
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  try {
    // 初始化 CloudBase
    const app = cloudbase.init({
      env: process.env.ENV_ID || 'cloud1-7galmfiu70af91a6'
    });

    const db = app.database();
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { title = '未命名需求', requesterId = 'anonymous', ...otherData } = JSON.parse(body || '{}');

      try {
        console.log('[Demand Creation] Creating private demand for user:', requesterId);

        // Create demand in database
        const demandData = {
          title,
          requesterId,
          status: 'active',
          createdAt: db.serverDate(),
          ...otherData
        };

        const result = await db.collection('demands').add(demandData);

        // Create initial chat record
        const chatData = {
          demandId: result.id,
          userId: requesterId,
          message: `需求 "${title}" 已创建`,
          type: 'system',
          createdAt: db.serverDate()
        };

        await db.collection('demand_chats').add(chatData);

        return {
          statusCode: 201,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: result.id,
            title,
            requesterId,
            success: true
          })
        };

      } catch (error) {
        console.error('[Demand Creation] Error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error.message,
            success: false
          })
        };
      }
    } else {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('createPrivateDemand error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};