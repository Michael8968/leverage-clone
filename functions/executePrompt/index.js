'use strict';

/**
 * CloudBase 云函数：executePrompt
 * 执行AI提示 - 统一的AI调用入口，包含积分扣除和响应生成
 */

const OpenAI = require('openai');

exports.main = async (event, context) => {
  try {
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { prompt, userId = 'anonymous', scenario = 'general' } = JSON.parse(body || '{}');

      if (!prompt) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'prompt is required' })
        };
      }

      try {
        // Initialize AI service (simplified for cloud function)
        let aiService;
        const env = process.env.NODE_ENV || 'development';

        if (env === 'production') {
          // Use Tencent Hunyuan in production
          const hunyuanApiKey = process.env.HUNYUAN_API_KEY;
          if (hunyuanApiKey) {
            aiService = new OpenAI({
              apiKey: hunyuanApiKey,
              baseURL: 'https://api.hunyuan.cloud.tencent.com/v1'
            });
          } else {
            throw new Error('HUNYUAN_API_KEY not configured');
          }
        } else {
          // Use OpenAI in development
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (openaiApiKey) {
            aiService = new OpenAI({ apiKey: openaiApiKey });
          } else {
            // Mock response
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                output: `Mock AI response for: ${prompt}`,
                status: 'succeeded',
                invokedFunction: 'executePrompt'
              })
            };
          }
        }

        console.log(`[Prompt Execution] Executing prompt for user ${userId}, scenario: ${scenario}`);

        const completion = await aiService.chat.completions.create({
          model: env === 'production' ? 'hunyuan-pro' : 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for scenario: ${scenario}. Provide helpful and accurate responses.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const output = completion.choices[0]?.message?.content || 'No response generated';

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            output,
            status: 'succeeded',
            invokedFunction: 'executePrompt'
          })
        };

      } catch (error) {
        console.error('[Prompt Execution] Error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            output: `Error: ${error.message}`,
            status: 'failed',
            invokedFunction: 'executePrompt'
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
    console.error('executePrompt error:', error);
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