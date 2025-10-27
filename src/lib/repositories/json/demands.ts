import type { DemandsRepository } from '@/lib/repositories/demands';
import path from 'path';
import { promises as fs } from 'fs';

export function createJsonDemandsRepository(): DemandsRepository {
  return {
    async list(type?: string) {
      try {
        const file = path.join(process.cwd(), 'data', 'demands.json');
        const raw = await fs.readFile(file, 'utf-8');
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        if (!type) return list;
        return list.filter((d: any) => d?.type === type);
      } catch {
        return [];
      }
    },
  };
}
