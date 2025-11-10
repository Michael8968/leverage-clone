'use strict';

/**
 * CloudBase 云函数：analyzeMediaAsset
 * 媒体资源分析 - 使用Gemini pro-vision分析媒体内容
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
      const { mediaUrl, analysisType = 'general', prompt } = JSON.parse(body || '{}');

      if (!mediaUrl) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'mediaUrl is required' })
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

        // For vision analysis, use Gemini Pro Vision
        const model = 'gemini-pro-vision';
        const apiUrl = `${proxyUrl}/v1beta/models/${model}:generateContent?key=${activeConnection.apiKey}`;

        // Default prompts based on analysis type
        const defaultPrompts = {
          general: '请描述这张图片的内容，包括主要对象、场景、颜色和任何可见的文本。',
          product: '分析这个产品图片，描述产品特点、外观、用途和可能的材质。',
          creative: '从创意角度分析这张图片，描述构图、光影、风格和艺术价值。',
          technical: '从技术角度分析这张图片，描述分辨率、质量、格式和可能的处理痕迹。'
        };

        const analysisPrompt = prompt || defaultPrompts[analysisType] || defaultPrompts.general;

        const requestBody = {
          contents: [{
            parts: [
              {
                text: analysisPrompt
              },
              {
                inline_data: {
                  mime_type: getMimeType(mediaUrl),
                  data: await downloadAndEncodeImage(mediaUrl)
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
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
          console.error("Media Analysis Error:", errorBody);
          return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Failed to analyze media',
              details: errorBody
            })
          };
        }

        const data = await response.json();
        const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || '无法分析媒体内容';

        // Store analysis result in database
        const analysisRecord = {
          mediaUrl,
          analysisType,
          prompt: analysisPrompt,
          result: analysis,
          model,
          createdAt: new Date()
        };

        await db.collection('media_analyses').add(analysisRecord);

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysis,
            analysisType,
            mediaUrl,
            model,
            success: true
          })
        };

      } catch (error) {
        console.error('Media analysis error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing media analysis request',
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
    console.error('analyzeMediaAsset error:', error);
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

// Helper function to get MIME type from URL
function getMimeType(url) {
  const extension = url.split('.').pop().toLowerCase();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp'
  };
  return mimeTypes[extension] || 'image/jpeg';
}

// Helper function to download and base64 encode image
async function downloadAndEncodeImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}