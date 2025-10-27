const { getHunyuanClient } = require('../src/utils/hunyuan-client');
require('dotenv').config();

async function listModels() {
  const client = getHunyuanClient();
  try {
    const res = await client.DescribeModelList({});
    console.log('可用模型列表:', res.ModelList);
  } catch (e) {
    console.error('DescribeModelList 错误:', e);
  }
}

listModels();
