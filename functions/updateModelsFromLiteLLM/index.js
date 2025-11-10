'use strict';

/**
 * CloudBase 云函数：updateModelsFromLiteLLM
 * 从LiteLLM更新模型列表 - 同步最新的AI模型信息
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  try {
    // 初始化 CloudBase
    const app = cloudbase.init({
      env: process.env.ENV_ID || 'cloud1-7galmfiu70af91a6'
    });

    const db = app.database();
    const { httpMethod } = event;

    if (httpMethod === 'POST') {
      const litellmProxyUrl = process.env.LITELLM_PROXY_URL;

      if (!litellmProxyUrl) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'LiteLLM代理URL未配置' })
        };
      }

      try {
        const response = await fetch(`${litellmProxyUrl}/v1/models`);
        const { data } = await response.json();

        const existingConnections = await db.collection('llm_connections').get();
        const existingModels = new Set(existingConnections.data.map((c) => c.modelName));

        let addedCount = 0;
        for (const model of data) {
          if (!existingModels.has(model.id)) {
            await db.collection('llm_connections').add({
              provider: 'LiteLLM',
              modelName: model.id,
              apiKey: ''
            });
            addedCount++;
          }
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `成功同步模型，新增${addedCount}个模型` })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: `从LiteLLM同步模型失败: ${error.message}` })
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
    console.error('updateModelsFromLiteLLM error:', error);
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