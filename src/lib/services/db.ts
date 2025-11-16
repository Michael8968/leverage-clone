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

// Lazy load client SDK to avoid SSR issues
// Use a function that webpack can properly tree-shake and bundle
function getCloudbaseJsSdk() {
  if (typeof window === 'undefined') {
    return null; // Server-side, should not be called
  }
  try {
    // Use require with webpack comment to ensure proper bundling
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require('@cloudbase/js-sdk');
    
    // Debug: log the actual module structure in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[DB Service] @cloudbase/js-sdk loaded:', {
        type: typeof sdk,
        hasInit: sdk?.init !== undefined,
        initType: typeof sdk?.init,
        hasDefault: sdk?.default !== undefined,
        keys: sdk ? Object.keys(sdk).slice(0, 10) : [],
      });
    }
    
    // Verify the module structure - check for init method
    if (sdk && typeof sdk === 'object' && typeof sdk.init === 'function') {
      return sdk;
    }
    
    // Fallback: check if it's a default export
    if (sdk && sdk.default) {
      if (typeof sdk.default === 'object' && typeof sdk.default.init === 'function') {
        return sdk.default;
      }
      // If default is the init function itself
      if (typeof sdk.default === 'function') {
        return { init: sdk.default };
      }
    }
    
    // If structure is unexpected, log and throw
    console.error('[DB Service] Unexpected @cloudbase/js-sdk structure:', {
      type: typeof sdk,
      isNull: sdk === null,
      isUndefined: sdk === undefined,
      hasInit: sdk?.init !== undefined,
      initType: typeof sdk?.init,
      hasDefault: sdk?.default !== undefined,
      defaultType: typeof sdk?.default,
      keys: sdk && typeof sdk === 'object' ? Object.keys(sdk).slice(0, 20) : [],
      stringified: String(sdk).substring(0, 100),
    });
    throw new Error('@cloudbase/js-sdk does not have expected structure. init method not found.');
  } catch (e: any) {
    console.error('[DB Service] Failed to load @cloudbase/js-sdk:', e);
    console.error('[DB Service] Error details:', {
      message: e?.message,
      stack: e?.stack?.substring(0, 200),
      name: e?.name,
    });
    throw new Error(`Failed to load @cloudbase/js-sdk: ${e.message || String(e)}`);
  }
}

function resolveEnvId() {
  return process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.TCB_ENV_ID;
}

function createMockDb() {
  // Create a mock collection that returns a query-like object
  const createMockCollection = (path: string) => {
    return {
      get: async () => {
        console.warn(`[Mock DB] collection('${path}').get() called; returning empty result.`);
        return {
          docs: [],
          empty: true,
          size: 0,
        };
      },
      doc: (id: string) => ({
        get: async () => {
          console.warn(`[Mock DB] collection('${path}').doc('${id}').get() called; returning null.`);
          return { exists: false, data: () => null, id };
        },
        set: async () => {
          console.warn(`[Mock DB] collection('${path}').doc('${id}').set() called; no operation performed.`);
        },
        update: async () => {
          console.warn(`[Mock DB] collection('${path}').doc('${id}').update() called; no operation performed.`);
        },
        delete: async () => {
          console.warn(`[Mock DB] collection('${path}').doc('${id}').delete() called; no operation performed.`);
        },
        remove: async () => {
          console.warn(`[Mock DB] collection('${path}').doc('${id}').remove() called; no operation performed.`);
        },
      }),
      add: async () => {
        console.warn(`[Mock DB] collection('${path}').add() called; returning mock ID.`);
        return { id: 'mock-id-' + Date.now() };
      },
      where: () => createMockCollection(path),
      orderBy: () => createMockCollection(path),
      limit: () => createMockCollection(path),
    };
  };

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'collection') {
          return createMockCollection;
        }
        // Return no‑op functions for other properties
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
        // Client-side: use lazy-loaded SDK
        try {
          const cloudbaseModule = getCloudbaseJsSdk();
          if (!cloudbaseModule) {
            throw new Error('@cloudbase/js-sdk is not available on client side');
          }
          
          // The module should have an init method
          if (!cloudbaseModule.init || typeof cloudbaseModule.init !== 'function') {
            console.error('[DB Service] @cloudbase/js-sdk module structure:', {
              type: typeof cloudbaseModule,
              hasInit: cloudbaseModule?.init !== undefined,
              keys: cloudbaseModule ? Object.keys(cloudbaseModule).slice(0, 10) : [],
            });
            throw new Error('init function not found in @cloudbase/js-sdk. Module may not be properly bundled.');
          }
          
          const app = cloudbaseModule.init({ env: envId });
          try {
            app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
          } catch (_) {
            // ignore if not enabled
          }
          dbInstance = app.database();
          runtimeDbType = 'tcb';
        } catch (importError: any) {
          console.error('[DB Service] Failed to initialize @cloudbase/js-sdk:', importError);
          throw new Error(`Failed to load @cloudbase/js-sdk: ${importError.message || String(importError)}`);
        }
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
      // Client-side: use lazy-loaded SDK
      try {
        const cloudbaseModule = getCloudbaseJsSdk();
        if (!cloudbaseModule) {
          throw new Error('@cloudbase/js-sdk is not available on client side');
        }
        
        if (!cloudbaseModule.init || typeof cloudbaseModule.init !== 'function') {
          throw new Error('init function not found in @cloudbase/js-sdk for storage');
        }
        
        const app = cloudbaseModule.init({ env: envId });
        return app.storage();
      } catch (importError: any) {
        throw new Error(`Failed to load @cloudbase/js-sdk for storage: ${importError.message || String(importError)}`);
      }
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
 
