'use strict';

/**
 * CloudBase 云函数：recommendProducts
 * AI导购产品推荐API - 基于用户偏好生成个性化产品推荐
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  try {
    // 初始化 CloudBase
    const app = cloudbase.init({
      env: process.env.ENV_ID || 'cloud1-7galmfiu70af91a6'
    });

    const db = app.database();
    const { httpMethod, queryStringParameters, body } = event;

    if (httpMethod === 'GET') {
      // 获取产品推荐
      const creatorId = queryStringParameters?.creatorId;

      if (!creatorId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'creatorId is required' })
        };
      }

      const result = await db.collection('products')
        .where({ creatorId })
        .orderBy('createdAt', 'desc')
        .get();

      const products = result.data.map(item => ({
        ...item,
        id: item._id
      }));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products)
      };

    } else if (httpMethod === 'POST') {
      // 创建新产品
      const data = JSON.parse(body || '{}');

      const newProduct = {
        ...data,
        createdAt: db.serverDate()
      };

      const result = await db.collection('products').add(newProduct);

      return {
        statusCode: 201,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: result.id, ...data })
      };

    } else {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('recommendProducts error:', error);
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