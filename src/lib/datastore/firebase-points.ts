// Firebase Admin PointsStore implementation (for fallback/testing)
import type { PointsTransaction } from '@/lib/types';
import type { PointsStore } from './types';
import { getAdminDb } from '@/lib/firebase-admin';

export function createFirebasePointsStore(): PointsStore {
  const db = getAdminDb();

  return {
    async getBalance(userId: string) {
      const ref = db.collection('users').doc(userId);
      const snap = await ref.get();
      if (!snap.exists) return null;
      const data = snap.data() as any;
      return typeof data?.points_balance === 'number' ? data.points_balance : 0;
    },
    async deduct(userId: string, amount: number, reason: string, meta?: Partial<PointsTransaction>) {
      const ref = db.collection('users').doc(userId);
      const snap = await ref.get();
      if (!snap.exists) {
        console.warn(`Firebase: user ${userId} not found, skip deduction`);
        return;
      }
      const data = snap.data() as any;
      const current = typeof data?.points_balance === 'number' ? data.points_balance : 0;
      if (current < amount) {
        throw new Error(`积分不足：当前余额 ${current}，需要 ${amount}`);
      }
      await ref.update({ points_balance: (current - amount) });

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
        timestamp: new Date(),
      });
    },
  };
}
