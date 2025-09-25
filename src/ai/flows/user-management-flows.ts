
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase-admin'; // Assuming admin SDK is configured
import type { User } from '@/lib/types';

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
        // 1. Permission Check: Ensure the caller is an admin
        const currentUser = await auth.getUser(currentUserId);
        if (currentUser.customClaims?.role !== 'admin') {
            throw new Error("Permission Denied: Only admins can perform batch updates.");
        }

        // 2. Perform Batch Write
        const batch = writeBatch(db);

        userIds.forEach(userId => {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, updates);

            // Also update Auth custom claims if role is changed
            if (updates.role) {
                auth.setCustomUserClaims(userId, { role: updates.role });
            }
            // Also update Auth disabled status if changed
            if (updates.disabled !== undefined) {
                auth.updateUser(userId, { disabled: updates.disabled });
            }
        });

        await batch.commit();
    }
);
