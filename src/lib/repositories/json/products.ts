import type { ProductsRepository } from '@/lib/repositories/products';
import path from 'path';
import { promises as fs } from 'fs';

export function createJsonProductsRepository(): ProductsRepository {
  return {
    async list() {
      try {
        const file = path.join(process.cwd(), 'data', 'products.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  };
}
