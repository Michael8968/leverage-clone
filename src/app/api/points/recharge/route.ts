
import { NextResponse } from 'next/server';
import { db } from '@/lib/tcb';
import type { PaymentOrder } from '@/lib/types';

// A simple, hardcoded list of products available for purchase.
// In a real application, this would come from a `products` collection in the database.
const POINT_PRODUCTS: Record<string, { amountCNY: number; pointsGranted: number; description: string }> = {
  'prod_10cny_1k': { amountCNY: 10, pointsGranted: 1000, description: '1,000 Points' },
  'prod_50cny_5k5': { amountCNY: 50, pointsGranted: 5500, description: '5,500 Points (10% Bonus)' },
  'prod_100cny_12k': { amountCNY: 100, pointsGranted: 12000, description: '12,000 Points (20% Bonus)' },
};

/**
 * API endpoint to create a payment order when a user initiates a points purchase.
 */
export async function POST(request: Request) {
  try {
    const { userId, productId, paymentMethod = 'alipay' } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    const product = POINT_PRODUCTS[productId];
    if (!product) {
      return NextResponse.json({ error: 'Invalid Product ID' }, { status: 404 });
    }
    
    if (!['alipay', 'wechat', 'bank_transfer'].includes(paymentMethod)) {
        return NextResponse.json({ error: 'Invalid Payment Method' }, { status: 400 });
    }

    const ordersCollection = db.collection('payment_orders');

    // Create a new payment order document
    const newOrder: Omit<PaymentOrder, '_id'> = {
      userId,
      amountCNY: product.amountCNY,
      pointsGranted: product.pointsGranted,
      status: 'pending',
      paymentMethod,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const addRes = await ordersCollection.add(newOrder);
    
    if (!addRes.id) {
        throw new Error('Failed to create payment order in database.');
    }

    console.log(`Created pending payment order ${addRes.id} for user ${userId}.`);

    // Return the new order ID to the client
    return NextResponse.json({
      success: true,
      orderId: addRes.id,
      message: 'Payment order created successfully.',
    });

  } catch (error: any) {
    console.error('API Error in points/recharge:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
