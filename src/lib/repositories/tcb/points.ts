import type { PointsRepository } from '@/lib/repositories/points';
import { getTcbDb } from '@/lib/tcb';

export function createTcbPointsRepository(): PointsRepository {
  return {
    async listTransactions(userId?: string) {
      const db = getTcbDb();
      const coll = db.collection('points_transactions');
      const q = userId ? coll.where({ userId }) : coll;
      const res = await q.get();
      return res?.data || [];
    },
    async getBalance(userId: string) {
      const db = getTcbDb();
      // Simple aggregation: sum pointsChange for userId
      const res = await db.collection('points_transactions').where({ userId }).get();
      const list = res?.data || [];
      return list.reduce((s: number, r: any) => s + (typeof r.pointsChange === 'number' ? r.pointsChange : 0), 0);
    },
    async addTransaction(tx) {
      const db = getTcbDb();
      const toInsert = { ...tx, createdAt: new Date() };
      await db.collection('points_transactions').add(toInsert);
    }
  };
}
