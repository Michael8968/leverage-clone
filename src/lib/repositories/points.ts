import { getStoreKind } from '@/lib/datastore';
import type { PointsTransaction } from '@/lib/types';

export interface PointsRepository {
  listTransactions(userId?: string): Promise<PointsTransaction[]>;
  getBalance(userId: string): Promise<number>;
  addTransaction(tx: Omit<PointsTransaction, '_id' | 'createdAt'>): Promise<void>;
}

export function getPointsRepository(): PointsRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/points');
    return mod.createTcbPointsRepository();
  }
  const jsonMod = require('./json/points');
  return jsonMod.createJsonPointsRepository();
}
