'use server';

import { z } from 'zod';
import { collection, doc, writeBatch, getDocs, query, where, updateDoc, increment, runTransaction, serverTimestamp, arrayUnion, getDoc } from '@/lib/cloudbase-compat';
import { db } from '@/lib/cloudbase-compat';
import { getAdminAuth } from '@/lib/firebase-admin';
import type { User, AssistantRule, PointsTransaction, PointsApprovalConfig } from '@/lib/types';

// =================================================================
// Batch update user roles, ratings, or status
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

export type BatchUpdateUsersInput = z.infer<typeof BatchUpdateUsersInputSchema>;

export async function batchUpdateUsers({ userIds, updates, currentUserId }: BatchUpdateUsersInput): Promise<void> {
    try {
        // Prevent admin from changing their own role/status to avoid lock-out
        if (updates.role || updates.disabled !== undefined || updates.starLevel !== undefined) {
            if (userIds.includes(currentUserId)) {
                throw new Error("为了安全，管理员不能通过批量操作来修改自己的角色、状态或星级。");
            }
        }

        const batch = writeBatch();
        
        userIds.forEach((userId: string) => {
            const userRef = doc('users', userId);
            const dataToUpdate: any = {};

            if (updates.role) {
                dataToUpdate.role = updates.role;
            }
            if (updates.starLevel !== undefined) {
                dataToUpdate.rating = updates.starLevel;
            }
            if (updates.disabled !== undefined) {
                // 允许管理员删除(禁用)其他管理员账号以释放名额
                dataToUpdate.status = updates.disabled ? 'suspended' : 'active';
            }

            if (Object.keys(dataToUpdate).length > 0) {
                 batch.update(userRef, dataToUpdate);
            }
        });

        await batch.commit();
    } catch (error) {
        console.error('Error in batchUpdateUsers:', error);
        throw error;
    }
}

// =================================================================
// Get all public designer profiles
// =================================================================

const DesignerProfileSchema = z.object({
    uid: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    bio: z.string().optional(),
    skills: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    aiAssistantEnabled: z.boolean().optional(),
});

const GetDesignersOutputSchema = z.object({
    designers: z.array(DesignerProfileSchema),
});

export type GetDesignersOutput = z.infer<typeof GetDesignersOutputSchema>;

