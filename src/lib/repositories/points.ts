import { getStoreKind } from '@/lib/datastore';
import type { PointsTransaction } from '@/lib/types';

export interface PointsRepository {
  listTransactions(uid?: string): Promise<PointsTransaction[]>;
  getBalance(uid: string): Promise<number>;
  addTransaction(tx: Omit<PointsTransaction, 'id' | 'timestamp'>): Promise<void>;
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
