
require('dotenv').config();

const { getOpenAIForHunyuan } = require('./src/utils/openai-hunyuan');
const cloudbase = require('@cloudbase/node-sdk');
const envId = process.env.CLOUDBASE_ENV_ID || process.env.NEXT_PUBLIC_CLOUDBASE_ENV_ID;
const secretId = process.env.TENCENTCLOUD_SECRET_ID || process.env.CLOUDBASE_SECRET_ID;
const secretKey = process.env.TENCENTCLOUD_SECRET_KEY || process.env.CLOUDBASE_SECRET_KEY;
const app = cloudbase.init({ env: envId, secretId, secretKey });
const db = app.database();

async function testAllFlows() {
  try {
    const client = getOpenAIForHunyuan();
    // 测试1: executePrompt
    const res1 = await require('./src/ai/flows/prompt-execution-flow').executePrompt({
      prompt: '推荐 3D 模型',
      scenario: '礼物设计',
      userId: 'test1'
    });
    console.log('Test1 Prompt:', res1.output, 'Cost:', res1.cost);
    // 测试2: routing
    const res2 = await require('./src/ai/flows/intelligent-routing-flow').intelligentRoutingFlow({ demand: '设计 logo' });
    console.log('Test2 Routing:', res2.assignedCreatorId, res2.reason);
    // 测试3: 澄清（按新签名传入必要字段）
    const res3 = await require('./src/ai/flows/clarify-demand-details').clarifyDemandDetails({
      demandId: 'd-clarify-1',
      demandTitle: '礼物设计需求澄清',
      demandDescription: '用户表达了一个模糊的礼物设计需求',
      chatHistory: [
        { id: 'm1', text: '我想做一个有创意的礼物', senderId: 'test1', isAIMessage: false },
        { id: 'm2', text: '好的，你更偏好科技感还是温馨风格？', senderId: 'ai', isAIMessage: true },
      ],
      userId: 'test1',
      creatorId: 'creator1',
    });
    console.log('Test3 Clarify:', res3.clarification);
    // 验证扣分（严格校验：集合存在且有记录，否则报错）
    const deduct = await db.collection('points_transactions').where({ uid: 'test1' }).limit(1).get();
    if (!deduct?.data || deduct.data.length === 0) {
      throw new Error('Strict check failed: points_transactions has no record for uid=test1');
    }
    console.log('Deducted:', deduct.data[0]?.amount);
  } catch (e) {
    console.error('Error:', e);
  }
}

testAllFlows();
