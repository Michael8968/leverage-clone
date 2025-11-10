
import { NextResponse } from 'next/server';
import { db } from '@/lib/tcb';
import type { User, PointsTransaction } from '@/lib/types';

// Define the cost for specific actions. In the future, this could be stored in a database collection.
const ACTION_COSTS: Record<string, number> = {
  default: 10, // Default cost if action is not specified
  llm_call: 10, // Cost for a single LLM call
  image_generation: 50, // Cost for generating an image
};

/**
 * API endpoint to deduct points from a user for performing an action.
 */
export async function POST(request: Request) {
  try {
    const { userId, action = 'default' } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const cost = ACTION_COSTS[action] || ACTION_COSTS.default;

    // Use a database transaction to ensure atomicity
    const transaction = await db.startTransaction();
    const usersCollection = transaction.collection('users');
    const transactionsCollection = transaction.collection('points_transactions');

    // 1. Get the user document
    const userRes = await usersCollection.doc(userId).get();
    if (!userRes.data || userRes.data.length === 0) {
      await transaction.rollback('User not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const user = userRes.data[0] as User;

    // 2. Check if the user has enough points
    if (user.pointsBalance < cost) {
      await transaction.rollback('Insufficient points');
      return NextResponse.json({ error: 'Insufficient points' }, { status: 402 });
    }

    // 3. Deduct points from the user's balance
    const newPointsBalance = user.pointsBalance - cost;
    const updateUserRes = await usersCollection.doc(userId).update({
      pointsBalance: newPointsBalance,
    });

    if (updateUserRes.updated !== 1) {
        await transaction.rollback('Failed to update user points');
        throw new Error ('Failed to update user points balance during transaction.');
    }

    // 4. Create a record of the transaction
    const newTransaction: Omit<PointsTransaction, '_id'> = {
      userId: userId,
      transactionType: 'deduct',
      pointsChange: -cost, // Record as a negative number
      reason: `Deducted for action: ${action}`,
      llmAction: action,
      createdAt: new Date(),
    };
    
    await transactionsCollection.add(newTransaction);

    // 5. Commit the transaction
    await transaction.commit();

    console.log(`Successfully deducted ${cost} points from user ${userId} for action: ${action}. New balance: ${newPointsBalance}`);

    return NextResponse.json({
      success: true,
      newBalance: newPointsBalance,
    });

  } catch (error: any) {
    console.error('API Error in points/deduct:', error);
    // The transaction should have been rolled back already on error, but as a fallback:
    // await db.endTransaction(); // This syntax may vary based on SDK
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
