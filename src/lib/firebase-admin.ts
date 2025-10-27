/**
 * Firebase Admin SDK Compatibility Layer
 * Routes to Tencent CloudBase (TCB) Admin SDK
 * This allows gradual migration from Firebase to TCB without changing calling code
 */

import {
  getTcbAuthAdmin,
  getTcbFirestoreAdmin,
  getTcbStorageAdmin,
  auth as tcbAuth,
  firestore as tcbFirestore,
  storage as tcbStorage,
} from '@/lib/tcb-admin';

// =====================================================================
// Fallback to legacy Firebase Admin (if TCB credentials are unavailable)
// =====================================================================

let _useLegacyFirebase = false;
let _legacyAdmin: any = null;

function tryInitializeLegacyFirebase() {
  if (_useLegacyFirebase || _legacyAdmin) return;
  
  try {
    // Only initialize Firebase Admin if TCB is not available and Firebase is configured
    const hasFirebaseConfig = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasTcbConfig = process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID;
    
    if (hasFirebaseConfig && !hasTcbConfig) {
      console.log('Firebase Admin: Initializing legacy Firebase Admin (TCB not configured)');
      _useLegacyFirebase = true;
      
      // eslint-disable-next-line no-eval
      const req: NodeRequire = eval('require');
      const admin = req('firebase-admin');

      if (admin.apps.length === 0) {
        const serviceAccountKeyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKeyString) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not set');
        }
        const serviceAccount = JSON.parse(serviceAccountKeyString);
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: bucketName,
        });
      }
      _legacyAdmin = admin;
    }
  } catch (error: any) {
    console.warn('Firebase Admin: Failed to initialize legacy Firebase:', error.message);
  }
}

// =====================================================================
// Compatibility Exports
// =====================================================================

/**
 * Gets the Firebase Admin Auth instance
 * Routes to TCB Auth Admin or falls back to Firebase Admin
 */
export function getAdminAuth() {
  try {
    // Try TCB first
    return getTcbAuthAdmin();
  } catch (error: any) {
    console.warn('Firebase Admin: TCB Auth not available, falling back to Firebase:', error.message);
    tryInitializeLegacyFirebase();
    if (_legacyAdmin) {
      return _legacyAdmin.auth();
    }
    throw new Error('Neither TCB nor Firebase Admin is configured');
  }
}

/**
 * Gets the Firebase Admin Firestore instance
 * Routes to TCB Firestore Admin or falls back to Firebase Admin
 */
export function getAdminDb() {
  try {
    // Try TCB first
    return getTcbFirestoreAdmin();
  } catch (error: any) {
    console.warn('Firebase Admin: TCB Firestore not available, falling back to Firebase:', error.message);
    tryInitializeLegacyFirebase();
    if (_legacyAdmin) {
      return _legacyAdmin.firestore();
    }
    throw new Error('Neither TCB nor Firebase Admin is configured');
  }
}

/**
 * Gets the Firebase Admin Storage instance
 * Routes to TCB Storage Admin or falls back to Firebase Admin
 */
export function getAdminStorage() {
  try {
    // Try TCB first
    return getTcbStorageAdmin();
  } catch (error: any) {
    console.warn('Firebase Admin: TCB Storage not available, falling back to Firebase:', error.message);
    tryInitializeLegacyFirebase();
    if (_legacyAdmin) {
      return _legacyAdmin.storage();
    }
    throw new Error('Neither TCB nor Firebase Admin is configured');
  }
}

// =====================================================================
// Re-export for compatibility
// =====================================================================

export { getTcbAuthAdmin, getTcbFirestoreAdmin, getTcbStorageAdmin };

