import { getStoreKind } from '@/lib/datastore';
import type { Demand } from '@/lib/types';

export interface DemandsRepository {
  list(type?: string): Promise<Demand[]>;
}

export function getDemandsRepository(): DemandsRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/demands');
    return mod.createTcbDemandsRepository();
  }
  const jsonMod = require('./json/demands');
  return jsonMod.createJsonDemandsRepository();
}
