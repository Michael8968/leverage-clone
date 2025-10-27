import { getStoreKind } from '@/lib/datastore';
import type { ProductService } from '@/lib/types';

export interface ProductsRepository {
  list(): Promise<ProductService[]>;
}

export type RepoKind = 'tcb' | 'json';

export function getProductsRepository(): ProductsRepository {
  const kind = getStoreKind();
  if (kind === 'tcb') {
    const mod = require('./tcb/products');
    return mod.createTcbProductsRepository();
  }
  const jsonMod = require('./json/products');
  return jsonMod.createJsonProductsRepository();
}
