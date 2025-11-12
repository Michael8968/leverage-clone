/**
 * @file src/lib/tcb.ts
 * @description Tencent CloudBase SDK initialization.
 */

import cloudbase from '@cloudbase/node-sdk';

let tcbApp: ReturnType<typeof cloudbase.init> | null = null;

/**
 * Initialize TCB app lazily
 */
export function initTcbApp() {
  if (tcbApp) {
    return tcbApp;
  }

  // Validate required environment variables
  const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.TCB_ENV_ID;
  const secretId = process.env.TCB_SECRET_ID;
  const secretKey = process.env.TCB_SECRET_KEY;

  if (!envId) {
    // During build time, return a dummy instance to avoid errors
    if (process.env.NODE_ENV === 'production' && !secretId) {
      console.warn('[TCB] Building without full env config - using placeholder');
      return null as any;
    }
    throw new Error('TCB environment ID is not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.');
  }

  if (!secretId || !secretKey) {
    console.warn('[TCB] Secret ID or Secret Key not configured. TCB operations may fail.');
  }

  tcbApp = cloudbase.init({
    env: envId,
    secretId: secretId,
    secretKey: secretKey,
  });

  return tcbApp;
}

// Initialize services
export const getTcbApp = () => initTcbApp();

export const getTcbDb = () => {
  const app = initTcbApp();
  return app ? app.database() : null as any;
};

export const getTcbAuth = () => {
  const app = initTcbApp();
  return app ? app.auth() : null as any;
};

// Export db directly for compatibility
export const db = getTcbDb();