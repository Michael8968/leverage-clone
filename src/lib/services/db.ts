/**
 * @file src/lib/services/db.ts
 * 惰性初始化的数据库服务：
 * - 构建阶段通过 SKIP_ENV_VALIDATION 跳过任何外部连接
 * - 生产运行时：服务端使用 @cloudbase/node-sdk，客户端使用 @cloudbase/js-sdk
 * - 开发：保持 Firebase Firestore（或在未配置时提供 mock）
 */

let dbInstance: any | null = null;
let dbType: 'firestore' | 'tcb' | 'mock' | null = null;
let initializationError: Error | null = null;

function resolveEnvId() {
  return process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.TCB_ENV_ID;
}

function createMockDb() {
  return new Proxy({}, {
    get(target, prop) {
      console.warn(`[Mock DB] Accessed '${String(prop)}' on mock database.`);
      return () => {
        console.warn('[Mock DB] Called a method on mock database. No-op.');
      };
    }
  });
}

function initDbIfNeeded() {
  if (dbInstance || initializationError) return;

  try {
    const env = process.env.NEXT_PUBLIC_ENV;
    const isBuildSkip = process.env.SKIP_ENV_VALIDATION === 'true';
    const isServer = typeof window === 'undefined';

    if (isBuildSkip) {
      // 构建阶段：确保无副作用
      dbInstance = null;
      dbType = 'mock';
      return;
    }

    if (env === 'production') {
      // 生产：区分服务端与客户端
      const envId = resolveEnvId();
      if (!envId) {
        throw new Error('TCB envId is not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.');
      }

      if (isServer) {
        // Node 运行时使用 Node SDK
        const tcb = require('@cloudbase/node-sdk');
        const app = tcb.init({ env: envId });
        dbInstance = app.database();
        dbType = 'tcb';
      } else {
        // 浏览器端使用 JS SDK，可选匿名登录
        const { init } = require('@cloudbase/js-sdk');
        const app = init({ env: envId });
        try {
          app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
        } catch (_) {
          // 浏览器不可用或未开启匿名登录时忽略
        }
        dbInstance = app.database();
        dbType = 'tcb';
      }
    } else {
      // 开发：优先使用 Firebase（若未配置则 mock）
      const firebaseConfigRaw = process.env.FIREBASE_CONFIG;
      if (!firebaseConfigRaw || firebaseConfigRaw.trim() === '') {
        dbInstance = createMockDb();
        dbType = 'mock';
      } else {
        const { initializeApp, getApps, getApp } = require('firebase/app');
        const { getFirestore } = require('firebase/firestore');
        const firebaseConfig = JSON.parse(firebaseConfigRaw);
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        dbInstance = getFirestore(app);
        dbType = 'firestore';
      }
    }
  } catch (err) {
    console.error('[DB Service] CRITICAL: Database initialization failed.', err);
    initializationError = err as Error;
    dbInstance = null;
    dbType = null;
  }
}

export function getDb() {
  initDbIfNeeded();
  if (dbInstance) return dbInstance;
  if (initializationError) {
    const reason = initializationError?.message || 'unknown error';
    throw new Error(`Database service is not available due to initialization failure: ${reason}`);
  }
  // 构建阶段或显式 mock
  return createMockDb();
}

export function getDbType() {
  initDbIfNeeded();
  return dbType;
}

export function getDbInitializationError() {
  initDbIfNeeded();
  return initializationError;
}

// ---- Backwards compatibility exports ----
// Some legacy modules may still import { db, dbType } directly.
// Provide live getters to avoid refactor churn.
export const db = new Proxy({}, {
  get(_target, prop) {
    const real = getDb();
    // Forward property access to real instance
    return (real as any)[prop as any];
  }
});

Object.defineProperty(exports, 'dbType', {
  enumerable: true,
  get() {
    return getDbType();
  }
});

export function getStorage() {
  const env = process.env.NEXT_PUBLIC_ENV;
  const isBuildSkip = process.env.SKIP_ENV_VALIDATION === 'true';
  if (isBuildSkip) {
    return {
      uploadFile: async () => ({ fileID: 'mock-file-id' }),
      downloadFile: async () => ({ fileContent: 'mock-content' }),
      getTempFileURL: async () => ({ fileList: [{ tempFileURL: 'mock-url' }] }),
      deleteFile: async () => ({ fileList: [] })
    };
  }

  if (env === 'production') {
    const envId = resolveEnvId();
    if (!envId) {
      throw new Error('TCB envId is not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.');
    }
    const isServer = typeof window === 'undefined';
    if (isServer) {
      const tcb = require('@cloudbase/node-sdk');
      const app = tcb.init({ env: envId });
      return app.storage();
    }
    const { init } = require('@cloudbase/js-sdk');
    const app = init({ env: envId });
    return app.storage();
  }

  // 开发：mock storage
  console.warn('[Storage Service] Using mock storage for development');
  return {
    uploadFile: async () => ({ fileID: 'mock-file-id' }),
    downloadFile: async () => ({ fileContent: 'mock-content' }),
    getTempFileURL: async () => ({ fileList: [{ tempFileURL: 'mock-url' }] }),
    deleteFile: async () => ({ fileList: [] })
  };
}
