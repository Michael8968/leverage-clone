'use strict';

/**
 * CloudBase 云函数：getProductRecommendations
 * 获取产品推荐 - 基于用户档案的AI产品推荐系统
 */

const OpenAI = require('openai');

exports.main = async (event, context) => {
  try {
    const { httpMethod, body } = event;

    if (httpMethod === 'POST') {
      const { userId, preferences = [], limit = 5 } = JSON.parse(body || '{}');

      if (!userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'userId is required' })
        };
      }

      try {
        console.log('[Shopping Assistant] Getting recommendations for user:', userId);

        // Initialize AI service
        let aiService;
        const env = process.env.NODE_ENV || 'development';

        if (env === 'production') {
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
          const openaiApiKey = process.env.OPENAI_API_KEY;
          if (openaiApiKey) {
            aiService = new OpenAI({ apiKey: openaiApiKey });
          } else {
            // Mock response
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recommendations: [
                  {
                    productId: 'prod_1',
                    name: 'AI Development Kit',
                    score: 0.9,
                    reason: 'Based on your interest in AI development'
                  },
                  {
                    productId: 'prod_2',
                    name: 'Cloud Computing Guide',
                    score: 0.8,
                    reason: 'Suitable for cloud-based projects'
                  }
                ].slice(0, limit)
              })
            };
          }
        }

        const completion = await aiService.chat.completions.create({
          model: env === 'production' ? 'hunyuan-pro' : 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a product recommendation assistant. Suggest products based on user preferences.'
            },
            {
              role: 'user',
              content: `Recommend products for user ${userId} with preferences: ${preferences.join(', ')}`
            }
          ],
          max_tokens: 300,
        });

        const response = completion.choices[0]?.message?.content || '';

        // Mock recommendations (in real implementation, this would parse AI response)
        const recommendations = [
          {
            productId: 'prod_1',
            name: 'AI Development Kit',
            score: 0.9,
            reason: 'Based on your interest in AI development'
          },
          {
            productId: 'prod_2',
            name: 'Cloud Computing Guide',
            score: 0.8,
            reason: 'Suitable for cloud-based projects'
          }
        ].slice(0, limit);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendations })
        };

      } catch (error) {
        console.error('[Shopping Assistant] Error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recommendations: [],
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
    console.error('getProductRecommendations error:', error);
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