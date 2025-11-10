import OpenAI from 'openai';

export function getOpenAIForHunyuan() {
  const apiKey = process.env.HUNYUAN_API_KEY;
  const baseURL = process.env.HUNYUAN_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1';
  
  // Allow build time to proceed without API key
  if (!apiKey) {
    if (process.env.SKIP_ENV_VALIDATION === 'true') {
      console.log('[Hunyuan] Build time detected, returning mock client');
      // Return a mock client for build time
      return new OpenAI({ apiKey: 'build-time-mock-key', baseURL });
    }
    throw new Error('缺少 HUNYUAN_API_KEY，无法初始化 Hunyuan OpenAI 客户端');
  }
  return new OpenAI({ apiKey, baseURL });
}
