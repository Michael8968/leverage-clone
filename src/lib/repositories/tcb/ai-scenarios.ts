import type { AiScenariosRepository } from '@/lib/repositories/ai-scenarios';
import { getTcbDb } from '@/lib/tcb';

export function createTcbAiScenariosRepository(): AiScenariosRepository {
  return {
    async list() {
      const db = getTcbDb();
      const res = await db.collection('ai_scenarios').get();
      return res?.data || [];
    },
  };
}
