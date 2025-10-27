import type { SuppliersRepository } from '@/lib/repositories/suppliers';
import path from 'path';
import { promises as fs } from 'fs';

export function createJsonSuppliersRepository(): SuppliersRepository {
  return {
    async list() {
      try {
        const file = path.join(process.cwd(), 'data', 'suppliers.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
  };
}
