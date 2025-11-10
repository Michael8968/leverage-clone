'use strict';

/**
 * CloudBase 云函数：generateNanoBananaImage
 * Nano Banana图像生成 - 调用Gemini 2.5 Flash Image生成创意图像
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
      const { prompt, model = 'gemini-2.0-flash-exp-image-generation', ...otherParams } = JSON.parse(body || '{}');

      if (!prompt) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'prompt is required' })
        };
      }

      try {
        // Get LLM connections from database
        const connectionsSnapshot = await db.collection('llm_connections').get();
        const connections = connectionsSnapshot.data;

        if (!connections || connections.length === 0) {
          return {
            statusCode: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: '需要先配置LLM (No active LLM connection configured).',
              details: 'Please configure at least one LLM provider in the admin dashboard.'
            })
          };
        }

        // Use first available connection (in real implementation, route based on model)
        const activeConnection = connections[0];
        const proxyUrl = activeConnection.apiBaseUrl || 'https://generativelanguage.googleapis.com';

        // For image generation, use Gemini API
        const apiUrl = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${activeConnection.apiKey}`;

        const requestBody = {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'text/plain'
          }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Image Generation Error:", errorBody);
          return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Failed to generate image',
              details: errorBody
            })
          };
        }

        const data = await response.json();

        // Mock image URL (in real implementation, extract from Gemini response)
        const imageUrl = `https://example.com/generated-image-${Date.now()}.png`;

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl,
            prompt,
            model,
            success: true
          })
        };

      } catch (error) {
        console.error('Image generation error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing image generation request',
            details: error.message
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
    console.error('generateNanoBananaImage error:', error);
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