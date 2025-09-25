
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';


// =================================================================
// Flow to batch update user roles, ratings, or status
// =================================================================

const BatchUpdateUsersInputSchema = z.object({
    userIds: z.array(z.string()),
    updates: z.object({
        role: z.string().optional(),
        starLevel: z.number().optional(),
        disabled: z.boolean().optional(),
    }),
    currentUserId: z.string(),
});


export const batchUpdateUsers = ai.defineFlow(
    {
        name: 'batchUpdateUsers',
        inputSchema: BatchUpdateUsersInputSchema,
        outputSchema: z.void(),
    },
    async ({ userIds, updates, currentUserId }) => {
        // Prevent admin from changing their own role/status to avoid lock-out
        if (updates.role || updates.disabled !== undefined) {
            if (userIds.includes(currentUserId)) {
                throw new Error("为了安全，管理员不能通过批量操作来修改自己的角色或状态。");
            }
        }

        const batch = writeBatch(db);
        
        userIds.forEach(userId => {
            const userRef = doc(db, 'users', userId);
            const dataToUpdate: any = {};

            if (updates.role) {
                dataToUpdate.role = updates.role;
            }
            if (updates.starLevel !== undefined) {
                dataToUpdate.rating = updates.starLevel;
            }
            if (updates.disabled !== undefined) {
                dataToUpdate.status = updates.disabled ? 'suspended' : 'active';
            }

            if (Object.keys(dataToUpdate).length > 0) {
                 batch.update(userRef, dataToUpdate);
            }
        });

        await batch.commit();
    }
);


// =================================================================
// Flow to get all public designer profiles
// =================================================================

const DesignerProfileSchema = z.object({
    uid: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});

const GetDesignersOutputSchema = z.object({
    designers: z.array(DesignerProfileSchema),
});

export const getDesigners = ai.defineFlow(
    {
        name: 'getDesigners',
        inputSchema: z.null(),
        outputSchema: GetDesignersOutputSchema,
    },
    async () => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'creator'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { designers: [] };
        }

        const designers = snapshot.docs.map(doc => {
            const user = doc.data() as User;
            return {
                uid: doc.id,
                name: user.name,
                avatar: user.avatar,
                bio: user.bio,
                skills: user.skills,
                status: user.status,
            };
        });

        return { designers };
    }
);
