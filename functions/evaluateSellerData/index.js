'use strict';

/**
 * TCB API转换: 将Firebase云函数 'evaluateSellerData' 转为API端点 '/api/v1/business/evaluateSellerData'。
 * 输入: CSV数据 (JSON body)。
 * 输出: 供应商评估结果 (JSON)。
 * 集成: TCB SDK (db/auth), AI评估。
 * PRD: 链接AI导购功能。
 *
 * Copilot提示：
 * // TCB API: 解析CSV to JSON，AI逐条分析 (score/suggest)，存DB 'suppliers'。输入: {csvData: base64?}。PRD: 供应商导入。验证: JSON解析，score>0。
 */

const cloudbase = require('@cloudbase/node-sdk');

exports.main = async (event, context) => {
  // CORS预检处理
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: {'Access-Control-Allow-Origin': '*'} };

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  try {
    // 初始化TCB
    const app = cloudbase.init({
      env: process.env.TCB_ENV_ID || cloudbase.SYMBOL_CURRENT_ENV,
      secretId: process.env.TCB_SECRET_ID,
      secretKey: process.env.TCB_SECRET_KEY,
    });

    const db = app.database();
    const auth = app.auth();

    // Auth check
    let user = null;
    try {
      const ticket = event.headers.authorization || event.headers.Authorization;
      if (ticket) {
        user = await auth.getUserInfo(ticket.replace('Bearer ', ''));
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    if (!user) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: '请先登录哦~',
          error: 'UNAUTHORIZED'
        }),
      };
    }

    // 解析请求体
    let requestData = {};
    try {
      if (event.body) {
        requestData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      }
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: '请求数据格式不正确呢~',
          error: 'INVALID_JSON'
        }),
      };
    }

    // 验证输入数据
    const validation = validateInput(requestData);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: validation.message || '输入数据有误哦~',
          error: 'VALIDATION_FAILED',
          details: validation.details
        }),
      };
    }

    // 执行主要业务逻辑
    console.log(`开始处理evaluateSellerData请求...`, { userId: user.uid, data: requestData });

    const result = await processEvaluateSellerData(db, user, requestData);

    console.log(`✅ evaluateSellerData处理完成`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: '操作成功啦~',
        data: result
      }),
    };

  } catch (error) {
    console.error(`❌ evaluateSellerData处理失败:`, error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: error.message || '服务暂时不可用，请稍后再试哦~',
        error: 'INTERNAL_ERROR'
      }),
    };
  }
};

/**
 * 验证输入数据
 */
function validateInput(data) {
  try {
    // 检查必需字段：csvData
    const requiredFields = ['csvData'];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          valid: false,
          message: `缺少必需字段: ${field}~`,
          details: { missingField: field }
        };
      }
    }

    // 验证csvData是字符串
    if (typeof data.csvData !== 'string' || data.csvData.trim() === '') {
      return {
        valid: false,
        message: 'csvData必须是非空字符串~',
        details: { invalidField: 'csvData' }
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: '数据验证失败~',
      details: { error: error.message }
    };
  }
}

/**
 * 处理evaluateSellerData的主要业务逻辑
 * TCB API: 解析CSV to JSON，AI逐条分析 (score/suggest)，存DB 'suppliers'。输入: {csvData: base64?}。PRD: 供应商导入。验证: JSON解析，score>0。
 */
async function processEvaluateSellerData(db, user, data) {
  try {
    const { csvData } = data;

    // 1. 解析CSV数据
    const parsedData = await parseCSVData(csvData);

    // 2. AI逐条分析供应商数据
    const evaluationResults = await evaluateSuppliersBatch(parsedData);

    // 3. 保存到数据库
    const savedSuppliers = await saveSuppliersToDatabase(db, evaluationResults, user.uid);

    return {
      totalRecords: parsedData.length,
      evaluatedRecords: evaluationResults.length,
      savedRecords: savedSuppliers.length,
      suppliers: savedSuppliers,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('业务逻辑处理失败:', error);
    throw new Error(`供应商数据评估失败: ${error.message}`);
  }
}

/**
 * 调用AI评估服务
 */
async function callAIAI(data) {
  // TODO: 实现AI服务调用逻辑
  // 这里可以集成各种AI服务，如OpenAI、腾讯混元等

  return {
    recommendation: 'AI生成的推荐内容',
    confidence: 0.95
  };
}

/**
 * 解析CSV数据
 */
async function parseCSVData(csvData) {
  try {
    // 检查是否是base64编码
    let csvText = csvData;
    try {
      // 尝试base64解码
      csvText = Buffer.from(csvData, 'base64').toString('utf-8');
    } catch (decodeError) {
      // 如果解码失败，假设已经是普通文本
      console.log('CSV数据不是base64编码，使用原文');
    }

    // 简单的CSV解析（实际项目中建议使用专门的CSV库）
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV数据格式不正确，至少需要标题行和一行数据');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);

    const parsedData = rows.map((row, index) => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) {
        console.warn(`第${index + 2}行数据列数不匹配，已跳过`);
        return null;
      }

      const supplier = {};
      headers.forEach((header, i) => {
        supplier[header] = values[i];
      });

      return supplier;
    }).filter(item => item !== null);

    console.log(`✅ 成功解析 ${parsedData.length} 条供应商数据`);
    return parsedData;

  } catch (error) {
    console.error('CSV解析失败:', error);
    throw new Error('CSV数据解析失败，请检查格式');
  }
}

