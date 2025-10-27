import type { PointsTransaction } from '@/lib/types';

export interface PointsStore {
  getBalance(userId: string): Promise<number | null>;
  deduct(userId: string, amount: number, reason: string, meta?: Partial<PointsTransaction>): Promise<void>;
}

export type StoreKind = 'tcb' | 'firebase-admin' | 'noop';
