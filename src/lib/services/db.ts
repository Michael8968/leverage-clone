/**
 * @file src/lib/services/db.ts
 * @description Database Service Abstraction Layer.
 *
 * This module provides a unified database interface that abstracts away the specific
 * database implementation (Firebase Firestore for development, TCB NoSQL for production).
 * It uses the NEXT_PUBLIC_ENV environment variable to determine which service to initialize.
 *
 * This is a core component of the Firebase -> TCB migration strategy.
 */

let db: any; // Using 'any' for simplicity, a more robust implementation would use a common interface.
let dbType: 'firestore' | 'tcb' | 'mock' | null = null;
let initializationError: Error | null = null;

try {
  // This block runs once when the module is first imported.
  console.log(`[DB Service] Initializing for environment: '${process.env.NEXT_PUBLIC_ENV}'`);

  if (process.env.NEXT_PUBLIC_ENV === 'production') {
    // =================================================================
    // PRODUCTION: Initialize Tencent CloudBase (TCB)
    // =================================================================
    console.log('[DB Service] Using TCB Database.');
    
    // Dynamically import the TCB SDK to avoid including it in the development bundle if not needed.
    const { init } = require('@cloudbase/js-sdk');

    if (!process.env.NEXT_PUBLIC_TCB_ENV_ID) {
      throw new Error('NEXT_PUBLIC_TCB_ENV_ID is not defined for production environment.');
    }

    const tcbApp = init({
      env: process.env.NEXT_PUBLIC_TCB_ENV_ID,
    });
    
    // It's a common requirement to authenticate before using other services.
    // Assuming anonymous auth is enabled on TCB for this to work.
    tcbApp.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();

    db = tcbApp.database();
    dbType = 'tcb';
    console.log('[DB Service] TCB Database initialized successfully.');

  } else {
    // =================================================================
    // DEVELOPMENT: Initialize Firebase Firestore
    // =================================================================
    console.log('[DB Service] Using Firebase Firestore.');
    
    // Dynamically import Firebase to avoid bundling in production.
    const { initializeApp, getApps, getApp } = require('firebase/app');
    const { getFirestore } = require('firebase/firestore');

    const firebaseConfigRaw = process.env.FIREBASE_CONFIG;
    
    // Since we know .env.local is empty, we handle this case gracefully.
    if (!firebaseConfigRaw || firebaseConfigRaw.trim() === '') {
      console.warn('[DB Service] WARNING: FIREBASE_CONFIG is not set in .env.local. Using a mock database for development. App will run but database calls will fail.');
      db = new Proxy({}, {
        get(target, prop) {
          console.error(`[Mock DB] Attempted to access property '${String(prop)}'. Database is not configured. Please set FIREBASE_CONFIG in your .env.local file.`);
          // Return a function that does nothing or throws, to prevent runtime errors on calls like db.collection().
          return () => {
            console.error(`[Mock DB] Attempted to call a method on the unconfigured database.`);
          };
        }
      });
      dbType = 'mock';

    } else {
      const firebaseConfig = JSON.parse(firebaseConfigRaw);
      
      // Standard Firebase initialization (singleton pattern)
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      
      db = getFirestore(app);
      dbType = 'firestore';
      console.log('[DB Service] Firebase Firestore initialized successfully.');
    }
  }
} catch (error) {
  console.error('[DB Service] CRITICAL: Database initialization failed.', error);
  initializationError = error as Error;
  
  // Export a proxy that throws a clear error on any access attempt.
  // This makes it immediately obvious that the DB is not available.
  db = new Proxy({}, {
    get(target, prop) {
      throw new Error(`Database service is not available due to initialization failure: ${initializationError.message}`);
    }
  });
  dbType = null;
}

/**
 * The singleton database instance.
 * It's either a Firestore instance, a TCB Database instance, or a mock/proxy if initialization failed.
 */
export { db };

/**
 * The type of the initialized database.
 * Can be 'firestore', 'tcb', 'mock', or null if initialization failed catastrophically.
 */
export { dbType };

/**
 * The error object if initialization failed.
 * Can be used by other parts of the app to check the service status.
 */
export { initializationError };
