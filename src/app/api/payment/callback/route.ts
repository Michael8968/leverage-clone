
import { NextResponse } from 'next/server';
import { db } from '@/lib/tcb';
import type { PaymentOrder, PointsTransaction, User } from '@/lib/types';

/**
 * API endpoint to handle payment gateway callbacks.
 * This simulates the webhook that a payment provider (like Stripe, Alipay, or WeChat Pay)
 * would call after a user has successfully completed a payment.
 */
export async function POST(request: Request) {
  const transaction = await db.startTransaction();
  try {
    const { orderId, status } = await request.json();

    if (!orderId || status !== 'paid') {
      await transaction.rollback('Invalid callback data');
      return NextResponse.json({ error: 'Invalid callback data. Status must be \'paid\'.' }, { status: 400 });
    }

    const ordersCollection = transaction.collection('payment_orders');
    const usersCollection = transaction.collection('users');
    const pointsTransactionsCollection = transaction.collection('points_transactions');

    // 1. Find and validate the payment order
    const orderRes = await ordersCollection.doc(orderId).get();
    if (!orderRes.data || orderRes.data.length === 0) {
      await transaction.rollback('Order not found');
      return NextResponse.json({ error: 'Payment order not found' }, { status: 404 });
    }
    const order = orderRes.data[0] as PaymentOrder;

    // Check if the order is already processed
    if (order.status !== 'pending') {
      // If it's already paid, it's not an error, just acknowledge.
      if (order.status === 'paid') {
        await transaction.commit(); // Commit the empty transaction
        return NextResponse.json({ success: true, message: 'Order was already processed.' });
      }
      await transaction.rollback('Order not in pending state');
      return NextResponse.json({ error: `Order is not in a pending state. Current status: ${order.status}` }, { status: 409 });
    }

    // 2. Update the order status to 'paid'
    const updateOrderRes = await ordersCollection.doc(orderId).update({
      status: 'paid',
      updatedAt: new Date(),
    });
    if (updateOrderRes.updated !== 1) {
        await transaction.rollback('Failed to update order status');
        throw new Error('Failed to update order status during transaction.');
    }

    // 3. Add points to the user's balance
    const userRes = await usersCollection.doc(order.userId).get();
    if (!userRes.data || userRes.data.length === 0) {
        await transaction.rollback('User for order not found');
        throw new Error(`User with ID ${order.userId} not found for order ${orderId}`);
    }
    const user = userRes.data[0] as User;

    const newPointsBalance = (user.pointsBalance || 0) + order.pointsGranted;
    const updateUserRes = await usersCollection.doc(order.userId).update({
        pointsBalance: newPointsBalance
    });

    if(updateUserRes.updated !== 1) {
        await transaction.rollback('Failed to update user points');
        throw new Error('Failed to update user points balance during transaction.');
    }

    // 4. Create a points transaction record for this recharge
    const newPointsTransaction: Omit<PointsTransaction, '_id'> = {
      userId: order.userId,
      transactionType: 'recharge',
      pointsChange: order.pointsGranted,
      reason: `Recharge via order ${orderId}`,
      relatedOrderId: orderId,
      createdAt: new Date(),
    };
    await pointsTransactionsCollection.add(newPointsTransaction);

    // 5. If all operations are successful, commit the transaction
    await transaction.commit();

    console.log(`Successfully processed payment for order ${orderId}. User ${order.userId} granted ${order.pointsGranted} points.`);

    return NextResponse.json({ success: true, message: 'Payment processed successfully.' });

  } catch (error: any) {
    // If any error occurs, the transaction will be rolled back
    console.error('API Error in payment/callback:', error);
    await transaction.rollback('Internal Server Error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