export async function getDesigners(): Promise<GetDesignersOutput> {
    try {
    const usersRef = collection('users');
    const q = query(usersRef, where('role', '==', 'creator'));
        const snapshot = await getDocs(q);

        // 兼容层目前不执行 where 过滤，这里在应用层按 role 过滤
        const allDocs = snapshot?.docs || [];
        const filtered = allDocs.filter((d: any) => (d?.data?.()?.role) === 'creator');

        const designers = filtered.map((doc: any) => {
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
    } catch (error) {
        console.error('Error in getDesigners:', error);
        return { designers: [] };
    }
}

// =================================================================
// Update a user's status or AI assistant setting
// =================================================================

const UpdateUserStatusInputSchema = z.object({
    userId: z.string(),
    status: z.enum(['active', 'inactive']).optional(),
    aiAssistantEnabled: z.boolean().optional(),
    alwaysAvailable: z.boolean().optional(),
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusInputSchema>;

export async function updateUserStatus({ userId, status, aiAssistantEnabled, alwaysAvailable }: UpdateUserStatusInput): Promise<void> {
    try {
    const userRef = doc('users', userId);
        const dataToUpdate: Partial<User> = {};

        if (status !== undefined) {
            dataToUpdate.status = status;
        }
        if (aiAssistantEnabled !== undefined) {
            dataToUpdate.aiAssistantEnabled = aiAssistantEnabled;
        }
        if (alwaysAvailable !== undefined) {
            dataToUpdate.alwaysAvailable = alwaysAvailable;
        }

        if (Object.keys(dataToUpdate).length > 0) {
            await updateDoc(userRef, dataToUpdate);
        }
    } catch (error) {
        console.error('Error in updateUserStatus:', error);
        throw error;
    }
}

// =================================================================
// Update a user's AI assistant rules
// =================================================================

const UpdateAssistantRulesInputSchema = z.object({
    userId: z.string(),
    rules: z.array(z.any()), // z.any() because AssistantRule contains Timestamps
});

export type UpdateAssistantRulesInput = z.infer<typeof UpdateAssistantRulesInputSchema>;

export async function updateUserAssistantRules({ userId, rules }: UpdateAssistantRulesInput): Promise<void> {
    try {
    const userRef = doc('users', userId);
        await updateDoc(userRef, {
            assistantRules: rules,
        });
    } catch (error) {
        console.error('Error in updateUserAssistantRules:', error);
        throw error;
    }
}

// =================================================================
// Grant points to a group of users
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

export type GrantPointsInput = z.infer<typeof GrantPointsInputSchema>;
export type GrantPointsOutput = z.infer<typeof GrantPointsOutputSchema>;

export async function grantPointsToGroup({ roles, ratings, amount, reason }: GrantPointsInput): Promise<GrantPointsOutput> {
    try {
    let usersQuery = query(collection('users'));
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

    const batch = writeBatch();
        const batchId = `manual-grant-${Date.now()}`;
        
        userSnapshot.docs.forEach((userDoc: any) => {
            const transactionRef = doc('points_transactions');
            const newTransaction: Omit<PointsTransaction, 'id' | 'timestamp'> = {
                uid: userDoc.id,
                type: 'manual',
                amount: amount,
                reason: reason,
                batchId: batchId,
                status: 'pending',
                approvers: [],
            };
            batch.set(transactionRef, { ...newTransaction, timestamp: serverTimestamp() });
        });

        await batch.commit();

        return { batchId, userCount: userSnapshot.size ?? 0 };
    } catch (error) {
        console.error('Error in grantPointsToGroup:', error);
        throw error;
    }
}

// =================================================================
// Approve a manual grant request
// =================================================================

const ApproveGrantRequestInputSchema = z.object({
    batchId: z.string(),
    approverId: z.string(),
});

const ApproveGrantRequestOutputSchema = z.object({
    approvedCount: z.number(),
    alreadyApproved: z.boolean(),
});

export type ApproveGrantRequestInput = z.infer<typeof ApproveGrantRequestInputSchema>;
export type ApproveGrantRequestOutput = z.infer<typeof ApproveGrantRequestOutputSchema>;

export async function approveGrantRequest({ batchId, approverId }: ApproveGrantRequestInput): Promise<ApproveGrantRequestOutput> {
    try {
        let approvedCount = 0;
        let alreadyApprovedByThisUser = false;

        // 1. Fetch approval configuration first, outside the transaction
        const approvalConfigRef = doc('configs', 'points_approval_config');
            const approvalConfigSnap = await getDoc(approvalConfigRef);
            const { snapshotExists, snapshotData } = await import('@/lib/snapshot-utils');
            const approvalConfig = snapshotExists(approvalConfigSnap)
                ? snapshotData(approvalConfigSnap) as PointsApprovalConfig
                : { approverUids: [] };
        
        // 2. Validate if the approver is authorized
        if (approvalConfig.approverUids.length > 0 && !approvalConfig.approverUids.includes(approverId)) {
            throw new Error('您没有权限批准此请求。请联系系统管理员。');
        }

        await runTransaction(async (transaction: any) => {
            const transactionsQuery = query(
                collection('points_transactions'),
                where('batchId', '==', batchId),
                where('status', '==', 'pending')
            );
            
            const transactionsSnapshot = await transaction.get(transactionsQuery);

            if (transactionsSnapshot.empty) {
                const approvedQuery = query(
                    collection('points_transactions'),
                    where('batchId', '==', batchId),
                    where('status', '==', 'approved')
                );
                const approvedSnapshot = await transaction.get(approvedQuery);
                if (!approvedSnapshot.empty) {
                     throw new Error('此批次请求已被其他管理员批准。');
                }
                throw new Error('未找到待审批的交易记录，或请求已过期。');
            }
            
            const firstDocApprovers = transactionsSnapshot.docs[0].data().approvers || [];
            if (firstDocApprovers.includes(approverId)) {
                alreadyApprovedByThisUser = true;
                return;
            }

            const isFinalApproval = firstDocApprovers.length === 1;

            for (const txDoc of transactionsSnapshot.docs) {
                const txRef = txDoc.ref;
                const txData = txDoc.data() as PointsTransaction;
                const newApprovers = [...(txData.approvers || []), approverId];

                if (isFinalApproval) {
                    const userRef = doc('users', txData.uid);
                    transaction.update(userRef, {
                        points_balance: increment(txData.amount)
                    });
                    transaction.update(txRef, {
                        status: 'approved',
                        approvers: newApprovers
                    });
                    approvedCount++;
                } else {
                    transaction.update(txRef, {
                        approvers: newApprovers
                    });
                }
            }
        });

        if (alreadyApprovedByThisUser) {
            return { approvedCount: 0, alreadyApproved: true };
        }

        return { approvedCount, alreadyApproved: false };
    } catch (error) {
        console.error('Error in approveGrantRequest:', error);
        throw error;
    }
}
