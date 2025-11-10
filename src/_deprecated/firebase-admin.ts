/**
 * TCB Admin SDK Facade (Firebase removed)
 * Fully routes to Tencent CloudBase (TCB) Admin SDK.
 * Firebase Admin fallback has been removed per PRD (no Firebase deps/auth/db/storage).
 */

import { getTcbAuthAdmin, getTcbFirestoreAdmin, getTcbStorageAdmin } from '@/lib/tcb-admin';

// =====================================================================
// Compatibility Exports
// =====================================================================

/**
 * Gets the Firebase Admin Auth instance
 * Routes to TCB Auth Admin or falls back to Firebase Admin
 */
export function getAdminAuth() {
  // TCB-only
  return getTcbAuthAdmin();
}

/**
 * Gets the Firebase Admin Firestore instance
 * Routes to TCB Firestore Admin or falls back to Firebase Admin
 */
export function getAdminDb() {
  // TCB-only
  return getTcbFirestoreAdmin();
}

/**
 * Gets the Firebase Admin Storage instance
 * Routes to TCB Storage Admin or falls back to Firebase Admin
 */
export function getAdminStorage() {
  // TCB-only
  return getTcbStorageAdmin();
}

// =====================================================================
// Re-export for compatibility
// =====================================================================

export { getTcbAuthAdmin, getTcbFirestoreAdmin, getTcbStorageAdmin };

