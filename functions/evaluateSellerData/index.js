'use strict';

/**
 * CloudBase 云函数：evaluateSellerData
 * 供应商数据评估 - 解析CSV数据并进行AI评估，保存到供应商数据库
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
      const { csvData, criteria, userId } = JSON.parse(body || '{}');

      if (!csvData) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'csvData is required' })
        };
      }

      try {
        // Parse CSV data
        const rows = csvData.split('\n').filter(row => row.trim());
        const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

        const suppliers = rows.slice(1).map(row => {
          const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
          const supplier = {};
          headers.forEach((header, index) => {
            supplier[header] = values[index] || '';
          });
          return supplier;
        });

        if (suppliers.length === 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'No valid supplier data found in CSV' })
          };
        }

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

        // For evaluation, use GPT model
        const apiUrl = `${proxyUrl}/chat/completions`;
        const model = activeConnection.modelName || 'gpt-3.5-turbo';

        const requestBody = {
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a supplier evaluation assistant. Evaluate seller/supplier data and provide scores and recommendations. Consider factors like:

- Quality and reliability
- Pricing competitiveness
- Delivery performance
- Communication and responsiveness
- Overall market position

Return a JSON response with evaluation scores and recommendations.`
            },
            {
              role: 'user',
              content: `Evaluate the following supplier data and provide detailed analysis:

Suppliers Data: ${JSON.stringify(suppliers, null, 2)}

Evaluation Criteria: ${JSON.stringify(criteria || {}, null, 2)}

Please return a JSON object with:
{
  "evaluation": {
    "scores": {
      "quality": 8.0,
      "reliability": 7.5,
      "pricing": 6.8,
      "delivery": 7.2,
      "communication": 8.5
    },
    "recommendations": [
      "Consider this supplier for high-quality products",
      "Monitor delivery times closely",
      "Negotiate volume discounts"
    ],
    "summary": "Overall good performance with room for improvement in pricing",
    "topSuppliers": ["supplier_id_1", "supplier_id_2"],
    "risks": ["Potential delivery delays", "Higher pricing"]
  },
  "supplierDetails": [...]
}`
            }
          ],
          max_tokens: 800,
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
          console.error("Evaluation Error:", errorBody);
          return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'Failed to evaluate seller data',
              details: errorBody
            })
          };
        }

        const data = await response.json();
        const aiResponse = data.choices?.[0]?.message?.content || '{}';

        // Parse AI response
        let evaluationResult;
        try {
          evaluationResult = JSON.parse(aiResponse);
        } catch (parseError) {
          // Fallback evaluation
          evaluationResult = {
            evaluation: {
              scores: {
                quality: 7.0,
                reliability: 6.5,
                pricing: 7.0,
                delivery: 6.8,
                communication: 7.2
              },
              recommendations: [
                'Review supplier performance regularly',
                'Consider building long-term partnerships',
                'Monitor market changes affecting pricing'
              ],
              summary: 'Standard supplier evaluation completed',
              topSuppliers: suppliers.slice(0, 3).map((s, i) => s.id || s.name || `supplier_${i + 1}`),
              risks: ['Market volatility', 'Supply chain disruptions']
            },
            supplierDetails: suppliers
          };
        }

        // Save evaluated suppliers to database
        const savedSuppliers = [];
        for (const supplier of suppliers) {
          const supplierData = {
            ...supplier,
            evaluation: evaluationResult.evaluation,
            evaluatedAt: new Date(),
            evaluatedBy: userId || 'system',
            status: 'active'
          };

          // Check if supplier already exists
          let existingSupplier = null;
          if (supplier.id) {
            try {
              existingSupplier = await db.collection('suppliers').doc(supplier.id).get();
            } catch (e) {
              // Supplier doesn't exist
            }
          }

          if (existingSupplier && existingSupplier.data) {
            // Update existing supplier
            await db.collection('suppliers').doc(supplier.id).update(supplierData);
            savedSuppliers.push({ ...supplierData, _id: supplier.id });
          } else {
            // Create new supplier
            const result = await db.collection('suppliers').add(supplierData);
            savedSuppliers.push({ ...supplierData, _id: result.id });
          }
        }

        const result = {
          evaluation: evaluationResult.evaluation,
          suppliersProcessed: suppliers.length,
          suppliersSaved: savedSuppliers.length,
          supplierDetails: savedSuppliers,
          success: true
        };

        // Store evaluation summary
        await db.collection('supplier_evaluations').add({
          userId: userId || null,
          csvData: csvData.substring(0, 1000), // Store truncated CSV for reference
          criteria: criteria || {},
          evaluation: evaluationResult.evaluation,
          suppliersCount: suppliers.length,
          createdAt: new Date()
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        };

      } catch (error) {
        console.error('Seller data evaluation error:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Error processing seller data evaluation request',
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
    console.error('evaluateSellerData error:', error);
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