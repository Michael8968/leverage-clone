import type { PointsStore, StoreKind } from './types';
import { createNoopPointsStore } from './noop-points';

export function getStoreKind(): StoreKind {
  const k = (process.env.DATASTORE || process.env.DATA_STORE || '').toLowerCase();
  if (k === 'tcb' || process.env.USE_TCB === '1') return 'tcb';
  // Firebase-admin removed; treat any legacy value as noop.
  return 'noop';
}

export function getPointsStore(): PointsStore {
  const kind = getStoreKind();
  try {
    if (kind === 'tcb') {
      const req: NodeRequire = eval('require');
      const mod = req('./tcb-points');
      return mod.createTcbPointsStore();
    }
  } catch (e) {
    console.warn('Datastore initialization failed, falling back to noop:', e);
  }
  return createNoopPointsStore();
}
