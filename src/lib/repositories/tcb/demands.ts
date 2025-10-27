import type { DemandsRepository } from '@/lib/repositories/demands';
import { getTcbDb } from '@/lib/tcb';

export function createTcbDemandsRepository(): DemandsRepository {
  return {
    async list(type?: string) {
      const db = getTcbDb();
      const coll = db.collection('demands');
      const q = type ? coll.where({ type }) : coll;
      const res = await q.get();
      return res?.data || [];
    },
  };
}
