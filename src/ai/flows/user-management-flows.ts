
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';


// =================================================================
// Firebase Admin SDK Initialization
// =================================================================

function initializeAdmin(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }
  // This environment variable should be set in your deployment environment.
  // It's a JSON string of your service account key.
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

  return initializeApp({
    credential: credential.cert(serviceAccount)
  });
}


// =================================================================
// Schemas
// =================================================================
const UserUpdateSchema = z.object({
    role: z.string().optional(),
    starLevel: z.number().optional(),
    disabled: z.boolean().optional(),
});

const BatchUpdateUsersInputSchema = z.object({
    userIds: z.array(z.string()).min(1, "至少需要选择一个用户。"),
    updates: UserUpdateSchema,
    currentUserId: z.string(),
});

// =================================================================
// Flow to batch update users with permission checks
// =================================================================
export const batchUpdateUsers = ai.defineFlow(
    {
        name: 'batchUpdateUsers',
        inputSchema: BatchUpdateUsersInputSchema,
        outputSchema: z.void(),
    },
    async ({ userIds, updates, currentUserId }) => {
        const adminApp = initializeAdmin();
        const auth = getAuth(adminApp);
        
        // 1. Permission Check: Ensure the caller is an admin
        const currentUser = await auth.getUser(currentUserId);
        if (currentUser.customClaims?.role !== 'admin') {
            throw new Error("Permission Denied: Only admins can perform batch updates.");
        }
        
        // Prevent admin from modifying their own status/role to avoid self-lockout
        if (userIds.includes(currentUserId) && (updates.disabled !== undefined || updates.role)) {
            throw new Error("Admins cannot change their own role or disabled status.");
        }


        // 2. Perform Batch Write
        const batch = writeBatch(db);

        const updatePromises = userIds.map(async (userId) => {
            const userRef = doc(db, 'users', userId);
            
            const firestoreUpdates: any = {};
            const authUpdates: any = {};
            const customClaims: any = {};

            if (updates.role) {
                firestoreUpdates.role = updates.role;
                customClaims.role = updates.role;
            }
            if (updates.starLevel) {
                firestoreUpdates.rating = updates.starLevel; // Match 'rating' field in DB
            }
            if (updates.disabled !== undefined) {
                firestoreUpdates.status = updates.disabled ? 'suspended' : 'active';
                authUpdates.disabled = updates.disabled;
            }
            
            if (Object.keys(firestoreUpdates).length > 0) {
              batch.update(userRef, firestoreUpdates);
            }

            // Prepare Auth updates (these must be done outside the Firestore batch)
            const authUpdatePromises = [];
            if (Object.keys(authUpdates).length > 0) {
                 authUpdatePromises.push(auth.updateUser(userId, authUpdates));
            }
             if (Object.keys(customClaims).length > 0) {
                const existingUser = await auth.getUser(userId);
                const existingClaims = existingUser.customClaims || {};
                authUpdatePromises.push(auth.setCustomUserClaims(userId, { ...existingClaims, ...customClaims }));
            }
            return Promise.all(authUpdatePromises);
        });
        
        // Commit Firestore batch and then execute Auth updates
        await batch.commit();
        await Promise.all(updatePromises);
    }
);
