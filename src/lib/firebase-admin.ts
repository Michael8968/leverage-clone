
import * as admin from 'firebase-admin';

/**
 * Ensures Firebase Admin is initialized, but only once.
 * This is the robust way to handle initialization in serverless/hot-reload environments.
 */
function initializeAdmin() {
    // Check if the default app is already initialized
    if (admin.apps.length > 0) {
        return;
    }

    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
        }
        
        const parsedServiceAccount = JSON.parse(serviceAccountKey);

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.");
        }

        admin.initializeApp({
            credential: admin.credential.cert(parsedServiceAccount),
            storageBucket: bucketName,
        });

        console.log("Firebase Admin SDK initialized successfully.");

    } catch (e: any) {
        console.error('Firebase Admin initialization error:', e.message);
        // Re-throw the error to fail fast if Firebase Admin is critical.
        throw new Error(`Firebase Admin initialization failed: ${e.message}`);
    }
}

/**
 * Gets the Firebase Admin Auth instance, initializing the app if necessary.
 * @returns The Firebase Admin Auth instance.
 */
export function getAdminAuth() {
    initializeAdmin();
    return admin.auth();
}

/**
 * Gets the Firebase Admin Firestore instance, initializing the app if necessary.
 * @returns The Firebase Admin Firestore instance.
 */
export function getAdminDb() {
    initializeAdmin();
    return admin.firestore();
}

/**
 * Gets the Firebase Admin Storage instance, initializing the app if necessary.
 * @returns The Firebase Admin Storage instance.
 */
export function getAdminStorage() {
    initializeAdmin();
    return admin.storage();
}

// For backward compatibility if some files still use them directly, but usage should be phased out.
export const auth = getAdminAuth();
export const dbAdmin = getAdminDb();
export const storageAdmin = getAdminStorage();
