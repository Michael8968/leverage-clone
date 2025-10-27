import type { SuppliersRepository } from '@/lib/repositories/suppliers';
import { getTcbDb } from '@/lib/tcb';

export function createTcbSuppliersRepository(): SuppliersRepository {
  return {
    async list() {
      const db = getTcbDb();
      const res = await db.collection('suppliers').get();
      return res?.data || [];
    },
  };
}
