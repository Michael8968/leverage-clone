
require('dotenv').config();

const { getHunyuanClient } = require('./src/utils/hunyuan-client');
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({ env: process.env.CLOUDBASE_ENV_ID });
const db = app.database();

async function testAllFlows() {
  try {
    const client = getHunyuanClient();
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
    // 测试3: 澄清
    const res3 = await require('./src/ai/flows/clarify-demand-details').clarifyDemandDetails({
      context: '模糊礼物需求'
    });
    console.log('Test3 Clarify:', res3.questions);
    // 验证扣分
    const deduct = await db.collection('points_transactions').where({ uid: 'test1' }).limit(1).get();
    console.log('Deducted:', deduct.data[0]?.amount);
  } catch (e) {
    console.error('Error:', e);
  }
}

testAllFlows();
