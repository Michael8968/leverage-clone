
/**
 * @file src/app/api/prompts/route.ts
 * @description API endpoint to fetch active prompts.
 * This route centralizes the logic for retrieving prompts from the database,
 * supporting both Firebase and TCB through the shared db service.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'prompts';

/**
 * GET /api/prompts
 * Fetches all active prompts, ordered by name.
 */
export async function GET(req: Request) {
    try {
        let prompts: any[] = [];

        if (dbType === 'firestore') {
            const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
            const { Timestamp } = await import('firebase/firestore');
            const promptsCollection = collection(db, COLLECTION_NAME);
            const q = query(promptsCollection, where('status', '==', '生效中'));
            const snapshot = await getDocs(q);
            prompts = snapshot.docs.map(doc => {
                const data = doc.data();
                // Convert Firestore Timestamp to a serializable format (ISO string)
                const createdAt = data.createdAt instanceof Timestamp 
                    ? data.createdAt.toDate().toISOString() 
                    : data.createdAt;
                return { id: doc.id, ...data, createdAt };
            });
        } else if (dbType === 'tcb') {
            // For TCB, we assume the status field and createdAt are stored in a compatible format.
            const snapshot = await db.collection(COLLECTION_NAME).where({ status: '生效中' }).orderBy('name', 'asc').get();
            prompts = snapshot.data.map((item: any) => ({ ...item, id: item._id }));
        }

        // Sort by name as a final step, as TCB might not support ordering on a field different from the where clause field in all cases.
        prompts.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ prompts });

    } catch (error: any) {
        console.error('[API /prompts GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch prompts', details: error.message }, { status: 500 });
    }
}
