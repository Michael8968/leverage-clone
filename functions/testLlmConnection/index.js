'use strict';

/**
 * CloudBase 云函数：testLlmConnection
 * 测试LLM连接 - 验证API密钥和连接可用性
 */

const OpenAI = require('openai');

function getApiBaseUrl(provider) {
    const providerMap = {
        'Tencent': 'https://api.hunyuan.cloud.tencent.com/v1',
        'OpenAI': 'https://api.openai.com/v1',
        'Anthropic': 'https://api.anthropic.com/v1',
        'Google': 'https://generativelanguage.googleapis.com/v1beta/models',
        'DeepSeek': 'https://api.deepseek.com/v1',
        'Baichuan': 'https://api.baichuan-ai.com/v1',
        'Moonshot': 'https://api.moonshot.cn/v1',
        'Alibaba': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        'Zhipu': 'https://open.bigmodel.cn/api/paas/v4',
        '智谱GLM': 'https://open.bigmodel.cn/api/paas/v4',
        'MiniMax': 'https://api.minimax.chat/v1',
        '阶跃星辰': 'https://api.stepfun.com/v1',
        '字节跳动': 'https://ark.cn-beijing.volces.com/api/v3',
        '讯飞星火': 'https://spark-api.xf-yun.com/v1',
        '百度文心一言': 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
        '华为云': 'https://inference-modelarts.cn-north-4.myhuaweicloud.com/v1',
        'LiteLLM': process.env.LITELLM_PROXY_URL || 'http://localhost:4000/v1'
    };
    return providerMap[provider] || '';
}

exports.main = async (event, context) => {
  try {
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { connection } = JSON.parse(body || '{}');

      if (!connection) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: '无效的连接数据' })
        };
      }

      const { provider, modelName, apiKey, apiBaseUrl } = connection;

      const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: apiBaseUrl || getApiBaseUrl(provider),
      });

      try {
        await openai.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, message: '连接成功' })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, message: `连接失败: ${error.message}` })
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
    console.error('testLlmConnection error:', error);
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