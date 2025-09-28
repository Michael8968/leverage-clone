
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
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
// Flow to create a private demand for direct communication (UPGRADED)
// =================================================================

const CreatePrivateDemandInputSchema = z.object({
    requesterId: z.string(),
    creatorId: z.string(),
    preferredAgent: z.enum(['ai', 'human']),
});

const CreatePrivateDemandOutputSchema = z.object({
    demandId: z.string(),
    message: z.string().optional(),
});

export const createPrivateDemand = ai.defineFlow(
    {
        name: 'createPrivateDemand',
        inputSchema: CreatePrivateDemandInputSchema,
        outputSchema: CreatePrivateDemandOutputSchema,
    },
    async ({ requesterId, creatorId, preferredAgent }) => {
        const creatorRef = doc(db, 'users', creatorId);
        const requesterRef = doc(db, 'users', requesterId);

        let outputMessage: string | undefined;

        const demandId = await runTransaction(db, async (transaction) => {
            const creatorSnap = await transaction.get(creatorRef);
            if (!creatorSnap.exists()) throw new Error("目标设计师不存在。");
            const creator = creatorSnap.data() as User;

            const requesterSnap = await transaction.get(requesterRef);
            if (!requesterSnap.exists()) throw new Error("请求用户不存在。");
            const requester = requesterSnap.data() as User;
            
            let connectToHuman = false;
            let initialMessageText = '';

            // User wants human AND designer has NOT enabled AI assistant
            if (preferredAgent === 'human' && !creator.aiAssistantEnabled) { 
                const maxQueue = creator.maxQueueSize ?? 1;
                const currentQueue = creator.currentQueueSize ?? 0;
                
                // Designer must be active and have queue space to connect to human directly
                if (creator.status === 'active' && currentQueue < maxQueue) {
                    connectToHuman = true;
                } else {
                    // Automatically route to AI if human is not available for any reason
                    outputMessage = "设计师当前正忙，已为您连接其AI助理，他会先了解您的需求。";
                }
            } else { // Connect to AI if user chose AI, or if designer has their AI assistant enabled
                 outputMessage = "已为您连接设计师的AI助理，他会先了解您的需求。";
            }
            
            if (connectToHuman) {
                // Increment creator's queue size only when connecting to a human
                transaction.update(creatorRef, { currentQueueSize: increment(1) });
                initialMessageText = "您好，很高兴能与您直接沟通，请问有什么可以帮助您的吗？";
            } else { // Connect to AI
                initialMessageText = "您好，我是设计师的AI助理。在设计师接入前，由我先来了解一下您的需求。请问您想聊些什么？"
            }
            
            // 1. Create the private demand document
            const newDemandRef = doc(collection(db, 'demands'));
            transaction.set(newDemandRef, {
                type: 'private',
                title: `与 ${creator.name} 的专属沟通`,
                description: `由用户 ${requester.name} 直接发起的与设计师 ${creator.name} 的专属沟通需求。`,
                status: '进行中',
                requesterId: requesterId,
                requesterName: requester.name,
                requesterAvatar: requester.avatar || '',
                creatorId: creatorId, // The creatorId always points to the initially requested designer
                createdAt: serverTimestamp(),
                budget: 0,
                category: '专属沟通',
            });
            
            // 2. Create the corresponding chat document with an initial message
            const newChatRef = doc(db, 'chats', newDemandRef.id);
            transaction.set(newChatRef, {
                messages: [{
                    id: `initial_${Date.now()}`,
                    text: initialMessageText,
                    senderId: connectToHuman ? creatorId : 'ai-assistant',
                    senderName: connectToHuman ? creator.name : 'AI 助理',
                    senderAvatar: connectToHuman ? creator.avatar || '' : '/bot.png',
                    isAIMessage: !connectToHuman,
                    timestamp: new Date(),
                }],
            });
            
            return newDemandRef.id;
        });

        return { demandId, message: outputMessage };
    }
);
