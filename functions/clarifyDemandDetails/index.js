'use strict';

/**
 * CloudBase 云函数：clarifyDemandDetails
 * 需求澄清 - 基于聊天上下文生成澄清问题，检测升级关键词触发路由
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
      const { demand, userId, chatHistory } = JSON.parse(body || '{}');

      if (!demand) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'demand is required' })
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
        const proxyUrl = activeConnection.apiBaseUrl || 'https://api.openai.com/v1';

        // For clarification, use GPT model
        const apiUrl = `${proxyUrl}/chat/completions`;
        const model = activeConnection.modelName || 'gpt-3.5-turbo';

        // Build context from chat history
        let contextMessage = '';
        if (chatHistory && chatHistory.length > 0) {
          contextMessage = '\n\nChat History:\n' + chatHistory.map(msg =>
            `${msg.role}: ${msg.content}`
          ).join('\n');
        }

        const requestBody = {
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a demand clarification assistant. Help clarify and improve demand descriptions. Generate specific questions to better understand the requirements. Also detect if the demand needs to be upgraded to a more complex routing flow.'
            },
            {
              role: 'user',
              content: `Please clarify this demand and generate specific questions: ${JSON.stringify(demand)}${contextMessage}`
            }
          ],
          max_tokens: 400,
          temperature: 0.7
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeConnection.apiKey}`
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Clarification Error:", errorBody);
          return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Failed to clarify demand',
              details: errorBody
            })
          };
        }

        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content || '';

        // Parse AI response to extract clarified demand, questions, and routing decision
        const clarifiedDemand = {
          ...demand,
          description: analysis.split('\n')[0] || demand.description, // First line as clarified description
          clarified: true,
          clarifiedAt: new Date()
        };

        // Extract questions (look for lines starting with numbers or bullets)
        const questions = analysis.split('\n')
          .filter(line => /^\d+\.|^-|\?/.test(line.trim()))
          .map(line => line.trim())
          .slice(0, 5); // Limit to 5 questions

        // Check for routing keywords
        const routingKeywords = ['complex', 'urgent', 'high priority', 'specialist', 'expert', 'premium'];
        const needsRouting = routingKeywords.some(keyword =>
          analysis.toLowerCase().includes(keyword.toLowerCase())
        );

        const result = {
          clarifiedDemand,
          questions: questions.length > 0 ? questions : [
            'What is your budget range?',
            'When do you need this completed?',
            'Are there any specific requirements?'
          ],
          suggestions: [
            'Consider adding more details about the scope',
            'Specify the technology stack if known'
          ],
          needsRouting,
          analysis
        };

        // Store clarification result in database
        await db.collection('demand_clarifications').add({
          demandId: demand.id || demand._id,
          userId: userId || null,
          originalDemand: demand,
          clarifiedDemand,
          questions: result.questions,
          suggestions: result.suggestions,
          needsRouting,
          analysis,
          createdAt: new Date()
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };

      } catch (error) {
        console.error('Demand clarification error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing demand clarification request',
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
    console.error('clarifyDemandDetails error:', error);
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