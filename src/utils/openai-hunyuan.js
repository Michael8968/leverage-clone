require('dotenv').config();
let OpenAI = require('openai');
// 兼容 ESM 默认导出
OpenAI = OpenAI && OpenAI.default ? OpenAI.default : OpenAI;

function getOpenAIForHunyuan() {
  const apiKey = process.env.HUNYUAN_API_KEY;
  const baseURL = process.env.HUNYUAN_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  if (!apiKey) {
    throw new Error('缺少 HUNYUAN_API_KEY，无法初始化 Hunyuan OpenAI 客户端');
  }
  return new OpenAI({ apiKey, baseURL });
}

module.exports = { getOpenAIForHunyuan };
