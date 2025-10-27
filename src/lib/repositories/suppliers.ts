import { getStoreKind } from '@/lib/datastore';
import type { Supplier } from '@/lib/types';

export interface SuppliersRepository {
  list(): Promise<Supplier[]>;
}

export function getSuppliersRepository(): SuppliersRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/suppliers');
    return mod.createTcbSuppliersRepository();
  }
  const jsonMod = require('./json/suppliers');
  return jsonMod.createJsonSuppliersRepository();
}
