
'use server';
/**
 * @fileOverview An AI-driven flow to intelligently route a user request to the best available human agent (designer).
 *
 * This flow acts as a "smart dispatcher". It analyzes the user's request, context,
 * and the real-time status of all available designers, then uses a natural language-defined
 * strategy to make a sophisticated routing decision.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, IntelligentRoutingStrategy } from '@/lib/types';
import { format } from 'date-fns';

// =================================================================
// INPUT & OUTPUT SCHEMAS
// =================================================================

const IntelligentRoutingInputSchema = z.object({
  requesterId: z.string().describe("The ID of the user making the request."),
  requestDescription: z.string().describe("The user's latest message or problem description."),
  specificDesignerId: z.string().optional().describe("A specific designer the user wants to talk to, if any."),
});

const IntelligentRoutingOutputSchema = z.object({
  decision: z.enum(['route_to_designer', 'fallback_to_ai']).describe("The final decision of the routing logic."),
  designerId: z.string().optional().describe("The ID of the designer to route to, if applicable."),
  reason: z.string().describe("The reasoning behind the AI's decision."),
  aiAssistantMessage: z.string().optional().describe("A message for the AI assistant to say if falling back."),
});

// =================================================================
// HELPER FUNCTIONS
// =================================================================

/**
 * Fetches all relevant data needed for the AI to make a routing decision.
 */
async function getRoutingContext(requesterId: string, specificDesignerId?: string) {
    // If a specific designer is requested, we still fetch all active designers to allow for re-routing.
    const designerQuery = query(collection(db, 'users'), where('role', '==', 'creator'), where('status', '==', 'active'));

    const [requesterSnap, designersSnap, strategySnap] = await Promise.all([
        getDoc(doc(db, 'users', requesterId)),
        getDocs(designerQuery),
        getDoc(doc(db, 'intelligent_routing_strategy', 'main_strategy'))
    ]);

    if (!requesterSnap.exists()) throw new Error("Requester user not found.");

    const requesterInfo = { uid: requesterSnap.id, ...requesterSnap.data() } as User;
    
    // Sanitize all active designers, but don't filter them based on AI assistant yet.
    const allDesigners = designersSnap.docs
        .map(doc => {
            const data = doc.data() as User;
            // Sanitize designer data for the prompt
            return {
                uid: doc.id,
                name: data.name,
                status: data.status,
                aiAssistantEnabled: data.aiAssistantEnabled || false,
                skills: data.skills || [],
                rating: data.rating || 5,
                currentQueueSize: data.currentQueueSize || 0,
            };
        });

    const strategy: IntelligentRoutingStrategy = strategySnap.exists()
        ? strategySnap.data() as IntelligentRoutingStrategy
        : { 
            id: 'main_strategy', 
            strategyText: "Default: Route to the designer with the fewest people in their queue (currentQueueSize).",
            factors: [], 
            factorTemperatures: {
                problem_category: 0.8,
                busyness: 1.0,
                user_priority: 0.5,
            },
            updatedAt: new Date() 
        };

    return {
        requesterInfo,
        allDesigners,
        strategy,
        currentTime: format(new Date(), "yyyy-MM-dd HH:mm:ss 'Weekday:' EEEE"),
    };
}


// =================================================================
// AI PROMPT DEFINITION
// =================================================================

const RoutingDecisionSchema = z.object({
    designerId: z.string().describe("The ID of the chosen designer. Should be 'fallback_to_ai' if no suitable designer is found."),
    reason: z.string().describe("A concise explanation for why this designer was chosen or why a fallback to AI was necessary. Mention the chosen designer's name."),
});

