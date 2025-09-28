
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Demand, ProductService, Supplier, User } from '@/lib/types';


// ... (existing recommendCreatives flow)
const recommendCreativesInputSchema = z.object({
  demand: z.any(),
  creatives: z.array(z.any()),
});

const RecommendationSchema = z.object({
  creativeId: z.string(),
  reason: z.string(),
  matchScore: z.number(),
});

const recommendCreativesOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});

export type RecommendCreativesOutput = z.infer<typeof recommendCreativesOutputSchema>;

const recommendationPrompt = ai.definePrompt(
    {
      name: 'recommendationPrompt',
      input: { schema: recommendCreativesInputSchema },
      output: { schema: recommendCreativesOutputSchema },
      prompt: `You are an expert at matching creative talent and products with client demands.
  
      Analyze the client's demand and the list of available creatives (products and suppliers).
  
      Demand:
      {{{json demand}}}
  
      Creatives:
      {{{json creatives}}}
  
      Your task is to:
      1. Identify the top 3-5 most suitable creatives for the demand.
      2. For each recommendation, provide a 'creativeId' (which is the product's or supplier's ID).
      3. Provide a 'reason' explaining why this creative is a good match.
      4. Provide a 'matchScore' from 0 to 100.
      
      Return a JSON object with a "recommendations" array.`,
    },
);

export const recommendCreatives = ai.defineFlow(
    {
        name: 'recommendCreatives',
        inputSchema: z.any(),
        outputSchema: z.any(),
    },
    async ({ demand, creatives }) => {
        const { output } = await recommendationPrompt({ demand, creatives });
        return output;
    },
);


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
        
        const requesterRef = doc(db, 'users', requesterId);
        const requesterSnap = await getDoc(requesterRef);

        if (!requesterSnap.exists()) {
            throw new Error("Requesting user not found.");
        }
        const requester = requesterSnap.data() as User;


        const batch = writeBatch(db);

        // 1. Create the private demand document
        const newDemandRef = doc(collection(db, 'demands'));
        batch.set(newDemandRef, {
            type: 'private',
            title: `与 ${creator.name} 的专属沟通`,
            description: `由用户 ${requester.name} 直接发起的与设计师 ${creator.name} 的专属沟通需求。`,
            status: '进行中', // Private demands start immediately
            requesterId: requesterId,
            requesterName: requester.name,
            requesterAvatar: requester.avatar,
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
