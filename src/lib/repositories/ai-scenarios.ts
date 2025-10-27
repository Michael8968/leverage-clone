import { getStoreKind } from '@/lib/datastore';
import type { AIScenario } from '@/lib/types';

export interface AiScenariosRepository {
  list(): Promise<AIScenario[]>;
}

export function getAiScenariosRepository(): AiScenariosRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/ai-scenarios');
    return mod.createTcbAiScenariosRepository();
  }
  const jsonMod = require('./json/ai-scenarios');
  return jsonMod.createJsonAiScenariosRepository();
}
