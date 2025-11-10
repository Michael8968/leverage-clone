/**
 * Lazy Firebase Admin initialization (development only).
 * Prevents accidental production bundle inclusion and avoids build-time failures.
 */

import type { App } from 'firebase-admin/app';

let adminApp: App | null = null;
let initError: Error | null = null;

function canUseAdmin() {
  // Only allow in explicit development mode
  if (process.env.NEXT_PUBLIC_ENV !== 'development') return false;
  // Require service account JSON
  if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) return false;
  try {
    const parsed = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
    return typeof parsed?.project_id === 'string' && parsed.project_id.length > 0;
  } catch (_) {
    return false;
  }
}

export function getFirebaseAdmin() {
  if (adminApp || initError) return { adminApp, initError };
  if (!canUseAdmin()) {
    initError = new Error('Firebase Admin not available: missing project_id or not in development environment.');
    return { adminApp, initError };
  }
  try {
    const admin = require('firebase-admin');
    const creds = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON as string);
    adminApp = admin.apps.length ? admin.app() : admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
  } catch (e: any) {
    initError = e;
  }
  return { adminApp, initError };
}

export function getAdminError() {
  return initError;
}
