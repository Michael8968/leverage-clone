
'use server';

import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getOpenAIForHunyuan } = require('@/utils/openai-hunyuan');
import { doc, getDoc, collection, query, where, getDocs, writeBatch, serverTimestamp, runTransaction, increment } from '@/lib/cloudbase-compat';
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
// 使用混元 SDK 推荐创作者/产品（修复损坏的实现）
export async function recommendCreatives(input: { demand: any; creatives: any[] }): Promise<RecommendCreativesOutput> {
  const { demand, creatives } = input;
  try {
  const openai = getOpenAIForHunyuan();
    const systemPrompt = '你是一个智能匹配助手。只返回 JSON。不要额外文字。';
    const userPrompt = `匹配需求 ${JSON.stringify(demand)} 到 creators 列表 ${JSON.stringify(creatives)}，返回 top 3 [{ id: 'uid', matchScore: 0.9, reason: '...' }]`;

    const response = await openai.chat.completions.create({
      model: 'hunyuan-turbos-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 512,
    });
    const content: string = response.choices?.[0]?.message?.content || '';

    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      // Fallback: 如果无法解析为对象，尝试解析为数组
      try {
        parsed = JSON.parse(content.replace(/^[^\[]*/, '').replace(/[^\]]*$/, ''));
      } catch {
        return { recommendations: [] };
      }
    }

    const recs = Array.isArray(parsed) ? parsed : parsed?.recommendations;
    if (!Array.isArray(recs)) return { recommendations: [] };

    return {
      recommendations: recs
        .filter((r: any) => r && (r.id || r.creativeId))
        .map((r: any) => ({
          creativeId: r.creativeId || r.id,
          reason: String(r.reason || ''),
          matchScore: Number(r.matchScore ?? 0),
        }))
        .slice(0, 5),
    };
  } catch (error) {
    console.error('Error in recommendCreatives:', error);
    return { recommendations: [] };
  }
}


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

export type CreatePrivateDemandInput = z.infer<typeof CreatePrivateDemandInputSchema>;
export type CreatePrivateDemandOutput = z.infer<typeof CreatePrivateDemandOutputSchema>;

export async function createPrivateDemand({ requesterId, creatorId, preferredAgent }: CreatePrivateDemandInput): Promise<CreatePrivateDemandOutput> {
  try {
  const creatorRef = doc('users', creatorId);
  const requesterRef = doc('users', requesterId);

        let outputMessage: string | undefined;

  const demandId = await runTransaction(async (transaction: any) => {
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
            const newDemandRef = doc('demands');
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
            const newChatRef = doc('chats', newDemandRef.id);
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
  } catch (error) {
    console.error('Error in createPrivateDemand:', error);
    throw error;
  }
}

