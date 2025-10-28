// Tencent CloudBase PointsStore implementation
// Note: uses eval('require') to avoid bundling when not in use.
import type { PointsTransaction } from '@/lib/types';
import type { PointsStore } from './types';

function getTCB() {
  // Lazy require to avoid build-time resolution
  try {
    const req: NodeRequire = eval('require');
    return req('@cloudbase/node-sdk');
  } catch (err: any) {
    const msg = "Cannot find module '@cloudbase/node-sdk'.\n" +
      "This module must be installed in production (it's externalized during build).\n" +
      "Install it in your deployment target, e.g.: `npm install --production @cloudbase/node-sdk`.\n" +
      (err && err.message ? '\nOriginal error: ' + err.message : '');
    const e = new Error(msg);
    (e as any).original = err;
    throw e;
  }
}

function initTCB() {
  const envId = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID;
  const secretId = process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey = process.env.TENCENTCLOUD_SECRET_KEY;
  const region = process.env.TENCENTCLOUD_REGION || 'ap-guangzhou';

  if (!envId || !secretId || !secretKey) {
    throw new Error('TCB credentials missing: please set TCB_ENV_ID/CLOUDBASE_ENV_ID, TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY');
  }
  const tcb = getTCB();
  const app = tcb.init({
    env: envId,
    credentials: { secretId, secretKey },
    region,
  });
  return app;
}

export function createTcbPointsStore(): PointsStore {
  const app = initTCB();
  const db = app.database();
  const _ = db.command;

  return {
    async getBalance(userId: string) {
      const res = await db.collection('users').doc(userId).get();
      const doc = res?.data?.[0];
      if (!doc) return null;
      return typeof doc.points_balance === 'number' ? doc.points_balance : 0;
    },
    async deduct(userId: string, amount: number, reason: string, meta?: Partial<PointsTransaction>) {
      // Check balance first
      const balance = await this.getBalance(userId);
      if (balance == null) {
        console.warn(`TCB: user ${userId} not found, skip deduction`);
        return;
      }
      if (balance < amount) {
        throw new Error(`积分不足：当前余额 ${balance}，需要 ${amount}`);
      }

      // Deduct points
      await db.collection('users').doc(userId).update({
        points_balance: _.inc(-amount),
      });

      // Record transaction
      const transaction: Omit<PointsTransaction, 'id' | 'timestamp'> = {
        uid: userId,
        type: 'deduct',
        amount: -amount,
        reason,
        llm_action: meta?.llm_action || 'prompt_execution',
        status: 'approved',
        approvers: [],
      };
      await db.collection('points_transactions').add({
        ...transaction,
        timestamp: db.serverDate(),
      });
    },
  };
}
