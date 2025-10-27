import type { ConfigsRepository } from '@/lib/repositories/configs';

export function createJsonConfigsRepository(): ConfigsRepository {
  return {
    async getConfig(_collection: string, _id: string) {
      return null;
    },
    async setConfig(_collection: string, _id: string, _data: any) {
      // no-op for JSON fallback
      return;
    }
  };
}
