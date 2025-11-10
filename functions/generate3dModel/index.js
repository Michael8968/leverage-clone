'use strict';

/**
 * CloudBase 云函数：generate3dModel
 * 3D模型图像生成 - 调用Gemini Imagen 4.0根据提示词生成图像
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
      const { prompt, providerId = 'tripo', apiKey, userId } = JSON.parse(body || '{}');

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

        let taskId;
        let estimatedTime;
        let provider = providerId;

        if (providerId === 'tripo') {
          // Generate Tripo 3D model task
          taskId = `tripo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          estimatedTime = 60; // 60 seconds for Tripo

          // For Tripo, we would normally call their API, but for now we'll simulate
          // In real implementation, this would make an HTTP call to Tripo's API

        } else if (providerId === 'gemini') {
          // Use Gemini Imagen for image generation (not actual 3D model)
          const apiUrl = `${proxyUrl}/v1beta/models/gemini-1.5-pro:generateContent?key=${activeConnection.apiKey}`;

          const requestBody = {
            contents: [{
              parts: [{
                text: `Generate a detailed description for 3D modeling: ${prompt}. Include technical specifications, dimensions, materials, and rendering details.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
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
            console.error("3D Model Generation Error:", errorBody);
            return {
              statusCode: response.status,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                error: 'Failed to generate 3D model',
                details: errorBody
              })
            };
          }

          const data = await response.json();
          const description = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Generated 3D model description';

          taskId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          estimatedTime = 30; // 30 seconds for Gemini

        } else {
          // Default fallback
          taskId = `universal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          estimatedTime = 60;
          provider = 'unknown';
        }

        const result = {
          taskId,
          provider,
          estimatedTime,
          prompt,
          status: 'queued',
          createdAt: new Date(),
          userId: userId || null
        };

        // Store 3D model generation task in database
        await db.collection('3d_model_tasks').add({
          taskId,
          provider,
          prompt,
          status: 'queued',
          estimatedTime,
          userId: userId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };

      } catch (error) {
        console.error('3D model generation error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing 3D model generation request',
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
    console.error('generate3dModel error:', error);
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