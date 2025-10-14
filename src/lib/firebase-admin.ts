
import * as admin from 'firebase-admin';

/**
 * Ensures Firebase Admin is initialized, but only once.
 * This is the robust way to handle initialization in serverless/hot-reload environments.
 */
function initializeAdmin() {
    // Check if the default app is already initialized to prevent re-initialization error.
    if (admin.apps.length > 0) {
        return;
    }

    try {
        const serviceAccountKeyString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKeyString) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or empty.");
        }
        
        const serviceAccount = JSON.parse(serviceAccountKeyString);

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable is not set.");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: bucketName,
        });

        console.log("Firebase Admin SDK initialized successfully.");

    } catch (e: any) {
        console.error('Firebase Admin initialization error:', e.message);
        // Re-throw a more informative error to fail fast if Firebase Admin is critical.
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
