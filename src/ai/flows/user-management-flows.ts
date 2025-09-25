
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

// ... (existing batchUpdateUsers flow)
export const batchUpdateUsers = ai.defineFlow({ name: 'batchUpdateUsers', inputSchema: z.any(), outputSchema: z.void() }, async ({ userIds, updates, currentUserId }) => { /* ... */ });

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
