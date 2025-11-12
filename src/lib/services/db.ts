/**
 * Unified lazy database/service layer.
 * Modes:
 *  - Production: Tencent CloudBase (TCB) via node-sdk on server, js-sdk on client
 *  - Development: Firebase Firestore if FIREBASE_CONFIG provided, else mock
 *  - Build phase (SKIP_ENV_VALIDATION=true): always mock (no side effects)
 */

export type RuntimeDbType = 'tcb' | 'mock' | null;

let dbInstance: any | null = null;
let runtimeDbType: RuntimeDbType = null;
let initializationError: Error | null = null;

function resolveEnvId() {
  return process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.TCB_ENV_ID;
}

function createMockDb() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        // Return no‑op functions to avoid undefined access explosions
        return () => {
          console.warn(`[Mock DB] Called ${String(prop)}(); no operation performed.`);
          return null;
        };
      },
    }
  );
}

function initDbIfNeeded() {
  if (dbInstance || initializationError) return;

  try {
    const envMode = process.env.NEXT_PUBLIC_ENV;
    const skip = process.env.SKIP_ENV_VALIDATION === 'true';
    const isServer = typeof window === 'undefined';

    if (skip) {
      dbInstance = null;
      runtimeDbType = 'mock';
      return;
    }

    if (envMode === 'production') {
      const envId = resolveEnvId();
      if (!envId) throw new Error('TCB envId not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.');

      if (isServer) {
        const tcb = require('@cloudbase/node-sdk');
        const app = tcb.init({
          env: envId,
          secretId: process.env.TCB_SECRET_ID,
          secretKey: process.env.TCB_SECRET_KEY,
        });
        dbInstance = app.database();
        runtimeDbType = 'tcb';
      } else {
        const { init } = require('@cloudbase/js-sdk');
        const app = init({ env: envId });
        try {
          app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
        } catch (_) {
          // ignore if not enabled
        }
        dbInstance = app.database();
        runtimeDbType = 'tcb';
      }
    } else {
      // development: Firebase removed -> always mock unless explicitly using production TCB.
      dbInstance = createMockDb();
      runtimeDbType = 'mock';
    }
  } catch (err) {
    console.error('[DB Service] Initialization failed:', err);
    initializationError = err as Error;
    dbInstance = null;
    runtimeDbType = null;
  }
}

export function getDb(): any {
  initDbIfNeeded();
  if (dbInstance) return dbInstance;
  if (initializationError) {
    throw new Error(
      `Database unavailable due to initialization failure: ${initializationError.message}`
    );
  }
  // build phase or mock fallback
  return createMockDb();
}

export function getDbType(): RuntimeDbType {
  initDbIfNeeded();
  return runtimeDbType;
}

export function getDbInitializationError(): Error | null {
  initDbIfNeeded();
  return initializationError;
}

// Backwards compatibility live proxy export (legacy code may import { db })
export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getDb();
      return (real as any)[prop as any];
    },
  }
) as any;

// Storage abstraction for TCB or mock/dev
export function getStorage() {
  const envMode = process.env.NEXT_PUBLIC_ENV;
  const skip = process.env.SKIP_ENV_VALIDATION === 'true';
  if (skip) {
    return {
      uploadFile: async () => ({ fileID: 'mock-file-id' }),
      downloadFile: async () => ({ fileContent: 'mock-content' }),
      getTempFileURL: async () => ({ fileList: [{ tempFileURL: 'mock-url' }] }),
      deleteFile: async () => ({ fileList: [] }),
    };
  }
  if (envMode === 'production') {
    const envId = resolveEnvId();
    if (!envId) throw new Error('TCB envId not configured for storage.');
    const isServer = typeof window === 'undefined';
    if (isServer) {
      const tcb = require('@cloudbase/node-sdk');
      const app = tcb.init({
        env: envId,
        secretId: process.env.TCB_SECRET_ID,
        secretKey: process.env.TCB_SECRET_KEY,
      });
      return app.storage();
    } else {
      const { init } = require('@cloudbase/js-sdk');
      const app = init({ env: envId });
      return app.storage();
    }
  }
  // development mock
  console.warn('[Storage] Using mock storage (development)');
  return {
    uploadFile: async () => ({ fileID: 'mock-file-id' }),
    downloadFile: async () => ({ fileContent: 'mock-content' }),
    getTempFileURL: async () => ({ fileList: [{ tempFileURL: 'mock-url' }] }),
    deleteFile: async () => ({ fileList: [] }),
  };
}
 
