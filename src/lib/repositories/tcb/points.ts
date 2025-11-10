import type { PointsRepository } from '@/lib/repositories/points';
import { getTcbDb } from '@/lib/tcb';

export function createTcbPointsRepository(): PointsRepository {
  return {
    async listTransactions(uid?: string) {
      const db = getTcbDb();
      const coll = db.collection('points_transactions');
      const q = uid ? coll.where({ uid }) : coll;
      const res = await q.get();
      return res?.data || [];
    },
    async getBalance(uid: string) {
      const db = getTcbDb();
      // Simple aggregation: sum amounts for uid
      const res = await db.collection('points_transactions').where({ uid }).get();
      const list = res?.data || [];
      return list.reduce((s: number, r: any) => s + (typeof r.amount === 'number' ? r.amount : 0), 0);
    },
    async addTransaction(tx) {
      const db = getTcbDb();
      await db.collection('points_transactions').add(tx);
    }
  };
}
