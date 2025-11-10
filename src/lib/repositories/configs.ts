import { getStoreKind } from '@/lib/datastore';

export interface ConfigsRepository {
  getConfig(collection: string, id: string): Promise<any | null>;
  setConfig(collection: string, id: string, data: any): Promise<void>;
}

export function getConfigsRepository(): ConfigsRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/configs');
    return mod.createTcbConfigsRepository();
  }
  const jsonMod = require('./json/configs');
  return jsonMod.createJsonConfigsRepository();
}
