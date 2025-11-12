/**
 * @file src/lib/tcb.ts
 * @description Tencent CloudBase SDK initialization.
 */

import cloudbase from '@cloudbase/node-sdk';

// Validate required environment variables
const envId = process.env.NEXT_PUBLIC_TCB_ENV_ID || process.env.TCB_ENV_ID;
const secretId = process.env.TCB_SECRET_ID;
const secretKey = process.env.TCB_SECRET_KEY;

if (!envId) {
  throw new Error('TCB environment ID is not configured. Set NEXT_PUBLIC_TCB_ENV_ID or TCB_ENV_ID.');
}

if (!secretId || !secretKey) {
  console.warn('[TCB] Secret ID or Secret Key not configured. TCB operations may fail.');
}

const tcbApp = cloudbase.init({
  env: envId,
  secretId: secretId,
  secretKey: secretKey,
});

// Initialize services
export const getTcbApp = () => tcbApp;

export const getTcbDb = () => tcbApp.database();

export const getTcbAuth = () => tcbApp.auth();

// Export db directly for compatibility
export const db = getTcbDb();