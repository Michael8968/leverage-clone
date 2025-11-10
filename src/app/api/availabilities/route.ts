
/**
 * @file src/app/api/availabilities/route.ts
 * @description API endpoint for managing creator availability.
 */

import { NextResponse } from 'next/server';
import { db, dbType } from '@/lib/services/db';

const COLLECTION_NAME = 'availabilities';

/**
 * GET /api/availabilities
 * Fetches the availability document for a given userId.
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        let availability = { slots: [] };
        if (dbType === 'firestore') {
            const { doc, getDoc, Timestamp } = await import('firebase/firestore');
            const docRef = doc(db, COLLECTION_NAME, userId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                availability = {
                    ...data,
                    slots: (data.slots || []).map((slot: any) => 
                        slot instanceof Timestamp ? slot.toDate().toISOString() : slot
                    )
                };
            }
        } else if (dbType === 'tcb') {
            const doc = db.collection(COLLECTION_NAME).doc(userId);
            const snapshot = await doc.get();
            if (snapshot.data && snapshot.data.length > 0) {
                 availability = snapshot.data[0];
            } else {
                 // Return a default structure if not found
                 availability = { slots: [] };
            }
        }

        return NextResponse.json(availability);
    } catch (error: any) {
        console.error('[API /availabilities GET] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch availability', details: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/availabilities
 * Updates or creates the availability document for a given userId.
 */
export async function PUT(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const { slots } = await req.json();
        if (!Array.isArray(slots)) {
            return NextResponse.json({ error: 'slots must be an array' }, { status: 400 });
        }

        if (dbType === 'firestore') {
            const { doc, setDoc, Timestamp } = await import('firebase/firestore');
            // Firestore can handle native Date objects, but we'll convert to Timestamps for consistency.
            const slotsToStore = slots.map(slot => Timestamp.fromDate(new Date(slot)));
            await setDoc(doc(db, COLLECTION_NAME, userId), { slots: slotsToStore }, { merge: true });
        } else if (dbType === 'tcb') {
            // TCB expects native Date objects
            const slotsToStore = slots.map(slot => new Date(slot));
            // Use update with upsert-like logic for TCB
            const collection = db.collection(COLLECTION_NAME);
            const countResult = await collection.doc(userId).count();
            if (countResult.total > 0) {
                await collection.doc(userId).update({ slots: slotsToStore });
            } else {
                await collection.add({ _id: userId, slots: slotsToStore });
            }
        }

        return NextResponse.json({ success: true, userId, slots });
    } catch (error: any) {
        console.error('[API /availabilities PUT] Error:', error);
        return NextResponse.json({ error: 'Failed to update availability', details: error.message }, { status: 500 });
    }
}
