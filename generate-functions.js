const fs = require('fs');
const path = require('path');

const functions = [
  'getPlatformAssets',
  'testLlmConnection',
  'getPrompts',
  'updateModelsFromLiteLLM',
  'executePrompt',
  'batchUpdateUsers',
  'getProductRecommendations',
  'recommendCreatives',
  'createPrivateDemand',
  'clarifyDemandDetails',
  'intelligentRoutingFlow',
  'evaluateSellerData',
  'generate3dModel',
  'generateTripo3dModel',
  'getTripo3dModelStatus',
  'generateNanoBananaImage',
  'getUploadUrlForMediaAsset',
  'analyzeMediaAsset'
];

const template = (name) => `'use strict';

/**
 * CloudBase 云函数：${name}
 * TODO: 实现具体业务逻辑
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

    // TODO: 实现 ${name} 的具体逻辑

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '${name} function executed', data: {} })
    };

  } catch (error) {
    console.error('${name} error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};`;

functions.forEach(name => {
  const dir = path.join('functions', name);
  const file = path.join(dir, 'index.js');
  fs.writeFileSync(file, template(name));
  console.log(`Created ${file}`);
});