const routingPrompt = ai.definePrompt({
    name: 'intelligentRoutingPrompt',
    input: { schema: z.any() },
    output: { schema: RoutingDecisionSchema },
    prompt: `
        You are a world-class, hyper-efficient service dispatcher for a high-end design platform.
        Your task is to analyze an incoming user request and all available real-time data to find the *single best designer* to handle it, or decide to let a generic platform AI assistant handle it.

        Strictly follow the routing strategy provided below. Pay close attention to the weights of different decision factors.

        A critical rule: You MUST NOT select a designer if their 'aiAssistantEnabled' flag is true. These designers are not available for direct routing. You must choose another designer or fallback to the generic AI assistant.

        ==============================
        == PLATFORM ROUTING STRATEGY ==
        ==============================
        {{{strategyText}}}

        ==================================
        == DECISION FACTOR WEIGHTS ==
        ==================================
        (0.0 means not important, 1.0 means most important)
        {{#each factorTemperatures}}
        - {{@key}}: {{this}}
        {{/each}}

        ==============================
        == REAL-TIME DATA ==
        ==============================
        - Current Time: {{{currentTime}}}

        - User Making Request:
        {{{json requesterInfo}}}

        - User's Problem/Request:
        "{{{requestDescription}}}"

        - List of available designers (Remember, only route to a designer if their status is 'active' AND 'aiAssistantEnabled' is false):
        {{{json allDesigners}}}

        ==============================
        == YOUR TASK ==
        ==============================
        1.  Analyze all the provided data in light of the platform's routing strategy and factor weights.
        2.  Consider all factors: designer status, skills, queue size, user rating, and the crucial 'aiAssistantEnabled' flag.
        3.  Select the single best *available* designer from the list. An available designer MUST have 'status: active' and 'aiAssistantEnabled: false'.
        4.  If no designer is a good fit, if they are all offline, or if they all have their AI assistant enabled, you MUST decide to fall back to a generic platform AI assistant.
        5.  Return a JSON object with your decision. The "designerId" must be either a valid designer UID from the list or the exact string "fallback_to_ai". Provide a clear "reason" for your choice.
    `,
});


// =================================================================
// MAIN GENKIT FLOW
// =================================================================

export const intelligentRoutingFlow = ai.defineFlow(
    {
        name: 'intelligentRoutingFlow',
        inputSchema: IntelligentRoutingInputSchema,
        outputSchema: IntelligentRoutingOutputSchema,
    },
    async ({ requesterId, requestDescription, specificDesignerId }) => {
        try {
            // 1. Aggregate all necessary data
            const context = await getRoutingContext(requesterId, specificDesignerId);

            // Filter out designers who are not available for routing before sending to AI
            const availableDesigners = context.allDesigners.filter(
                d => d.status === 'active' && !d.aiAssistantEnabled
            );

            // If there are no designers available for routing at all, fallback immediately.
            if (availableDesigners.length === 0) {
                 return {
                    decision: 'fallback_to_ai',
                    reason: 'No designers are currently available for direct routing.',
                    aiAssistantMessage: "抱歉，平台当前没有可用的设计师。请稍后再试。",
                };
            }

            // 2. Call the AI model with the rich context
            const { output } = await routingPrompt({
                strategyText: context.strategy.strategyText,
                factorTemperatures: context.strategy.factorTemperatures,
                currentTime: context.currentTime,
                requesterInfo: context.requesterInfo,
                requestDescription: requestDescription,
                allDesigners: availableDesigners, // Pass only the available designers to the AI
            });

            if (!output) {
                throw new Error("The AI model failed to return a routing decision.");
            }

            // 3. Process the AI's decision
            if (output.designerId === 'fallback_to_ai') {
                return {
                    decision: 'fallback_to_ai',
                    reason: output.reason,
                    aiAssistantMessage: "目前所有设计师都在忙，已为您转接平台AI助理进行服务。",
                };
            }

            // 4. Return the decision to route to a specific designer
            // The reason from the AI will explain why this designer was chosen.
            return {
                decision: 'route_to_designer',
                designerId: output.designerId,
                reason: output.reason,
            };

        } catch (error: any) {
            console.error("Intelligent routing flow failed:", error);
            // In case of any catastrophic failure, always fall back to the AI assistant
            return {
                decision: 'fallback_to_ai',
                reason: `Routing system encountered an internal error: ${error.message}`,
                aiAssistantMessage: "系统调度遇到问题，已为您转接平台AI助理进行服务。",
            };
        }
    }
);
