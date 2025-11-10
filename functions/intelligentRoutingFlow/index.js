'use strict';

/**
 * CloudBase 云函数：intelligentRoutingFlow
 * 智能路由 - 基于设计师状态和路由策略进行AI决策分配
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
      const { demand, designerIds, routingStrategy = 'auto' } = JSON.parse(body || '{}');

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

        // Get designers data
        let designers = [];
        if (designerIds && designerIds.length > 0) {
          // Get specific designers
          const designersPromises = designerIds.map(id =>
            db.collection('users').doc(id).get()
          );
          const designersResults = await Promise.all(designersPromises);
          designers = designersResults.map(result => result.data).filter(d => d);
        } else {
          // Get all available designers
          const designersSnapshot = await db.collection('users')
            .where({
              role: 'designer',
              status: 'active'
            })
            .get();
          designers = designersSnapshot.data || [];
        }

        if (designers.length === 0) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'No available designers found',
              details: 'Please ensure there are active designers in the system.'
            })
          };
        }

        // Use first available connection (in real implementation, route based on model)
        const activeConnection = connections[0];
        const proxyUrl = activeConnection.apiBaseUrl || 'https://api.openai.com/v1';

        // For routing, use GPT model
        const apiUrl = `${proxyUrl}/chat/completions`;
        const model = activeConnection.modelName || 'gpt-3.5-turbo';

        // Build designer profiles for AI analysis
        const designerProfiles = designers.map(designer => ({
          id: designer._id || designer.id,
          name: designer.name || designer.displayName,
          skills: designer.skills || [],
          experience: designer.experience || 'Unknown',
          rating: designer.rating || 0,
          completedProjects: designer.completedProjects || 0,
          specialization: designer.specialization || []
        }));

        const requestBody = {
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are an intelligent routing assistant for a design platform. Your task is to route demands to the most suitable designers based on:

1. Demand requirements and complexity
2. Designer skills and experience
3. Designer availability and current workload
4. Past performance and ratings
5. Specialization match

Return a JSON response with the best designer match including confidence score and reasoning.`
            },
            {
              role: 'user',
              content: `Route this demand to the best designer:

Demand: ${JSON.stringify(demand, null, 2)}

Available Designers: ${JSON.stringify(designerProfiles, null, 2)}

Routing Strategy: ${routingStrategy}

Please return a JSON object with:
{
  "designerId": "best_designer_id",
  "confidence": 0.85,
  "reason": "Detailed reasoning for the choice",
  "alternativeDesigners": ["designer_id_1", "designer_id_2"]
}`
            }
          ],
          max_tokens: 500,
          temperature: 0.3
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
          console.error("Routing Error:", errorBody);
          return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Failed to perform intelligent routing',
              details: errorBody
            })
          };
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || '{}';

        // Parse AI response
        let routingResult;
        try {
          routingResult = JSON.parse(aiResponse);
        } catch (parseError) {
          // Fallback parsing - extract designer ID from text
          const designerMatch = aiResponse.match(/"designerId"\s*:\s*"([^"]+)"/);
          const confidenceMatch = aiResponse.match(/"confidence"\s*:\s*([0-9.]+)/);

          routingResult = {
            designerId: designerMatch ? designerMatch[1] : designers[0]._id || designers[0].id,
            confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
            reason: aiResponse.substring(0, 200),
            alternativeDesigners: designers.slice(1, 3).map(d => d._id || d.id)
          };
        }

        // Validate that the selected designer exists
        const selectedDesigner = designers.find(d =>
          (d._id || d.id) === routingResult.designerId
        );

        if (!selectedDesigner) {
          routingResult.designerId = designers[0]._id || designers[0].id;
          routingResult.confidence = 0.3;
          routingResult.reason = 'Fallback selection due to invalid designer ID';
        }

        const result = {
          routing: {
            designerId: routingResult.designerId,
            designerName: selectedDesigner?.name || selectedDesigner?.displayName,
            confidence: routingResult.confidence || 0.5,
            reason: routingResult.reason || 'AI-powered routing decision',
            alternativeDesigners: routingResult.alternativeDesigners || [],
            strategy: routingStrategy,
            routedAt: new Date()
          },
          demandId: demand.id || demand._id,
          totalDesigners: designers.length
        };

        // Store routing result in database
        await db.collection('demand_routings').add({
          demandId: demand.id || demand._id,
          routing: result.routing,
          strategy: routingStrategy,
          aiAnalysis: aiResponse,
          createdAt: new Date()
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };

      } catch (error) {
        console.error('Intelligent routing error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing intelligent routing request',
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
    console.error('intelligentRoutingFlow error:', error);
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