import * as admin from 'firebase-admin';

// This is the server-side Firebase Admin SDK initialization.
// It is intended to be used in server environments like Next.js Server Components, API routes, or Genkit flows.

// The FIREBASE_SERVICE_ACCOUNT_KEY environment variable should be set in your deployment environment.
// It should contain the JSON string of your service account key.

if (!admin.apps.length) {
    try {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
            throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. This is required for server-side authentication and operations.");
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
        // Depending on the context, you might want to re-throw the error
        // to fail fast if Firebase Admin is critical for the application's startup.
    }
}

export const auth = admin.auth();
export const dbAdmin = admin.firestore();
export const storageAdmin = admin.storage();
