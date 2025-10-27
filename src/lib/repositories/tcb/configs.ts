import type { ConfigsRepository } from '@/lib/repositories/configs';
import { getTcbDb } from '@/lib/tcb';

export function createTcbConfigsRepository(): ConfigsRepository {
  return {
    async getConfig(collection: string, id: string) {
      const db = getTcbDb();
      try {
        const doc = await db.collection(collection).doc(id).get();
        return doc?.data || null;
      } catch {
        return null;
      }
    },
    async setConfig(collection: string, id: string, data: any) {
      const db = getTcbDb();
      await db.collection(collection).doc(id).set(data);
    }
  };
}
