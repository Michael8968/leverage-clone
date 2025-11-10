/**
 * @file src/lib/tcb.ts
 * @description Tencent CloudBase SDK initialization.
 */

import cloudbase from '@cloudbase/node-sdk';

const tcbApp = cloudbase.init({
  env: process.env.NEXT_PUBLIC_TCB_ENV_ID || 'your-env-id',
});

// Initialize services
export const getTcbApp = () => tcbApp;

export const getTcbDb = () => tcbApp.database();

export const getTcbAuth = () => tcbApp.auth();

// Export db directly for compatibility
export const db = getTcbDb();