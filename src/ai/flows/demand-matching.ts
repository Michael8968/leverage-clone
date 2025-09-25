
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService, Supplier, User } from '@/lib/types';


// ... (existing recommendCreatives flow)
export const recommendCreatives = ai.defineFlow({ name: 'recommendCreatives', inputSchema: z.any(), outputSchema: z.any() }, async ({ demandId }) => { /* ... */ });


// =================================================================
// Flow to create a private demand for direct communication
// =================================================================

const CreatePrivateDemandInputSchema = z.object({
    requesterId: z.string(),
    creatorId: z.string(),
});

const CreatePrivateDemandOutputSchema = z.object({
    demandId: z.string(),
});

export const createPrivateDemand = ai.defineFlow(
    {
        name: 'createPrivateDemand',
        inputSchema: CreatePrivateDemandInputSchema,
        outputSchema: CreatePrivateDemandOutputSchema,
    },
    async ({ requesterId, creatorId }) => {
        const creatorRef = doc(db, 'users', creatorId);
        const creatorSnap = await getDoc(creatorRef);

        if (!creatorSnap.exists()) {
            throw new Error("Target designer not found.");
        }
        const creator = creatorSnap.data() as User;

        const batch = writeBatch(db);

        // 1. Create the private demand document
        const newDemandRef = doc(collection(db, 'demands'));
        batch.set(newDemandRef, {
            type: 'private',
            title: `与 ${creator.name} 的专属沟通`,
            description: `由用户直接发起的与设计师 ${creator.name} 的专属沟通需求。`,
            status: '进行中', // Private demands start immediately
            requesterId: requesterId,
            creatorId: creatorId,
            createdAt: serverTimestamp(),
            // Set default or empty values for other required fields
            budget: 0,
            category: '专属沟通',
        });

        // 2. Create the corresponding chat document
        const newChatRef = doc(db, 'chats', newDemandRef.id);
        batch.set(newChatRef, {
            messages: [],
        });

        await batch.commit();

        return { demandId: newDemandRef.id };
    }
);
