// 批量发放积分的云函数（示例）
// 运行时：Node.js 16/18

let app, db, _;

function initTCB() {
  if (app && db) return;
  const env = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const region = process.env.TENCENTCLOUD_REGION || 'ap-guangzhou';
  if (!env || !secretId || !secretKey) {
    throw new Error('Missing TCB credentials');
  }
  const tcb = require('@cloudbase/node-sdk');
  app = tcb.init({ env, credentials: { secretId, secretKey }, region });
  db = app.database();
  _ = db.command;
}

exports.main_handler = async (event, context) => {
  initTCB();
  const { role = 'user', gift = 100 } = event || {};

  // 查找目标用户（示例：所有普通用户）
  const res = await db.collection('users').where({ role }).limit(1000).get();
  const users = res?.data || [];

  // 逐个增加积分并记录交易
  for (const u of users) {
    try {
      await db.collection('users').doc(u._id || u.uid).update({ points_balance: _.inc(gift) });
      await db.collection('points_transactions').add({
        uid: u.uid,
        type: 'gift',
        amount: gift,
        reason: 'SCF points grant',
        status: 'approved',
        timestamp: db.serverDate(),
      });
    } catch (e) {
      console.log('Grant failed for', u.uid, e?.message);
    }
  }

  return { granted: users.length, gift };
};