/**
 * 批量评估供应商
 */
async function evaluateSuppliersBatch(suppliersData) {
  try {
    const evaluationResults = [];

    for (const supplier of suppliersData) {
      try {
        const evaluation = await evaluateSingleSupplier(supplier);
        evaluationResults.push({
          ...supplier,
          evaluation: evaluation,
          evaluatedAt: new Date().toISOString()
        });
        console.log(`✅ 评估供应商: ${supplier.name || supplier.company || '未知'}`);
      } catch (evalError) {
        console.error(`❌ 评估供应商失败:`, evalError.message);
        // 继续处理其他供应商
        evaluationResults.push({
          ...supplier,
          evaluation: {
            score: 0,
            suggestions: ['评估失败，请手动检查数据'],
            riskLevel: 'unknown'
          },
          evaluatedAt: new Date().toISOString(),
          evaluationError: evalError.message
        });
      }
    }

    return evaluationResults;

  } catch (error) {
    console.error('批量评估失败:', error);
    throw new Error('供应商批量评估失败');
  }
}

/**
 * 评估单个供应商
 */
async function evaluateSingleSupplier(supplier) {
  try {
    // 构建评估提示
    const supplierInfo = Object.entries(supplier)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // 模拟AI评估（实际应该调用AI服务）
    const evaluation = {
      score: Math.floor(Math.random() * 40) + 60, // 60-100分随机
      suggestions: [],
      riskLevel: 'low',
      categories: []
    };

    // 基于供应商信息进行简单评估
    if (supplier.creditScore) {
      const creditScore = parseInt(supplier.creditScore);
      if (creditScore >= 80) {
        evaluation.suggestions.push('信用评分优秀，建议优先合作');
        evaluation.score += 10;
      } else if (creditScore >= 60) {
        evaluation.suggestions.push('信用评分良好，可以合作');
      } else {
        evaluation.suggestions.push('信用评分较低，建议谨慎合作');
        evaluation.riskLevel = 'medium';
        evaluation.score -= 10;
      }
    }

    if (supplier.yearsInBusiness) {
      const years = parseInt(supplier.yearsInBusiness);
      if (years >= 5) {
        evaluation.suggestions.push('经营年限较长，经验丰富');
        evaluation.score += 5;
      } else {
        evaluation.suggestions.push('经营年限较短，需要关注稳定性');
      }
    }

    if (supplier.location) {
      evaluation.categories.push('地理位置: ' + supplier.location);
    }

    if (supplier.industry) {
      evaluation.categories.push('行业: ' + supplier.industry);
    }

    // 确保分数在合理范围内
    evaluation.score = Math.max(0, Math.min(100, evaluation.score));

    // 根据分数确定风险等级
    if (evaluation.score >= 80) {
      evaluation.riskLevel = 'low';
    } else if (evaluation.score >= 60) {
      evaluation.riskLevel = 'medium';
    } else {
      evaluation.riskLevel = 'high';
    }

    return evaluation;

  } catch (error) {
    console.error('单个供应商评估失败:', error);
    return {
      score: 0,
      suggestions: ['评估过程中出现错误'],
      riskLevel: 'unknown'
    };
  }
}

/**
 * 保存供应商到数据库
 */
async function saveSuppliersToDatabase(db, evaluationResults, userId) {
  try {
    const suppliersCollection = db.collection('suppliers');
    const savedSuppliers = [];

    for (const result of evaluationResults) {
      try {
        const supplierData = {
          ...result,
          importedBy: userId,
          importDate: new Date().toISOString(),
          status: 'pending_review' // 待审核状态
        };

        // 生成供应商ID
        const supplierId = `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        supplierData._id = supplierId;

        await suppliersCollection.add(supplierData);
        savedSuppliers.push({
          id: supplierId,
          name: result.name || result.company || '未知供应商',
          score: result.evaluation.score,
          riskLevel: result.evaluation.riskLevel
        });

        console.log(`✅ 保存供应商: ${supplierId}`);

      } catch (saveError) {
        console.error(`❌ 保存供应商失败:`, saveError.message);
      }
    }

    return savedSuppliers;

  } catch (error) {
    console.error('保存供应商到数据库失败:', error);
    throw new Error('保存供应商数据失败');
  }
}

/**
 * 工具函数：首字母大写
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = exports;