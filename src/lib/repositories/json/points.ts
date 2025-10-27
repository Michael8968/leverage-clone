import type { PointsRepository } from '@/lib/repositories/points';
import path from 'path';
import { promises as fs } from 'fs';

export function createJsonPointsRepository(): PointsRepository {
  return {
    async listTransactions(uid?: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'points_transactions.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        const arr = Array.isArray(list) ? list : [];
        return uid ? arr.filter((t: any) => t.uid === uid) : arr;
      } catch {
        return [];
      }
    },
    async getBalance(uid: string) {
      const list = await this.listTransactions(uid);
      return list.reduce((s: number, r: any) => s + (typeof r.amount === 'number' ? r.amount : 0), 0);
    },
    async addTransaction(tx) {
      // For JSON fallback we don't persist mutations
      return;
    }
  };
}
