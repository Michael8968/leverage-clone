

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { collection, doc, writeBatch, getDocs, query, where, updateDoc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase-admin';
import type { User, AssistantRule, PointsTransaction } from '@/lib/types';


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
        if (updates.role || updates.disabled !== undefined || updates.starLevel !== undefined) {
            if (userIds.includes(currentUserId)) {
                throw new Error("为了安全，管理员不能通过批量操作来修改自己的角色、状态或星级。");
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
    aiAssistantEnabled: z.boolean().optional(),
});

const GetDesignersOutputSchema = z.object({
    designers: z.array(DesignerProfileSchema),
});

export const getDesigners = ai.defineFlow(
    {
        name: 'getDesigners',
        inputSchema: z.null().optional(),
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
                aiAssistantEnabled: user.aiAssistantEnabled || false,
            };
        });

        return { designers };
    }
);


// =================================================================
// Flow to update a user's status or AI assistant setting
// =================================================================

const UpdateUserStatusInputSchema = z.object({
    userId: z.string(),
    status: z.enum(['active', 'inactive']).optional(),
    aiAssistantEnabled: z.boolean().optional(),
});

export const updateUserStatus = ai.defineFlow(
    {
        name: 'updateUserStatus',
        inputSchema: UpdateUserStatusInputSchema,
        outputSchema: z.void(),
    },
    async ({ userId, status, aiAssistantEnabled }) => {
        const userRef = doc(db, 'users', userId);
        const dataToUpdate: Partial<User> = {};

        if (status !== undefined) {
            dataToUpdate.status = status;
        }
        if (aiAssistantEnabled !== undefined) {
            dataToUpdate.aiAssistantEnabled = aiAssistantEnabled;
        }

        if (Object.keys(dataToUpdate).length > 0) {
            await updateDoc(userRef, dataToUpdate);
        }
    }
);

// =================================================================
// Flow to update a user's AI assistant rules
// =================================================================
const UpdateAssistantRulesInputSchema = z.object({
    userId: z.string(),
    rules: z.array(z.any()), // z.any() because AssistantRule contains Timestamps
});

export const updateUserAssistantRules = ai.defineFlow(
    {
        name: 'updateUserAssistantRules',
        inputSchema: UpdateAssistantRulesInputSchema,
        outputSchema: z.void(),
    },
    async ({ userId, rules }) => {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            assistantRules: rules,
        });
    }
);


// =================================================================
// Flow to grant points to a group of users
// =================================================================
const GrantPointsInputSchema = z.object({
    roles: z.array(z.string()).optional(),
    ratings: z.array(z.number()).optional(),
    amount: z.number().int().positive(),
    reason: z.string().min(1),
});

const GrantPointsOutputSchema = z.object({
    batchId: z.string(),
    userCount: z.number(),
});

export const grantPointsToGroup = ai.defineFlow(
    {
        name: 'grantPointsToGroup',
        inputSchema: GrantPointsInputSchema,
        outputSchema: GrantPointsOutputSchema,
    },
    async ({ roles, ratings, amount, reason }) => {
        let usersQuery = query(collection(db, 'users'));
        if (roles && roles.length > 0) {
            usersQuery = query(usersQuery, where('role', 'in', roles));
        }
        if (ratings && ratings.length > 0) {
            usersQuery = query(usersQuery, where('rating', 'in', ratings));
        }

        const userSnapshot = await getDocs(usersQuery);
        if (userSnapshot.empty) {
            return { batchId: '', userCount: 0 };
        }

        const batch = writeBatch(db);
        const batchId = `manual-grant-${Date.now()}`;
        
        userSnapshot.docs.forEach(userDoc => {
            // 1. Update user's balance
            batch.update(userDoc.ref, { points_balance: increment(amount) });

            // 2. Create a transaction record
            const transactionRef = doc(collection(db, 'points_transactions'));
            const newTransaction: Omit<PointsTransaction, 'id'> = {
                uid: userDoc.id,
                type: 'manual',
                amount: amount,
                reason: reason,
                timestamp: serverTimestamp(),
                batchId: batchId,
                status: 'active',
            };
            batch.set(transactionRef, newTransaction);
        });

        await batch.commit();

        return { batchId, userCount: userSnapshot.size };
    }
);

// =================================================================
// Flow to revoke a points grant
// =================================================================
const RevokePointsInputSchema = z.object({
    batchId: z.string(),
});

export const revokePointsGrant = ai.defineFlow(
    {
        name: 'revokePointsGrant',
        inputSchema: RevokePointsInputSchema,
        outputSchema: z.object({ revokedCount: z.number() }),
    },
    async ({ batchId }) => {
        const result = await runTransaction(db, async (transaction) => {
            const transactionsQuery = query(
                collection(db, 'points_transactions'),
                where('batchId', '==', batchId),
                where('status', '==', 'active')
            );
            const transactionsSnapshot = await getDocs(transactionsQuery);

            if (transactionsSnapshot.empty) {
                throw new Error("未找到可撤销的有效赋分记录，或该操作已被撤销。");
            }

            for (const txDoc of transactionsSnapshot.docs) {
                const txData = txDoc.data() as PointsTransaction;
                const userRef = doc(db, 'users', txData.uid);
                
                // Use transaction.get to ensure we have the latest user data within the transaction
                const userSnap = await transaction.get(userRef);
                if (userSnap.exists()) {
                     // 1. Revert user's balance
                    transaction.update(userRef, { points_balance: increment(-txData.amount) });
                }
                
                // 2. Mark the transaction as revoked
                transaction.update(txDoc.ref, { status: 'revoked' });
            }

            return { revokedCount: transactionsSnapshot.size };
        });
        return result;
    }
);
