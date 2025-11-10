
/**
 * @file src/app/api/points-transactions/route.ts
 * @description API endpoint for fetching user points transactions.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'points_transactions';

/**
 * GET /api/points-transactions
 * Fetches points transactions for a given user (uid).
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('uid');

        if (!userId) {
            return NextResponse.json({ error: 'User ID (uid) is required' }, { status: 400 });
        }

        let transactions: any[] = [];
        if (dbType === 'firestore') {
            const { collection, query, where, getDocs, orderBy, Timestamp } = await import('firebase/firestore');
            const q = query(collection(db, COLLECTION_NAME), where('uid', '==', userId), orderBy('timestamp', 'desc'));
            const snapshot = await getDocs(q);
            transactions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp,
                };
            });
        } else if (dbType === 'tcb') {
            const snapshot = await db.collection(COLLECTION_NAME).where({ uid: userId }).orderBy('timestamp', 'desc').get();
            transactions = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }

        return NextResponse.json(transactions);
    } catch (error: any) {
        console.error('[API /points-transactions GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch points transactions', details: error.message }, { status: 500 });
    }
}
