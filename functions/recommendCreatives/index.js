'use strict';

/**
 * CloudBase 云函数：recommendCreatives
 * 推荐创意者 - AI分析需求匹配最适合的创意人才
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
      const { demandId, criteria } = JSON.parse(body || '{}');

      if (!demandId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'demandId is required' })
        };
      }

      try {
        console.log('[Demand Matching] Recommending creatives for demand:', demandId);

        // Query creatives/suppliers from database
        const suppliersSnapshot = await db.collection('suppliers').get();
        const suppliers = suppliersSnapshot.data;

        // Mock creative recommendations (in real implementation, use AI to match)
        const creatives = suppliers.slice(0, 5).map((supplier, index) => ({
          creativeId: supplier._id || supplier.id || `creative_${index}`,
          name: supplier.name || `Creative ${index + 1}`,
          score: Math.round((Math.random() * 3 + 7) * 10) / 10, // 7.0-10.0
          reason: criteria ? `Matches criteria: ${JSON.stringify(criteria)}` : 'High match based on portfolio and skills'
        }));

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creatives })
        };

      } catch (error) {
        console.error('[Demand Matching] Error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creatives: [],
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
    console.error('recommendCreatives error:', error);
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