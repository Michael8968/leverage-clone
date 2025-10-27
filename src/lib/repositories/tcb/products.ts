import type { ProductsRepository } from '@/lib/repositories/products';
import { getTcbDb } from '@/lib/tcb';

export function createTcbProductsRepository(): ProductsRepository {
  return {
    async list() {
      const db = getTcbDb();
      const res = await db.collection('products').get();
      return res?.data || [];
    },
  };
}
