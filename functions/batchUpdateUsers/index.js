'use strict';

/**
 * CloudBase 云函数：batchUpdateUsers
 * 批量更新用户 - 管理员批量管理用户角色/状态/星标等信息
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
      const { updates } = JSON.parse(body || '{}');

      if (!updates || !Array.isArray(updates)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'updates array is required' })
        };
      }

      try {
        console.log('[User Management] Batch updating users:', updates.length);

        let updatedCount = 0;

        // Process each update
        for (const update of updates) {
          const { userId, updates: userUpdates } = update;

          if (userId && userUpdates) {
            // Update user in database
            await db.collection('users')
              .where({ uid: userId })
              .update(userUpdates);
            updatedCount++;
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            updatedCount
          })
        };

      } catch (error) {
        console.error('[User Management] Error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            updatedCount: 0,
            error: error.message
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
    console.error('batchUpdateUsers error:', error);
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