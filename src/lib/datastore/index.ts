import type { PointsStore, StoreKind } from './types';
import { createNoopPointsStore } from './noop-points';

export function getStoreKind(): StoreKind {
  const k = (process.env.DATASTORE || process.env.DATA_STORE || '').toLowerCase();
  if (k === 'tcb' || process.env.USE_TCB === '1') return 'tcb';
  if (k === 'firebase-admin') return 'firebase-admin';
  return 'noop';
}

export function getPointsStore(): PointsStore {
  const kind = getStoreKind();
  try {
    if (kind === 'tcb') {
      // Lazy import to avoid bundling
      // eslint-disable-next-line no-eval
      const req: NodeRequire = eval('require');
      const mod = req('./tcb-points');
      return mod.createTcbPointsStore();
    }
    if (kind === 'firebase-admin') {
      // eslint-disable-next-line no-eval
      const req: NodeRequire = eval('require');
      const mod = req('./firebase-points');
      return mod.createFirebasePointsStore();
    }
  } catch (e) {
    console.warn('Datastore initialization failed, falling back to noop:', e);
  }
  return createNoopPointsStore();
}
